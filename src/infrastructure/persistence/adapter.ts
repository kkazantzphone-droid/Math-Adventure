import {
  advanceEpoch,
  advanceRevision,
  recordId,
  revision,
} from '../../application/core/integrity';
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
  AtomicRecordRepository,
  OperationReceipt,
  RecordCodec,
  RecordSnapshot,
  RepositoryCommand,
} from '../../application/ports/repository';
import {
  commandFingerprint,
  commandFromData,
  receiptFromData,
  snapshotFromData,
} from '../../application/repository/validation';
import {
  CONTROL_KEY,
  STORE_NAMES,
  controlFromData,
  storedReceiptFromData,
  storedRecordData,
  storedRecordFromData,
  validateStoreInventory,
} from './layout';
import type { Control, StoredRecord } from './layout';

export type RepositoryStatus = 'available' | 'capacity-exhausted' | 'revoked';
export type WriteFault = 'abort' | 'quota' | 'write' | undefined;

export interface IndexedDbRepositoryOptions {
  readonly receiptCapacity: number;
  /** Synthetic fault evidence only; invoked after write requests succeed. */
  readonly fault?: () => WriteFault;
  readonly onStatus?: (status: RepositoryStatus) => void;
}

export interface IndexedDbRepositoryHandle<T> {
  readonly repository: AtomicRecordRepository<T>;
  close(): void;
  isRevoked(): boolean;
  status(): RepositoryStatus;
}

export function nativeStorageCode(error: unknown): ApplicationErrorCode {
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') return 'quota_exceeded';
    if (error.name === 'VersionError') return 'unsupported_schema';
  }
  return 'storage_unavailable';
}

