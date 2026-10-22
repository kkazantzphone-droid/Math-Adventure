import { storageEpoch } from '../../application/core/integrity';
import type { StorageEpoch } from '../../application/core/integrity';
import {
  applicationFailure,
  applicationSuccess,
} from '../../application/core/result';
import type {
  ApplicationErrorCode,
  ApplicationResult,
} from '../../application/core/result';
import { RECEIPT_VERSION } from '../../application/ports/repository';
import type {
  OperationReceipt,
  RepositoryCommand,
} from '../../application/ports/repository';
import {
  commandFingerprint,
  commandFromData,
  receiptFromData,
} from '../../application/repository/validation';
import {
  syntheticLoopCodec,
  syntheticLoopRecordId,
} from '../../application/synthetic-loop';
import type { SyntheticLoopRecord } from '../../application/synthetic-loop';
import { SYNTHETIC_PROFILE_IDS } from '../../domain/adaptation/types';
import type { SyntheticProfileId } from '../../domain/adaptation/types';
import { canonicalize } from '../../domain/replay/canonical';
import { nativeStorageCode } from './adapter';
import type { WriteFault } from './adapter';
import {
  CONTROL_KEY,
  STORE_NAMES,
  controlFromData,
  storedReceiptFromData,
  storedRecordData,
  storedRecordFromData,
  validateStoreInventory,
} from './layout';
import { SYNTHETIC_LOOP_DATABASE } from './synthetic-loop-database';

/** Parent backup/restore for the fixed loopback synthetic database only.
 * These operations sit beside the three-method port, like bootstrap/full clear.
 */
export type SyntheticDestination =
  | { readonly kind: 'absent' }
  | { readonly kind: 'empty'; readonly epoch: StorageEpoch }
  | {
      readonly kind: 'occupied';
      readonly epoch: StorageEpoch;
      readonly profiles: readonly SyntheticProfileId[];
    };
export type RestoreReadback = 'restored' | 'absent' | 'different';

type Fail = (code: ApplicationErrorCode) => void;

function run<R>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  queue: (
    transaction: IDBTransaction,
    complete: (value: R) => void,
    fail: Fail,
  ) => void,
): Promise<ApplicationResult<R>> {
  return new Promise((resolve) => {
    let outcome: ApplicationResult<R> | undefined;
    let failure: ApplicationErrorCode | undefined;
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction([...STORE_NAMES], mode);
    } catch (error) {
      resolve(applicationFailure(nativeStorageCode(error)));
      return;
    }
    const fail: Fail = (code) => {
      failure ??= code;
      try {
        transaction.abort();
      } catch {
        resolve(applicationFailure(failure));
      }
    };
    // Success only on native completion, never on a request callback.
    transaction.oncomplete = () =>
      resolve(outcome ?? applicationFailure('storage_unavailable'));
    transaction.onabort = () =>
      resolve(
        applicationFailure(failure ?? nativeStorageCode(transaction.error)),
      );
    transaction.onerror = () => {
      if (transaction.error?.name === 'QuotaExceededError')
        failure ??= 'quota_exceeded';
    };
    const guard =
      <A extends unknown[]>(step: (...args: A) => void) =>
      (...args: A) => {
        try {
          step(...args);
        } catch (error) {
          fail(nativeStorageCode(error));
        }
      };
    guard(() => {
      const inventory = validateStoreInventory(database, transaction);
      if (!inventory.ok) {
        fail(inventory.error.code);
        return;
      }
      queue(
        transaction,
        (value) => {
          outcome = applicationSuccess(value);
        },
        fail,
      );
    })();
  });
}

