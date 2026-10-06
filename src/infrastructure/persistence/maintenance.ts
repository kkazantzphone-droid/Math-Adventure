import { advanceEpoch, storageEpoch } from '../../application/core/integrity';
import type { Revision, StorageEpoch } from '../../application/core/integrity';
import {
  applicationFailure,
  applicationSuccess,
} from '../../application/core/result';
import type {
  ApplicationErrorCode,
  ApplicationResult,
} from '../../application/core/result';
import type { RecordCodec } from '../../application/ports/repository';
import { dataArray, dataRecord, hasKeys } from '../../domain/core/data';
import { canonicalize } from '../../domain/replay/canonical';
import {
  CHECKPOINT_KEY,
  CONTROL_KEY,
  STORE_NAMES,
  controlFromData,
  readyControl,
  storedRecordFromData,
  storedReceiptFromData,
  validateStoreInventory,
} from './layout';

// Invented developer rehearsal layouts. Neither is a historical learner schema.
export const SYNTHETIC_MIGRATION_ID = 'synthetic-layout-1-to-2';
export const SYNTHETIC_CHECKPOINT_RECORD_LIMIT = 10;
export const SYNTHETIC_CHECKPOINT_BYTE_LIMIT = 4 * 1024 * 1024;

export interface OpenSyntheticDatabaseOptions<T> {
  readonly dbName: string;
  readonly version: 1 | 2;
  readonly bootstrap: boolean;
  readonly codec: RecordCodec<T>;
  readonly factory?: IDBFactory;
  readonly initialEpoch?: number;
}

function nativeCode(error: unknown): ApplicationErrorCode {
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') return 'quota_exceeded';
    if (error.name === 'VersionError') return 'unsupported_schema';
  }
  return 'storage_unavailable';
}

function factoryOrUndefined(
  input: IDBFactory | undefined,
): IDBFactory | undefined {
  try {
    return input ?? (typeof indexedDB === 'undefined' ? undefined : indexedDB);
  } catch {
    // Some actual storage-denial contexts throw while retrieving the API.
    return undefined;
  }
}

function validSyntheticName(name: string): boolean {
  return /^math-adventure\.synthetic\.phase3\.[a-z0-9][a-z0-9._-]{0,95}$/.test(
    name,
  );
}

/** Explicit bootstrap is the only operation allowed to create an empty database.
 * A reopen after browser erasure aborts version zero, preserving stale fencing.
 * Opening a prepared/unverified layout supplies a recovery connection; its control
 * still blocks the ordinary repository writer until checked finalization.
 */
export function openSyntheticDatabase<T>(
  options: OpenSyntheticDatabaseOptions<T>,
): Promise<ApplicationResult<IDBDatabase>> {
  const epoch = storageEpoch(options.initialEpoch ?? 0);
  const factory = factoryOrUndefined(options.factory);
  if (!validSyntheticName(options.dbName) || !epoch.ok || !factory)
    return Promise.resolve(applicationFailure('storage_unavailable'));
  if (
    (options.version !== 1 && options.version !== 2) ||
    options.codec.schema !== 'synthetic-learner-v1'
  )
    return Promise.resolve(applicationFailure('unsupported_schema'));
  return new Promise((resolve) => {
    let failure: ApplicationErrorCode | undefined;
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(options.dbName, options.version);
    } catch (error) {
      resolve(applicationFailure(nativeCode(error)));
      return;
    }
    request.onupgradeneeded = (event) => {
      const transaction = request.transaction;
      if (!transaction) return;
      // Structural migrations require the coordinator and its checkpoint.
      if (event.oldVersion !== 0 || !options.bootstrap) {
        failure =
          event.oldVersion === 0 ? 'storage_unavailable' : 'unsupported_schema';
        transaction.abort();
        return;
      }
      try {
        const database = request.result;
        database.createObjectStore('metadata');
        database.createObjectStore('records', { keyPath: 'recordId' });
        database.createObjectStore('receipts', { keyPath: 'operationId' });
        database.createObjectStore('migrationStaging');
        transaction
          .objectStore('metadata')
          .add(readyControl(options.version, epoch.value), CONTROL_KEY);
      } catch (error) {
        failure = nativeCode(error);
        transaction.abort();
      }
    };
    request.onerror = () =>
      resolve(applicationFailure(failure ?? nativeCode(request.error)));
    request.onblocked = () => {
      // A normal opener cannot coordinate or force another client to close.
      // If it eventually reaches an upgrade, the nonzero branch above aborts it.
      failure = 'storage_unavailable';
      resolve(applicationFailure(failure));
    };
    request.onsuccess = () => {
      const database = request.result;
      if (failure) {
        database.close();
        resolve(applicationFailure(failure));
        return;
      }
      database.onversionchange = () => database.close();
      readControl(database)
        .then((checked) => {
          if (!checked.ok) {
            database.close();
            resolve(checked);
          } else resolve(applicationSuccess(database));
        })
        .catch(() => {
          database.close();
          resolve(applicationFailure('storage_unavailable'));
        });
    };
  });
}