/** Takes an explicitly opened, owned database. It never opens or bootstraps. */
export function createIndexedDbRepository<T>(
  database: IDBDatabase,
  codec: RecordCodec<T>,
  options: IndexedDbRepositoryOptions,
): ApplicationResult<IndexedDbRepositoryHandle<T>> {
  if (
    (database.version !== 1 && database.version !== 2) ||
    !Number.isSafeInteger(options.receiptCapacity) ||
    options.receiptCapacity < 1
  )
    return applicationFailure('unsupported_schema');
  try {
    const inspection = database.transaction([...STORE_NAMES], 'readonly');
    const inventory = validateStoreInventory(database, inspection);
    if (!inventory.ok) {
      inspection.abort();
      return inventory;
    }
  } catch (error) {
    return applicationFailure(nativeStorageCode(error));
  }
  let revoked = false;
  let currentStatus: RepositoryStatus = 'available';

  function status(next: RepositoryStatus): void {
    currentStatus = next;
    try {
      options.onStatus?.(next);
    } catch {
      // Status is an observation, never authority over the transaction outcome.
    }
  }

  function close(): void {
    revoked = true;
    status('revoked');
    database.close();
  }
  database.addEventListener('versionchange', close);
  database.addEventListener('close', close);

  type Complete<R> = (result: ApplicationResult<R>) => void;
  type Reject = (code: ApplicationErrorCode) => void;

  function transaction<R>(
    stores: string[],
    mode: IDBTransactionMode,
    queue: (
      transaction: IDBTransaction,
      complete: Complete<R>,
      reject: Reject,
    ) => void,
  ): Promise<ApplicationResult<R>> {
    if (revoked)
      return Promise.resolve(applicationFailure('storage_unavailable'));
    return new Promise((resolve) => {
      let pending: ApplicationResult<R> | undefined;
      let failure: ApplicationErrorCode | undefined;
      let tx: IDBTransaction;
      try {
        tx = database.transaction(stores, mode);
      } catch (error) {
        resolve(applicationFailure(nativeStorageCode(error)));
        return;
      }
      tx.oncomplete = () =>
        resolve(pending ?? applicationFailure('storage_unavailable'));
      tx.onabort = () =>
        resolve(applicationFailure(failure ?? nativeStorageCode(tx.error)));
      tx.onerror = () => {
        if (tx.error?.name === 'QuotaExceededError') failure = 'quota_exceeded';
      };
      function reject(code: ApplicationErrorCode): void {
        failure ??= code;
        try {
          tx.abort();
        } catch {
          resolve(applicationFailure(failure));
        }
      }
      try {
        const inventory = validateStoreInventory(database, tx);
        if (!inventory.ok) {
          reject(inventory.error.code);
          return;
        }
        queue(
          tx,
          (result) => {
            pending = result;
          },
          reject,
        );
      } catch (error) {
        reject(nativeStorageCode(error));
      }
    });
  }

  function readControl(
    tx: IDBTransaction,
    reject: Reject,
    next: (control: Control) => void,
  ): void {
    const request = tx.objectStore('metadata').get(CONTROL_KEY);
    request.onsuccess = () => {
      try {
        const control = controlFromData(
          request.result as unknown,
          database.version,
        );
        if (!control.ok) {
          reject(control.error.code);
          return;
        }
        const metadataCount = tx.objectStore('metadata').count();
        metadataCount.onsuccess = () => {
          try {
            if (metadataCount.result !== 1) {
              reject('invalid_record');
              return;
            }
            if (!tx.objectStoreNames.contains('migrationStaging')) {
              next(control.value);
              return;
            }
            const checkpointCount = tx.objectStore('migrationStaging').count();
            checkpointCount.onsuccess = () => {
              try {
                if (
                  checkpointCount.result !==
                  (control.value.recoveryPhase === 'ready' ? 0 : 1)
                ) {
                  reject('invalid_record');
                  return;
                }
                next(control.value);
              } catch (error) {
                reject(nativeStorageCode(error));
              }
            };
          } catch (error) {
            reject(nativeStorageCode(error));
          }
        };
      } catch (error) {
        reject(nativeStorageCode(error));
      }
    };
  }

  function applyFault(tx: IDBTransaction, reject: Reject): void {
    try {
      const fault = options.fault?.();
      if (fault === 'abort') reject('storage_unavailable');
      else if (fault === 'quota') reject('quota_exceeded');
      else if (fault === 'write') {
        // A native request error must abort preceding successful write requests.
        tx.objectStore('metadata').add({}, CONTROL_KEY);
      }
    } catch (error) {
      reject(nativeStorageCode(error));
    }
  }

  function execute(
    input: RepositoryCommand<T>,
  ): Promise<ApplicationResult<OperationReceipt>> {
    // This synchronous boundary runs before even the first Promise is returned.
    let command: RepositoryCommand<T>;
    let fingerprint: string;
    try {
      const parsed = commandFromData(input, codec);
      if (!parsed.ok) return Promise.resolve(parsed);
      const identity = commandFingerprint(parsed.value, codec);
      if (!identity.ok) return Promise.resolve(identity);
      command = parsed.value;
      fingerprint = identity.value;
    } catch {
      return Promise.resolve(applicationFailure('invalid_command'));
    }
    return transaction<OperationReceipt>(
      [...STORE_NAMES],
      'readwrite',
      (tx, complete, reject) => {
        readControl(tx, reject, (control) => {
          if (control.recoveryPhase !== 'ready') {
            reject('storage_unavailable');
            return;
          }
          if (command.storageEpoch !== control.storageEpoch) {
            reject('epoch_conflict');
            return;
          }
          const receiptStore = tx.objectStore('receipts');
          const priorRequest = receiptStore.get(command.operationId);
          priorRequest.onsuccess = () => {
            try {
              if (priorRequest.result !== undefined) {
                const prior = storedReceiptFromData(
                  priorRequest.result as unknown,
                  command.operationId,
                  control.storageEpoch,
                  codec,
                );
                if (!prior.ok) reject(prior.error.code);
                else if (prior.value.fingerprint !== fingerprint)
                  reject('operation_conflict');
                else complete(receiptFromData(prior.value.receipt));
                return;
              }
              const recordStore = tx.objectStore('records');
              const recordRequest = recordStore.get(command.recordId);
              recordRequest.onsuccess = () => {
                try {
                  let current: StoredRecord<T> | undefined;
                  if (recordRequest.result !== undefined) {
                    const checked = storedRecordFromData(
                      recordRequest.result as unknown,
                      command.recordId,
                      codec,
                      database.version,
                    );
                    if (!checked.ok) {
                      reject(checked.error.code);
                      return;
                    }
                    current = checked.value;
                  }
                  if (command.kind === 'create' && current) {
                    reject('record_already_exists');
                    return;
                  }
                  if (command.kind !== 'create' && !current) {
                    reject('record_not_found');
                    return;
                  }
                  if (
                    command.kind !== 'create' &&
                    current?.revision !== command.expectedRevision
                  ) {
                    reject('revision_conflict');
                    return;
                  }
                  const zero = revision(0);
                  if (!zero.ok) {
                    reject(zero.error.code);
                    return;
                  }
                  const nextRevision = advanceRevision(
                    current?.revision ?? zero.value,
                  );
                  if (!nextRevision.ok) {
                    reject(nextRevision.error.code);
                    return;
                  }
                  const nextEpoch =
                    command.kind === 'delete'
                      ? advanceEpoch(control.storageEpoch)
                      : applicationSuccess(control.storageEpoch);
                  if (!nextEpoch.ok) {
                    reject(nextEpoch.error.code);
                    return;
                  }
                  const response = receiptFromData({
                    version: RECEIPT_VERSION,
                    kind: command.kind,
                    operationId: command.operationId,
                    recordId: command.recordId,
                    revision: nextRevision.value,
                    storageEpoch: nextEpoch.value,
                  });
                  if (!response.ok) {
                    reject(response.error.code);
                    return;
                  }
                  const receipt = response.value;
                  const resultingRevision = nextRevision.value;
                  const resultingEpoch = nextEpoch.value;
                  function writes(): void {
                    complete(applicationSuccess(receipt));
                    if (command.kind === 'delete') {
                      recordStore.delete(command.recordId);
                      receiptStore.clear();
                      tx.objectStore('migrationStaging').clear();
                      const last = tx
                        .objectStore('metadata')
                        .put(
                          { ...control, storageEpoch: resultingEpoch },
                          CONTROL_KEY,
                        );
                      last.onsuccess = () => applyFault(tx, reject);
                    } else {
                      const version = database.version;
                      if (version !== 1 && version !== 2) {
                        reject('unsupported_schema');
                        return;
                      }
                      recordStore.put(
                        storedRecordData(
                          {
                            recordId: command.recordId,
                            revision: resultingRevision,
                            recordSchema: codec.schema,
                            payload: command.payload,
                          },
                          version,
                        ),
                      );
                      const last = receiptStore.add({
                        operationId: command.operationId,
                        recordId: command.recordId,
                        storageEpoch: control.storageEpoch,
                        fingerprint,
                        receipt,
                      });
                      last.onsuccess = () => applyFault(tx, reject);
                    }
                  }
                  if (command.kind === 'delete') writes();
                  else {
                    const count = receiptStore.count();
                    count.onsuccess = () => {
                      try {
                        if (count.result >= options.receiptCapacity) {
                          status('capacity-exhausted');
                          reject('storage_unavailable');
                        } else writes();
                      } catch (error) {
                        reject(nativeStorageCode(error));
                      }
                    };
                  }
                } catch (error) {
                  reject(nativeStorageCode(error));
                }
              };
            } catch (error) {
              reject(nativeStorageCode(error));
            }
          };
        });
      },
    ).then((result) => {
      if (result.ok && command.kind === 'delete' && !revoked)
        status('available');
      return result;
    });
  }

  const repository: AtomicRecordRepository<T> = {
    getEpoch: () =>
      transaction<StorageEpoch>(
        ['metadata'],
        'readonly',
        (tx, complete, reject) => {
          readControl(tx, reject, (control) =>
            complete(applicationSuccess(control.storageEpoch)),
          );
        },
      ),
    load: (input) => {
      const id = recordId(input);
      if (!id.ok) return Promise.resolve(id);
      return transaction<RecordSnapshot<T>>(
        ['metadata', 'records'],
        'readonly',
        (tx, complete, reject) => {
          readControl(tx, reject, (control) => {
            const request = tx.objectStore('records').get(id.value);
            request.onsuccess = () => {
              try {
                if (request.result === undefined) {
                  reject('record_not_found');
                  return;
                }
                const record = storedRecordFromData(
                  request.result as unknown,
                  id.value,
                  codec,
                  database.version,
                );
                if (!record.ok) {
                  reject(record.error.code);
                  return;
                }
                const snapshot = snapshotFromData(
                  {
                    recordId: record.value.recordId,
                    revision: record.value.revision,
                    storageEpoch: control.storageEpoch,
                    payload: record.value.payload,
                  },
                  codec,
                );
                if (!snapshot.ok) reject(snapshot.error.code);
                else complete(snapshot);
              } catch (error) {
                reject(nativeStorageCode(error));
              }
            };
          });
        },
      );
    },
    execute,
  };
  return applicationSuccess({
    repository,
    close,
    isRevoked: () => revoked,
    status: () => currentStatus,
  });
}