/** Ready control, exactly one metadata row and no recovery checkpoint. */
function readyControl(
  database: IDBDatabase,
  transaction: IDBTransaction,
  fail: Fail,
  next: (epoch: StorageEpoch) => void,
): void {
  const control = transaction.objectStore('metadata').get(CONTROL_KEY);
  const metadata = transaction.objectStore('metadata').count();
  const staging = transaction.objectStore('migrationStaging').count();
  staging.onsuccess = () => {
    try {
      const checked = controlFromData(control.result, database.version);
      if (!checked.ok) fail(checked.error.code);
      else if (checked.value.recoveryPhase !== 'ready' || staging.result !== 0)
        fail('storage_unavailable');
      else if (metadata.result !== 1) fail('invalid_record');
      else next(checked.value.storageEpoch);
    } catch (error) {
      fail(nativeStorageCode(error));
    }
  };
}

function ownedSlot(recordId: unknown, payload?: SyntheticLoopRecord) {
  return SYNTHETIC_PROFILE_IDS.find((profile) => {
    const id = syntheticLoopRecordId(profile);
    return (
      id.ok &&
      id.value === recordId &&
      (payload === undefined || payload.profileId === profile)
    );
  });
}

/** Consistent read-only snapshot of every saved badge; no repair or write. */
export function readSyntheticLoopWorld(database: IDBDatabase): Promise<
  ApplicationResult<{
    readonly epoch: StorageEpoch;
    readonly records: readonly SyntheticLoopRecord[];
  }>
> {
  if (database.name !== SYNTHETIC_LOOP_DATABASE || database.version !== 2)
    return Promise.resolve(applicationFailure('unsupported_schema'));
  return run(database, 'readonly', (transaction, complete, fail) => {
    readyControl(database, transaction, fail, (epoch) => {
      const records: SyntheticLoopRecord[] = [];
      const cursor = transaction.objectStore('records').openCursor();
      cursor.onsuccess = () => {
        try {
          const row = cursor.result;
          if (!row) {
            complete({ epoch, records });
            return;
          }
          const stored = storedRecordFromData(
            row.value as unknown,
            row.primaryKey,
            syntheticLoopCodec,
            2,
          );
          if (!stored.ok) {
            fail(stored.error.code);
            return;
          }
          if (
            !ownedSlot(stored.value.recordId, stored.value.payload) ||
            records.length === SYNTHETIC_PROFILE_IDS.length
          ) {
            fail('invalid_record');
            return;
          }
          records.push(stored.value.payload);
          row.continue();
        } catch (error) {
          fail(nativeStorageCode(error));
        }
      };
    });
  });
}

/** Non-writing destination probe. An absent database's version-zero upgrade is
 * aborted, so checking a fresh browser never creates the owned database.
 */
export function probeSyntheticLoopDestination(
  factory?: IDBFactory,
): Promise<ApplicationResult<SyntheticDestination>> {
  let selected: IDBFactory | undefined;
  try {
    selected = factory ?? globalThis.indexedDB;
  } catch {
    /* denied */
  }
  if (!selected)
    return Promise.resolve(applicationFailure('storage_unavailable'));
  const indexedDb = selected;
  return new Promise((resolve) => {
    let absent = false;
    let failure: ApplicationErrorCode | undefined;
    let request: IDBOpenDBRequest;
    try {
      request = indexedDb.open(SYNTHETIC_LOOP_DATABASE, 2);
    } catch (error) {
      resolve(applicationFailure(nativeStorageCode(error)));
      return;
    }
    request.onupgradeneeded = (event) => {
      absent = event.oldVersion === 0;
      if (!absent) failure = 'unsupported_schema';
      request.transaction?.abort();
    };
    request.onblocked = () => {
      failure ??= 'storage_unavailable';
    };
    request.onerror = () =>
      resolve(
        absent && !failure
          ? applicationSuccess({ kind: 'absent' })
          : applicationFailure(failure ?? nativeStorageCode(request.error)),
      );
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      void readSyntheticLoopWorld(database).then((world) => {
        database.close();
        if (!world.ok) {
          resolve(world);
          return;
        }
        const profiles = world.value.records.map((record) => record.profileId);
        resolve(
          applicationSuccess(
            profiles.length === 0
              ? { kind: 'empty', epoch: world.value.epoch }
              : { kind: 'occupied', epoch: world.value.epoch, profiles },
          ),
        );
      });
    };
  });
}