function readControl(database: IDBDatabase) {
  return new Promise<ReturnType<typeof controlFromData>>((resolve) => {
    let outcome: ReturnType<typeof controlFromData> = applicationFailure(
      'storage_unavailable',
    );
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction([...STORE_NAMES], 'readonly');
      const inventory = validateStoreInventory(database, transaction);
      if (!inventory.ok) {
        transaction.abort();
        resolve(inventory);
        return;
      }
      const request = transaction.objectStore('metadata').get(CONTROL_KEY);
      request.onsuccess = () => {
        outcome = controlFromData(request.result, database.version);
        if (!outcome.ok) {
          transaction.abort();
          return;
        }
        const control = outcome.value;
        const metadataCount = transaction.objectStore('metadata').count();
        metadataCount.onsuccess = () => {
          if (metadataCount.result !== 1) {
            outcome = applicationFailure('invalid_record');
            transaction.abort();
            return;
          }
          const checkpointCount = transaction
            .objectStore('migrationStaging')
            .count();
          checkpointCount.onsuccess = () => {
            if (
              checkpointCount.result !==
              (control.recoveryPhase === 'ready' ? 0 : 1)
            ) {
              outcome = applicationFailure('invalid_record');
              transaction.abort();
            }
          };
        };
      };
    } catch (error) {
      resolve(applicationFailure(nativeCode(error)));
      return;
    }
    transaction.oncomplete = () => resolve(outcome);
    transaction.onabort = () =>
      resolve(
        outcome.ok
          ? applicationFailure(nativeCode(transaction.error))
          : outcome,
      );
    transaction.onerror = () => {
      /* abort reports the final stable result */
    };
  });
}

interface CheckpointRow<T> {
  readonly recordId: string;
  readonly revision: Revision;
  readonly recordSchema: string;
  readonly payload: T;
}

interface Checkpoint<T> {
  readonly marker: 'synthetic-only';
  readonly planId: typeof SYNTHETIC_MIGRATION_ID;
  readonly sourceVersion: 1;
  readonly targetVersion: 2;
  readonly learnerRows: readonly CheckpointRow<T>[];
}

function checkpointFromData<T>(
  input: unknown,
  codec: RecordCodec<T>,
): ApplicationResult<Checkpoint<T>> {
  const data = dataRecord(input, 5);
  if (
    !data ||
    !hasKeys(data, [
      'marker',
      'planId',
      'sourceVersion',
      'targetVersion',
      'learnerRows',
    ]) ||
    data.marker !== 'synthetic-only' ||
    data.planId !== SYNTHETIC_MIGRATION_ID ||
    data.sourceVersion !== 1 ||
    data.targetVersion !== 2
  )
    return applicationFailure('unsupported_schema');
  const rows = dataArray(data.learnerRows, SYNTHETIC_CHECKPOINT_RECORD_LIMIT);
  if (!rows) return applicationFailure('invalid_record');
  const checked: CheckpointRow<T>[] = [];
  const identifiers = new Set<string>();
  let bytes = 0;
  for (const raw of rows) {
    const row = dataRecord(raw, 4);
    if (
      !row ||
      !hasKeys(row, ['recordId', 'revision', 'recordSchema', 'payload']) ||
      row.recordSchema !== codec.schema
    )
      return applicationFailure('invalid_record');
    // Reuse the full stored-row boundary for key, codec and canonical limits.
    const record = storedRecordFromData(row, row.recordId, codec, 2);
    if (!record.ok || identifiers.has(record.value.recordId))
      return applicationFailure('invalid_record');
    const serialized = canonicalize(row);
    if (!serialized.ok) return applicationFailure('invalid_record');
    bytes += new TextEncoder().encode(serialized.value).byteLength;
    if (bytes > SYNTHETIC_CHECKPOINT_BYTE_LIMIT)
      return applicationFailure('storage_unavailable');
    identifiers.add(record.value.recordId);
    checked.push({
      recordId: record.value.recordId,
      revision: record.value.revision,
      recordSchema: codec.schema,
      payload: record.value.payload,
    });
  }
  return applicationSuccess({
    marker: 'synthetic-only',
    planId: SYNTHETIC_MIGRATION_ID,
    sourceVersion: 1,
    targetVersion: 2,
    learnerRows: checked,
  });
}

