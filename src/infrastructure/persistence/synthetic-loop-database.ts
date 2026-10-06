import { storageEpoch } from '../../application/core/integrity';
import {
  applicationFailure,
  applicationSuccess,
} from '../../application/core/result';
import type { ApplicationResult } from '../../application/core/result';
import {
  syntheticLoopCodec,
  syntheticLoopRecordId,
} from '../../application/synthetic-loop';
import { SYNTHETIC_PROFILE_IDS } from '../../domain/adaptation/types';
import {
  CONTROL_KEY,
  STORE_NAMES,
  controlFromData,
  readyControl,
  validateStoreInventory,
  storedRecordFromData,
  storedReceiptFromData,
} from './layout';
import { nativeStorageCode } from './adapter';

/** Fixed owned namespace. Only the separate loopback developer entry imports it. */
export const SYNTHETIC_LOOP_DATABASE =
  'math-adventure.synthetic.phase3c.loop-v1';

/** One native snapshot checks every owned row/receipt, including unsupported
 * extra rows. Neither an unknown row nor a newer schema becomes an empty start.
 */
export function validateSyntheticLoopDatabase(
  database: IDBDatabase,
): Promise<ApplicationResult<void>> {
  if (database.name !== SYNTHETIC_LOOP_DATABASE || database.version !== 2)
    return Promise.resolve(applicationFailure('unsupported_schema'));
  return new Promise((resolve) => {
    let outcome: ApplicationResult<void> = applicationFailure(
      'storage_unavailable',
    );
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction([...STORE_NAMES], 'readonly');
      const fail = (code: Parameters<typeof applicationFailure>[0]) => {
        outcome = applicationFailure(code);
        transaction.abort();
      };
      const inventory = validateStoreInventory(database, transaction);
      if (!inventory.ok) fail(inventory.error.code);
      else {
        const metadataCount = transaction.objectStore('metadata').count();
        metadataCount.onsuccess = () => {
          if (metadataCount.result !== 1) fail('invalid_record');
        };
        const stagingCount = transaction
          .objectStore('migrationStaging')
          .count();
        stagingCount.onsuccess = () => {
          if (stagingCount.result !== 0) fail('storage_unavailable');
        };
        const control = transaction.objectStore('metadata').get(CONTROL_KEY);
        control.onsuccess = () => {
          const checked = controlFromData(control.result, database.version);
          if (!checked.ok) {
            fail(checked.error.code);
            return;
          }
          if (checked.value.recoveryPhase !== 'ready') {
            fail('storage_unavailable');
            return;
          }
          outcome = applicationSuccess(undefined);
          let records = 0;
          const rows = transaction.objectStore('records').openCursor();
          rows.onsuccess = () => {
            const cursor = rows.result;
            if (!cursor) return;
            const row = storedRecordFromData(
              cursor.value as unknown,
              cursor.primaryKey,
              syntheticLoopCodec,
              2,
            );
            if (!row.ok) {
              fail(row.error.code);
              return;
            }
            const allowed = SYNTHETIC_PROFILE_IDS.some((profile) => {
              const id = syntheticLoopRecordId(profile);
              return (
                id.ok &&
                id.value === row.value.recordId &&
                row.value.payload.profileId === profile
              );
            });
            if (!allowed || ++records > 2) {
              fail('invalid_record');
              return;
            }
            cursor.continue();
          };
          let receipts = 0;
          const saved = transaction.objectStore('receipts').openCursor();
          saved.onsuccess = () => {
            const cursor = saved.result;
            if (!cursor) return;
            const receipt = storedReceiptFromData(
              cursor.value as unknown,
              cursor.primaryKey,
              checked.value.storageEpoch,
              syntheticLoopCodec,
            );
            if (!receipt.ok) {
              fail(receipt.error.code);
              return;
            }
            if (
              ++receipts > 256 ||
              !SYNTHETIC_PROFILE_IDS.some((profile) => {
                const id = syntheticLoopRecordId(profile);
                return id.ok && id.value === receipt.value.recordId;
              })
            ) {
              fail('invalid_receipt');
              return;
            }
            cursor.continue();
          };
        };
      }
      transaction.oncomplete = () => resolve(outcome);
      transaction.onabort = () =>
        resolve(
          outcome.ok
            ? applicationFailure(nativeStorageCode(transaction.error))
            : outcome,
        );
      transaction.onerror = () => {
        /* transaction abort is final */
      };
    } catch (error) {
      resolve(applicationFailure(nativeStorageCode(error)));
    }
  });
}