type CreateCommand = Extract<
  RepositoryCommand<SyntheticLoopRecord>,
  { readonly kind: 'create' }
>;
interface PreparedRestore {
  readonly command: CreateCommand;
  readonly fingerprint: string;
  readonly receipt: OperationReceipt;
}

function prepare(
  input: readonly RepositoryCommand<SyntheticLoopRecord>[],
): ApplicationResult<readonly PreparedRestore[]> {
  if (input.length < 1 || input.length > SYNTHETIC_PROFILE_IDS.length)
    return applicationFailure('invalid_command');
  const prepared: PreparedRestore[] = [];
  for (const raw of input) {
    const command = commandFromData(raw, syntheticLoopCodec);
    const fingerprint = commandFingerprint(raw, syntheticLoopCodec);
    if (!command.ok || !fingerprint.ok)
      return applicationFailure('invalid_command');
    const value = command.value;
    if (
      value.kind !== 'create' ||
      !ownedSlot(value.recordId, value.payload) ||
      value.storageEpoch !== input[0]?.storageEpoch ||
      prepared.some(
        (item) =>
          item.command.recordId === value.recordId ||
          item.command.operationId === value.operationId,
      )
    )
      return applicationFailure('invalid_command');
    const receipt = receiptFromData({
      version: RECEIPT_VERSION,
      kind: 'create',
      operationId: value.operationId,
      recordId: value.recordId,
      revision: 1,
      storageEpoch: value.storageEpoch,
    });
    if (!receipt.ok) return receipt;
    prepared.push({
      command: value,
      fingerprint: fingerprint.value,
      receipt: receipt.value,
    });
  }
  return applicationSuccess(prepared);
}

/** One native transaction: validation → planned destination epoch → exact
 * retry receipts → empty destination → capacity → every record and receipt.
 * Abort, quota or a native request error leaves every store unchanged.
 */
export function restoreSyntheticLoopWorld(
  database: IDBDatabase,
  commands: readonly RepositoryCommand<SyntheticLoopRecord>[],
  options: {
    readonly receiptCapacity: number;
    /** Synthetic fault evidence only; invoked after every write succeeds. */
    readonly fault?: () => WriteFault;
  },
): Promise<ApplicationResult<readonly OperationReceipt[]>> {
  if (database.name !== SYNTHETIC_LOOP_DATABASE || database.version !== 2)
    return Promise.resolve(applicationFailure('unsupported_schema'));
  let plan: readonly PreparedRestore[];
  try {
    const prepared = prepare(commands);
    if (!prepared.ok) return Promise.resolve(prepared);
    plan = prepared.value;
  } catch {
    return Promise.resolve(applicationFailure('invalid_command'));
  }
  const epoch = plan[0]?.command.storageEpoch;
  return run<readonly OperationReceipt[]>(
    database,
    'readwrite',
    (transaction, complete, fail) => {
      readyControl(database, transaction, fail, (current) => {
        if (current !== epoch) {
          fail('epoch_conflict');
          return;
        }
        const receipts = transaction.objectStore('receipts');
        const records = transaction.objectStore('records');
        const prior = plan.map((item) =>
          receipts.get(item.command.operationId),
        );
        const recordCount = records.count();
        const receiptCount = receipts.count();
        receiptCount.onsuccess = () => {
          try {
            const found = prior.filter(
              (request) => request.result !== undefined,
            );
            if (found.length > 0) {
              const exact =
                found.length === plan.length &&
                plan.every((item, index) => {
                  const stored = storedReceiptFromData(
                    prior[index]?.result as unknown,
                    item.command.operationId,
                    current,
                    syntheticLoopCodec,
                  );
                  return (
                    stored.ok && stored.value.fingerprint === item.fingerprint
                  );
                });
              if (exact) complete(plan.map((item) => item.receipt));
              else fail('operation_conflict');
              return;
            }
            if (recordCount.result !== 0) {
              fail('record_already_exists');
              return;
            }
            if (receiptCount.result + plan.length > options.receiptCapacity) {
              fail('storage_unavailable');
              return;
            }
            complete(plan.map((item) => item.receipt));
            let last: IDBRequest | undefined;
            for (const item of plan) {
              records.put(
                storedRecordData(
                  {
                    recordId: item.command.recordId,
                    revision: item.receipt.revision,
                    recordSchema: syntheticLoopCodec.schema,
                    payload: item.command.payload,
                  },
                  2,
                ),
              );
              last = receipts.add({
                operationId: item.command.operationId,
                recordId: item.command.recordId,
                storageEpoch: current,
                fingerprint: item.fingerprint,
                receipt: item.receipt,
              });
            }
            if (last)
              last.onsuccess = () => {
                try {
                  const fault = options.fault?.();
                  if (fault === 'abort') fail('storage_unavailable');
                  else if (fault === 'quota') fail('quota_exceeded');
                  else if (fault === 'write')
                    transaction.objectStore('metadata').add({}, CONTROL_KEY);
                } catch (error) {
                  fail(nativeStorageCode(error));
                }
              };
          } catch (error) {
            fail(nativeStorageCode(error));
          }
        };
      });
    },
  );
}