function equalPayload(left: unknown, right: unknown): boolean {
  const a = canonicalize(left);
  const b = canonicalize(right);
  return a.ok && b.ok && a.value === b.value;
}

function abort(transaction: IDBTransaction): void {
  try {
    transaction.abort();
  } catch {
    /* native completion/abort may already have won */
  }
}

/** Read cursors incrementally; only the explicitly bounded learner checkpoint is
 * held in memory. Receipts are validated but never copied into recovery material.
 */
function validateRows<T>(
  transaction: IDBTransaction,
  version: number,
  epoch: StorageEpoch,
  codec: RecordCodec<T>,
  fail: (code: ApplicationErrorCode) => void,
  done: (rows: readonly CheckpointRow<T>[]) => void,
  checkpoint?: Checkpoint<T>,
): void {
  const rows: CheckpointRow<T>[] = [];
  let bytes = 0;
  const metadataCount = transaction.objectStore('metadata').count();
  metadataCount.onsuccess = () => {
    if (metadataCount.result !== 1) fail('invalid_record');
  };
  const records = transaction.objectStore('records').openCursor();
  records.onsuccess = () => {
    const cursor = records.result;
    if (!cursor) {
      if (checkpoint && rows.length !== checkpoint.learnerRows.length) {
        fail('invalid_record');
        return;
      }
      const receipts = transaction.objectStore('receipts').openCursor();
      receipts.onsuccess = () => {
        const receiptCursor = receipts.result;
        if (!receiptCursor) {
          done(rows);
          return;
        }
        const checked = storedReceiptFromData(
          receiptCursor.value,
          receiptCursor.key,
          epoch,
          codec,
        );
        if (!checked.ok) {
          fail(checked.error.code);
          return;
        }
        receiptCursor.continue();
      };
      return;
    }
    const checked = storedRecordFromData(
      cursor.value,
      cursor.key,
      codec,
      version,
    );
    if (!checked.ok) {
      fail(checked.error.code);
      return;
    }
    if (rows.length >= SYNTHETIC_CHECKPOINT_RECORD_LIMIT) {
      fail('storage_unavailable');
      return;
    }
    const row = {
      recordId: checked.value.recordId,
      revision: checked.value.revision,
      recordSchema: codec.schema,
      payload: checked.value.payload,
    };
    const canonical = canonicalize(row);
    if (!canonical.ok) {
      fail('invalid_record');
      return;
    }
    bytes += new TextEncoder().encode(canonical.value).byteLength;
    if (bytes > SYNTHETIC_CHECKPOINT_BYTE_LIMIT) {
      fail('storage_unavailable');
      return;
    }
    if (checkpoint) {
      const expected = checkpoint.learnerRows.find(
        (entry) => entry.recordId === row.recordId,
      );
      if (
        !expected ||
        expected.revision !== row.revision ||
        !equalPayload(expected.payload, row.payload)
      ) {
        fail('invalid_record');
        return;
      }
    }
    rows.push(row);
    cursor.continue();
  };
}