/** Only explicit bootstrap may create layout 2. Reopen never resurrects erased
 * state or migrates an existing unknown schema. A blocked late open is closed.
 */
export function openSyntheticLoopDatabase(options: {
  readonly bootstrap: boolean;
  readonly factory?: IDBFactory;
}): Promise<ApplicationResult<IDBDatabase>> {
  let factory: IDBFactory | undefined;
  try {
    factory = options.factory ?? globalThis.indexedDB;
  } catch {
    /* denied */
  }
  if (!factory)
    return Promise.resolve(applicationFailure('storage_unavailable'));
  return new Promise((resolve) => {
    let settled = false;
    let failure: 'storage_unavailable' | 'unsupported_schema' | undefined;
    const finish = (result: ApplicationResult<IDBDatabase>) => {
      if (settled) {
        if (result.ok) result.value.close();
        return;
      }
      settled = true;
      resolve(result);
    };
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(SYNTHETIC_LOOP_DATABASE, 2);
    } catch (error) {
      finish(applicationFailure(nativeStorageCode(error)));
      return;
    }
    request.onupgradeneeded = (event) => {
      const transaction = request.transaction;
      if (!transaction) return;
      if (event.oldVersion !== 0 || !options.bootstrap || settled) {
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
        const epoch = storageEpoch(0);
        if (!epoch.ok) {
          transaction.abort();
          return;
        }
        transaction
          .objectStore('metadata')
          .add(readyControl(2, epoch.value), CONTROL_KEY);
      } catch {
        failure = 'storage_unavailable';
        transaction.abort();
      }
    };
    request.onblocked = () => {
      failure = 'storage_unavailable';
      finish(applicationFailure(failure));
    };
    request.onerror = () =>
      finish(applicationFailure(failure ?? nativeStorageCode(request.error)));
    request.onsuccess = () => {
      const database = request.result;
      if (settled || failure) {
        database.close();
        finish(applicationFailure(failure ?? 'storage_unavailable'));
        return;
      }
      database.onversionchange = () => database.close();
      try {
        const transaction = database.transaction([...STORE_NAMES], 'readonly');
        const inventory = validateStoreInventory(database, transaction);
        let valid = inventory.ok;
        let code = inventory.ok ? null : inventory.error.code;
        if (!inventory.ok) transaction.abort();
        else {
          const control = transaction.objectStore('metadata').get(CONTROL_KEY);
          control.onsuccess = () => {
            const checked = controlFromData(control.result, database.version);
            valid = checked.ok && checked.value.recoveryPhase === 'ready';
            code = checked.ok ? 'storage_unavailable' : checked.error.code;
            if (!valid) transaction.abort();
          };
          const metadata = transaction.objectStore('metadata').count();
          metadata.onsuccess = () => {
            if (metadata.result !== 1) {
              valid = false;
              code = 'invalid_record';
              transaction.abort();
            }
          };
          const checkpoint = transaction
            .objectStore('migrationStaging')
            .count();
          checkpoint.onsuccess = () => {
            if (checkpoint.result !== 0) {
              valid = false;
              code = 'storage_unavailable';
              transaction.abort();
            }
          };
        }
        transaction.oncomplete = () => finish(applicationSuccess(database));
        transaction.onabort = () => {
          database.close();
          finish(applicationFailure(code ?? 'storage_unavailable'));
        };
        transaction.onerror = () => {
          /* abort is final */
        };
      } catch (error) {
        database.close();
        finish(applicationFailure(nativeStorageCode(error)));
      }
    };
  });
}