/** Separate read-only readback after commit or an ambiguous outcome. Only an
 * exact plan match is reported as restored; nothing here repairs or writes.
 */
export function verifySyntheticLoopRestore(
  database: IDBDatabase,
  commands: readonly RepositoryCommand<SyntheticLoopRecord>[],
): Promise<ApplicationResult<RestoreReadback>> {
  if (database.name !== SYNTHETIC_LOOP_DATABASE || database.version !== 2)
    return Promise.resolve(applicationFailure('unsupported_schema'));
  const prepared = prepare(commands);
  if (!prepared.ok) return Promise.resolve(prepared);
  const plan = prepared.value;
  return run<RestoreReadback>(
    database,
    'readonly',
    (transaction, complete, fail) => {
      readyControl(database, transaction, fail, (current) => {
        const rows = plan.map((item) =>
          transaction.objectStore('records').get(item.command.recordId),
        );
        const saved = plan.map((item) =>
          transaction.objectStore('receipts').get(item.command.operationId),
        );
        const total = transaction.objectStore('records').count();
        total.onsuccess = () => {
          try {
            if (
              total.result === 0 &&
              saved.every((request) => request.result === undefined)
            ) {
              complete('absent');
              return;
            }
            const exact =
              current === plan[0]?.command.storageEpoch &&
              plan.every((item, index) => {
                const row = storedRecordFromData(
                  rows[index]?.result as unknown,
                  item.command.recordId,
                  syntheticLoopCodec,
                  2,
                );
                const receipt = storedReceiptFromData(
                  saved[index]?.result as unknown,
                  item.command.operationId,
                  current,
                  syntheticLoopCodec,
                );
                const stored = row.ok ? canonicalize(row.value.payload) : null;
                const planned = canonicalize(item.command.payload);
                return (
                  row.ok &&
                  row.value.revision === 1 &&
                  stored?.ok === true &&
                  planned.ok &&
                  stored.value === planned.value &&
                  receipt.ok &&
                  receipt.value.fingerprint === item.fingerprint
                );
              });
            complete(exact ? 'restored' : 'different');
          } catch (error) {
            fail(nativeStorageCode(error));
          }
        };
      });
    },
  );
}

export function destinationEpoch(
  destination: SyntheticDestination,
): ApplicationResult<StorageEpoch> {
  return destination.kind === 'absent'
    ? storageEpoch(0)
    : applicationSuccess(destination.epoch);
}