function prepareCheckpoint<T>(
  database: IDBDatabase,
  codec: RecordCodec<T>,
  injectAbort: boolean,
  trackTransaction: (transaction: IDBTransaction | undefined) => void,
): Promise<ApplicationResult<void>> {
  return new Promise((resolve) => {
    let failure: ApplicationErrorCode | undefined;
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction([...STORE_NAMES], 'readwrite');
    } catch (error) {
      resolve(applicationFailure(nativeCode(error)));
      return;
    }
    trackTransaction(transaction);
    const fail = (code: ApplicationErrorCode) => {
      failure = code;
      abort(transaction);
    };
    const inventory = validateStoreInventory(database, transaction);
    if (!inventory.ok) {
      fail(inventory.error.code);
    } else {
      const metadata = transaction.objectStore('metadata');
      const request = metadata.get(CONTROL_KEY);
      request.onsuccess = () => {
        const control = controlFromData(request.result, database.version);
        if (!control.ok) {
          fail(control.error.code);
          return;
        }
        if (database.version !== 1 || control.value.recoveryPhase !== 'ready') {
          fail('unsupported_schema');
          return;
        }
        const staging = transaction.objectStore('migrationStaging');
        const existing = staging.count();
        existing.onsuccess = () => {
          if (existing.result !== 0) {
            fail('invalid_record');
            return;
          }
          validateRows(
            transaction,
            1,
            control.value.storageEpoch,
            codec,
            fail,
            (rows) => {
              const checkpoint: Checkpoint<T> = {
                marker: 'synthetic-only',
                planId: SYNTHETIC_MIGRATION_ID,
                sourceVersion: 1,
                targetVersion: 2,
                learnerRows: rows,
              };
              staging.add(checkpoint, CHECKPOINT_KEY);
              metadata.put(
                {
                  ...control.value,
                  recoveryPhase: 'prepared',
                  planId: SYNTHETIC_MIGRATION_ID,
                },
                CONTROL_KEY,
              );
              if (injectAbort) fail('quota_exceeded');
            },
          );
        };
      };
    }
    transaction.oncomplete = () => {
      trackTransaction(undefined);
      resolve(applicationSuccess(undefined));
    };
    transaction.onabort = () => {
      trackTransaction(undefined);
      resolve(applicationFailure(failure ?? nativeCode(transaction.error)));
    };
    transaction.onerror = () => {
      /* final abort is authoritative */
    };
  });
}

export interface MigrationOptions<T> {
  readonly database: IDBDatabase;
  readonly codec: RecordCodec<T>;
  readonly factory?: IDBFactory;
  readonly quiesce: () => Promise<boolean>;
  /** Explicitly resume a validated source checkpoint after interrupted prepare. */
  readonly resumePrepared?: boolean;
  readonly onBlocked?: () => void;
  readonly fault?:
    | 'checkpoint_abort'
    | 'upgrade_abort'
    | 'interrupt_prepared'
    | 'interrupt_unverified';
}

/** Cancellation revokes the native open request even if a blocker closes later.
 * A native open request is not abortable while blocked, so both late upgrade and
 * success callbacks check the irrevocable coordinator cancellation flag.
 */
export function migrateSyntheticDatabase<T>(options: MigrationOptions<T>): {
  readonly result: Promise<ApplicationResult<IDBDatabase>>;
  readonly cancel: () => void;
} {
  let cancelled = false;
  let checkpointTransaction: IDBTransaction | undefined;
  let upgradeTransaction: IDBTransaction | undefined;
  let finalizationTransaction: IDBTransaction | undefined;
  let cancelResolve: (() => void) | undefined;
  const result = new Promise<ApplicationResult<IDBDatabase>>((resolve) => {
    cancelResolve = () => resolve(applicationFailure('storage_unavailable'));
    void (async () => {
      const source = options.database;
      const factory = factoryOrUndefined(options.factory);
      if (
        !factory ||
        !validSyntheticName(source.name) ||
        source.version !== 1 ||
        options.codec.schema !== 'synthetic-learner-v1'
      ) {
        resolve(applicationFailure('unsupported_schema'));
        return;
      }
      let quiesced = false;
      try {
        quiesced = await options.quiesce();
      } catch {
        /* client acknowledgement failed */
      }
      if (!quiesced || cancelled) {
        resolve(applicationFailure('storage_unavailable'));
        return;
      }
      const prepared = options.resumePrepared
        ? await recoveryTransition(source, options.codec, 'prepared', false)
        : await prepareCheckpoint(
            source,
            options.codec,
            options.fault === 'checkpoint_abort',
            (transaction) => {
              checkpointTransaction = transaction;
            },
          );
      if (!prepared.ok) {
        resolve(prepared);
        return;
      }
      if (cancelled || options.fault === 'interrupt_prepared') {
        resolve(applicationFailure('storage_unavailable'));
        return;
      }
      const dbName = source.name;
      source.close();
      let request: IDBOpenDBRequest;
      try {
        request = factory.open(dbName, 2);
      } catch (error) {
        resolve(applicationFailure(nativeCode(error)));
        return;
      }
      let failure: ApplicationErrorCode | undefined;
      request.onblocked = () => options.onBlocked?.();
      request.onupgradeneeded = (event) => {
        upgradeTransaction = request.transaction ?? undefined;
        const transaction = upgradeTransaction;
        if (!transaction) return;
        const fail = (code: ApplicationErrorCode) => {
          failure = code;
          abort(transaction);
        };
        if (cancelled || event.oldVersion !== 1) {
          fail('storage_unavailable');
          return;
        }
        const database = request.result;
        const inventory = validateStoreInventory(database, transaction);
        if (!inventory.ok) {
          fail(inventory.error.code);
          return;
        }
        const metadata = transaction.objectStore('metadata');
        const controlRequest = metadata.get(CONTROL_KEY);
        controlRequest.onsuccess = () => {
          const control = controlFromData(controlRequest.result, 1);
          if (
            !control.ok ||
            control.value.recoveryPhase !== 'prepared' ||
            control.value.planId !== SYNTHETIC_MIGRATION_ID
          ) {
            fail(control.ok ? 'unsupported_schema' : control.error.code);
            return;
          }
          const staging = transaction.objectStore('migrationStaging');
          const checkpointCount = staging.count();
          checkpointCount.onsuccess = () => {
            if (checkpointCount.result !== 1) fail('invalid_record');
          };
          const checkpointRequest = staging.get(CHECKPOINT_KEY);
          checkpointRequest.onsuccess = () => {
            const checkpoint = checkpointFromData(
              checkpointRequest.result,
              options.codec,
            );
            if (!checkpoint.ok) {
              fail(checkpoint.error.code);
              return;
            }
            validateRows(
              transaction,
              1,
              control.value.storageEpoch,
              options.codec,
              fail,
              () => {
                const records = transaction.objectStore('records').openCursor();
                let transformed = false;
                records.onsuccess = () => {
                  const cursor = records.result;
                  if (!cursor) {
                    const targetControl = {
                      ...readyControl(2, control.value.storageEpoch),
                      recoveryPhase: 'upgradedPendingValidation',
                      planId: SYNTHETIC_MIGRATION_ID,
                    };
                    metadata.put(targetControl, CONTROL_KEY);
                    return;
                  }
                  const row = storedRecordFromData(
                    cursor.value,
                    cursor.key,
                    options.codec,
                    1,
                  );
                  if (!row.ok) {
                    fail(row.error.code);
                    return;
                  }
                  cursor.update({
                    ...row.value,
                    recordSchema: options.codec.schema,
                  });
                  if (!transformed && options.fault === 'upgrade_abort') {
                    fail('storage_unavailable');
                    return;
                  }
                  transformed = true;
                  if (cancelled) {
                    fail('storage_unavailable');
                    return;
                  }
                  cursor.continue();
                };
              },
              checkpoint.value,
            );
          };
        };
      };
      request.onerror = () =>
        resolve(applicationFailure(failure ?? nativeCode(request.error)));
      request.onsuccess = () => {
        const target = request.result;
        target.onversionchange = () => target.close();
        if (cancelled) {
          target.close();
          resolve(applicationFailure('storage_unavailable'));
          return;
        }
        if (options.fault === 'interrupt_unverified') {
          target.close();
          resolve(applicationFailure('storage_unavailable'));
          return;
        }
        recoveryTransition(
          target,
          options.codec,
          'upgradedPendingValidation',
          true,
          (transaction) => {
            finalizationTransaction = transaction;
            if (cancelled && transaction) abort(transaction);
          },
        )
          .then((finalized) => {
            if (cancelled) {
              target.close();
              resolve(applicationFailure('storage_unavailable'));
            } else if (!finalized.ok) {
              target.close();
              resolve(finalized);
            } else resolve(applicationSuccess(target));
          })
          .catch(() => {
            target.close();
            resolve(applicationFailure('storage_unavailable'));
          });
      };
    })().catch(() => resolve(applicationFailure('storage_unavailable')));
  });
  return {
    result,
    cancel: () => {
      cancelled = true;
      if (checkpointTransaction) abort(checkpointTransaction);
      if (upgradeTransaction) abort(upgradeTransaction);
      if (finalizationTransaction) abort(finalizationTransaction);
      cancelResolve?.();
    },
  };
}

/** Check live rows independently against the checkpoint after native commit.
 * No checkpoint epoch, receipt or revision can replace destination control.
 * Validation and cleanup share the checked transaction, preventing a competing
 * maintenance write between validation and the ready transition.
 */
export function finalizeSyntheticRecovery<T>(
  database: IDBDatabase,
  codec: RecordCodec<T>,
): Promise<ApplicationResult<void>> {
  return recoveryTransition(database, codec, 'upgradedPendingValidation');
}

/** Only an unchanged, validated source can leave prepared recovery. This does
 * not restore rows: it removes the temporary checkpoint and enables the source.
 */
export function cancelPreparedMigration<T>(
  database: IDBDatabase,
  codec: RecordCodec<T>,
): Promise<ApplicationResult<void>> {
  return recoveryTransition(database, codec, 'prepared');
}

function recoveryTransition<T>(
  database: IDBDatabase,
  codec: RecordCodec<T>,
  phase: 'prepared' | 'upgradedPendingValidation',
  complete = true,
  trackTransaction: (
    transaction: IDBTransaction | undefined,
  ) => void = () => {},
): Promise<ApplicationResult<void>> {
  if (
    !validSyntheticName(database.name) ||
    codec.schema !== 'synthetic-learner-v1'
  )
    return Promise.resolve(applicationFailure('unsupported_schema'));
  return new Promise((resolve) => {
    let transaction: IDBTransaction;
    let failure: ApplicationErrorCode | undefined;
    try {
      transaction = database.transaction(
        [...STORE_NAMES],
        complete ? 'readwrite' : 'readonly',
      );
    } catch (error) {
      resolve(applicationFailure(nativeCode(error)));
      return;
    }
    trackTransaction(transaction);
    const fail = (code: ApplicationErrorCode) => {
      failure = code;
      abort(transaction);
    };
    const inventory = validateStoreInventory(database, transaction);
    if (!inventory.ok) fail(inventory.error.code);
    else {
      const metadata = transaction.objectStore('metadata');
      const request = metadata.get(CONTROL_KEY);
      request.onsuccess = () => {
        const control = controlFromData(request.result, database.version);
        if (!control.ok) {
          fail(control.error.code);
          return;
        }
        if (
          control.value.recoveryPhase !== phase ||
          control.value.planId !== SYNTHETIC_MIGRATION_ID ||
          database.version !== (phase === 'prepared' ? 1 : 2)
        ) {
          fail('unsupported_schema');
          return;
        }
        const staging = transaction.objectStore('migrationStaging');
        const checkpointRequest = staging.get(CHECKPOINT_KEY);
        checkpointRequest.onsuccess = () => {
          const checkpoint = checkpointFromData(
            checkpointRequest.result,
            codec,
          );
          if (!checkpoint.ok) {
            fail(checkpoint.error.code);
            return;
          }
          const count = staging.count();
          count.onsuccess = () => {
            if (count.result !== 1) {
              fail('invalid_record');
              return;
            }
            validateRows(
              transaction,
              database.version,
              control.value.storageEpoch,
              codec,
              fail,
              () => {
                if (!complete) return;
                metadata.put(
                  readyControl(
                    control.value.schemaVersion,
                    control.value.storageEpoch,
                  ),
                  CONTROL_KEY,
                );
                staging.delete(CHECKPOINT_KEY);
              },
              checkpoint.value,
            );
          };
        };
      };
    }
    transaction.oncomplete = () => {
      trackTransaction(undefined);
      resolve(applicationSuccess(undefined));
    };
    transaction.onabort = () => {
      trackTransaction(undefined);
      resolve(applicationFailure(failure ?? nativeCode(transaction.error)));
    };
    transaction.onerror = () => {
      /* final abort reports the stable result */
    };
  });
}

export interface FullClearOptions {
  readonly quiesce: () => Promise<boolean>;
  readonly wipeMemory: () => void | Promise<void>;
  readonly cleanupCaches?: () => Promise<boolean>;
}

export interface FullClearResult {
  readonly database: ApplicationResult<StorageEpoch>;
  readonly memoryCleared: boolean;
  readonly caches: 'complete' | 'pending' | 'not_requested';
}

/** Cache cleanup is explicitly separate from the atomic epoch/deletion commit.
 * The injected lifecycle owns exact cache names; this module never enumerates
 * or deletes unrelated databases or same-origin caches.
 */
export async function fullClearSyntheticDatabase<T>(
  database: IDBDatabase,
  codec: RecordCodec<T>,
  options: FullClearOptions,
): Promise<FullClearResult> {
  let quiesced = false;
  try {
    quiesced = await options.quiesce();
  } catch {
    /* no cleanup without every known client */
  }
  if (!quiesced)
    return {
      database: applicationFailure('storage_unavailable'),
      memoryCleared: false,
      caches: options.cleanupCaches ? 'pending' : 'not_requested',
    };
  const cleared = await clearTransaction(database, codec);
  if (!cleared.ok)
    return {
      database: cleared,
      memoryCleared: false,
      caches: options.cleanupCaches ? 'pending' : 'not_requested',
    };
  let memoryCleared = false;
  try {
    await options.wipeMemory();
    memoryCleared = true;
  } catch {
    /* deletion has already committed */
  }
  let caches: FullClearResult['caches'] = options.cleanupCaches
    ? 'pending'
    : 'not_requested';
  if (options.cleanupCaches) {
    try {
      if (await options.cleanupCaches()) caches = 'complete';
    } catch {
      /* exact-owned cleanup may be retried independently */
    }
  }
  return { database: cleared, memoryCleared, caches };
}

function clearTransaction<T>(
  database: IDBDatabase,
  codec: RecordCodec<T>,
): Promise<ApplicationResult<StorageEpoch>> {
  // Keeping the codec explicit prevents a caller from treating an unknown data
  // layout as an empty first run. Learner rows are erased, never reconstructed.
  if (
    !validSyntheticName(database.name) ||
    codec.schema !== 'synthetic-learner-v1'
  )
    return Promise.resolve(applicationFailure('unsupported_schema'));
  return new Promise((resolve) => {
    let transaction: IDBTransaction;
    let outcome: ApplicationResult<StorageEpoch> = applicationFailure(
      'storage_unavailable',
    );
    try {
      transaction = database.transaction([...STORE_NAMES], 'readwrite');
    } catch (error) {
      resolve(applicationFailure(nativeCode(error)));
      return;
    }
    const fail = (code: ApplicationErrorCode) => {
      outcome = applicationFailure(code);
      abort(transaction);
    };
    const inventory = validateStoreInventory(database, transaction);
    if (!inventory.ok) fail(inventory.error.code);
    else {
      const metadata = transaction.objectStore('metadata');
      const request = metadata.get(CONTROL_KEY);
      request.onsuccess = () => {
        const control = controlFromData(request.result, database.version);
        if (!control.ok) {
          fail(control.error.code);
          return;
        }
        if (control.value.recoveryPhase !== 'ready') {
          fail('storage_unavailable');
          return;
        }
        const advanced = advanceEpoch(control.value.storageEpoch);
        if (!advanced.ok) {
          fail(advanced.error.code);
          return;
        }
        transaction.objectStore('records').clear();
        transaction.objectStore('receipts').clear();
        transaction.objectStore('migrationStaging').clear();
        metadata.clear();
        metadata.put(
          readyControl(control.value.schemaVersion, advanced.value),
          CONTROL_KEY,
        );
        outcome = advanced;
      };
    }
    transaction.oncomplete = () => resolve(outcome);
    transaction.onabort = () =>
      resolve(
        outcome.ok
          ? applicationFailure(nativeCode(transaction.error))
          : outcome,
      );
    transaction.onerror = () => {
      /* completion is the deletion boundary */
    };
  });
}
