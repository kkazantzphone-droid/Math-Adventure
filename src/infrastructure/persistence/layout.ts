import {
  advanceRevision,
  operationId,
  recordId,
  storageEpoch,
} from '../../application/core/integrity';
import type {
  OperationId,
  RecordId,
  Revision,
  StorageEpoch,
} from '../../application/core/integrity';
import {
  applicationFailure,
  applicationSuccess,
} from '../../application/core/result';
import type { ApplicationResult } from '../../application/core/result';
import type {
  OperationReceipt,
  RecordCodec,
} from '../../application/ports/repository';
import {
  commandFingerprint,
  commandFromData,
  receiptFromData,
  snapshotFromData,
} from '../../application/repository/validation';
import { dataRecord, hasKeys } from '../../domain/core/data';
import { parseCanonicalData } from '../../domain/replay/canonical';

export const STORE_NAMES = [
  'metadata',
  'records',
  'receipts',
  'migrationStaging',
] as const;
export const CONTROL_KEY = 'control';
export const CHECKPOINT_KEY = 'checkpoint';
export type LayoutVersion = 1 | 2;

export interface Control {
  readonly schemaVersion: LayoutVersion;
  readonly storageEpoch: StorageEpoch;
  readonly compatibleReaderMin: LayoutVersion;
  readonly compatibleReaderMax: LayoutVersion;
  readonly recoveryPhase: 'ready' | 'prepared' | 'upgradedPendingValidation';
  readonly planId: string | null;
}

export interface StoredRecord<T> {
  readonly recordId: RecordId;
  readonly revision: Revision;
  readonly recordSchema: string;
  readonly payload: T;
}

export interface StoredReceipt {
  readonly operationId: OperationId;
  readonly recordId: RecordId;
  readonly storageEpoch: StorageEpoch;
  readonly fingerprint: string;
  readonly receipt: OperationReceipt;
}

export function readyControl(
  version: LayoutVersion,
  epoch: StorageEpoch,
): Control {
  return {
    schemaVersion: version,
    storageEpoch: epoch,
    compatibleReaderMin: version,
    compatibleReaderMax: version,
    recoveryPhase: 'ready',
    planId: null,
  };
}

export function controlFromData(
  input: unknown,
  openedVersion: number,
): ApplicationResult<Control> {
  const data = dataRecord(input, 6);
  if (
    !data ||
    !hasKeys(data, [
      'schemaVersion',
      'storageEpoch',
      'compatibleReaderMin',
      'compatibleReaderMax',
      'recoveryPhase',
      'planId',
    ])
  )
    return applicationFailure('invalid_record');
  if (
    (openedVersion !== 1 && openedVersion !== 2) ||
    data.schemaVersion !== openedVersion ||
    (data.compatibleReaderMin !== 1 && data.compatibleReaderMin !== 2) ||
    (data.compatibleReaderMax !== 1 && data.compatibleReaderMax !== 2) ||
    data.compatibleReaderMin > openedVersion ||
    data.compatibleReaderMax < openedVersion ||
    data.compatibleReaderMin > data.compatibleReaderMax
  )
    return applicationFailure('unsupported_schema');
  const epoch = storageEpoch(data.storageEpoch);
  if (!epoch.ok) return applicationFailure('invalid_record');
  if (
    data.recoveryPhase !== 'ready' &&
    data.recoveryPhase !== 'prepared' &&
    data.recoveryPhase !== 'upgradedPendingValidation'
  )
    return applicationFailure('unsupported_schema');
  if (
    (data.recoveryPhase === 'ready' && data.planId !== null) ||
    (data.recoveryPhase !== 'ready' &&
      data.planId !== 'synthetic-layout-1-to-2') ||
    (data.recoveryPhase === 'prepared' && openedVersion !== 1) ||
    (data.recoveryPhase === 'upgradedPendingValidation' && openedVersion !== 2)
  )
    return applicationFailure('invalid_record');
  return applicationSuccess({
    schemaVersion: openedVersion,
    storageEpoch: epoch.value,
    compatibleReaderMin: data.compatibleReaderMin,
    compatibleReaderMax: data.compatibleReaderMax,
    recoveryPhase: data.recoveryPhase,
    planId: data.recoveryPhase === 'ready' ? null : 'synthetic-layout-1-to-2',
  });
}

/** Layout 1 is an invented rehearsal source, never a shipped learner schema. */
export function storedRecordFromData<T>(
  input: unknown,
  key: unknown,
  codec: RecordCodec<T>,
  version: number = 2,
): ApplicationResult<StoredRecord<T>> {
  if (version !== 1 && version !== 2)
    return applicationFailure('unsupported_schema');
  const data = dataRecord(input, 4);
  if (
    !data ||
    !hasKeys(
      data,
      version === 1
        ? ['recordId', 'revision', 'payload']
        : ['recordId', 'revision', 'recordSchema', 'payload'],
    )
  )
    return applicationFailure('invalid_record');
  if (version === 2 && data.recordSchema !== codec.schema)
    return applicationFailure('unsupported_schema');
  const id = recordId(key);
  if (!id.ok || data.recordId !== id.value)
    return applicationFailure('invalid_record');
  const snapshot = snapshotFromData(
    {
      recordId: data.recordId,
      revision: data.revision,
      storageEpoch: 0,
      payload: data.payload,
    },
    codec,
  );
  return snapshot.ok
    ? applicationSuccess({
        recordId: snapshot.value.recordId,
        revision: snapshot.value.revision,
        recordSchema: codec.schema,
        payload: snapshot.value.payload,
      })
    : snapshot;
}

export function storedRecordData<T>(
  record: StoredRecord<T>,
  version: LayoutVersion,
): Omit<StoredRecord<T>, 'recordSchema'> | StoredRecord<T> {
  return version === 1
    ? {
        recordId: record.recordId,
        revision: record.revision,
        payload: record.payload,
      }
    : record;
}

/** The long canonical fingerprint has its own bound, not a payload-string cap. */
export function storedReceiptFromData<T>(
  input: unknown,
  key: unknown,
  epoch: StorageEpoch,
  codec: RecordCodec<T>,
): ApplicationResult<StoredReceipt> {
  const data = dataRecord(input, 5);
  if (
    !data ||
    !hasKeys(data, [
      'operationId',
      'recordId',
      'storageEpoch',
      'fingerprint',
      'receipt',
    ])
  )
    return applicationFailure('invalid_receipt');
  const op = operationId(key);
  const id = recordId(data.recordId);
  const storedEpoch = storageEpoch(data.storageEpoch);
  if (
    !op.ok ||
    !id.ok ||
    !storedEpoch.ok ||
    data.operationId !== op.value ||
    storedEpoch.value !== epoch ||
    typeof data.fingerprint !== 'string'
  )
    return applicationFailure('invalid_receipt');
  const canonical = parseCanonicalData(data.fingerprint);
  if (!canonical.ok) return applicationFailure('invalid_receipt');
  const command = commandFromData(canonical.value, codec);
  const receipt = receiptFromData(data.receipt);
  if (!command.ok) return command;
  if (!receipt.ok) return receipt;
  const fingerprint = commandFingerprint(command.value, codec);
  const expectedRevision =
    command.value.kind === 'create'
      ? applicationSuccess(1)
      : advanceRevision(command.value.expectedRevision);
  if (
    !fingerprint.ok ||
    fingerprint.value !== data.fingerprint ||
    command.value.kind === 'delete' ||
    command.value.operationId !== op.value ||
    command.value.recordId !== id.value ||
    command.value.storageEpoch !== epoch ||
    receipt.value.operationId !== op.value ||
    receipt.value.recordId !== id.value ||
    receipt.value.storageEpoch !== epoch ||
    receipt.value.kind !== command.value.kind ||
    !expectedRevision.ok ||
    receipt.value.revision !== expectedRevision.value
  )
    return applicationFailure('invalid_receipt');
  return applicationSuccess({
    operationId: op.value,
    recordId: id.value,
    storageEpoch: storedEpoch.value,
    fingerprint: data.fingerprint,
    receipt: receipt.value,
  });
}

export function validateStoreInventory(
  database: IDBDatabase,
  transaction: IDBTransaction,
): ApplicationResult<void> {
  const actual = Array.from(database.objectStoreNames).sort();
  if (
    actual.length !== STORE_NAMES.length ||
    actual.some((name, index) => name !== [...STORE_NAMES].sort()[index])
  )
    return applicationFailure('unsupported_schema');
  for (const name of Array.from(transaction.objectStoreNames)) {
    const store = transaction.objectStore(name);
    const expectedKey =
      name === 'records'
        ? 'recordId'
        : name === 'receipts'
          ? 'operationId'
          : null;
    if (
      !STORE_NAMES.some((allowed) => allowed === name) ||
      store.keyPath !== expectedKey ||
      store.autoIncrement ||
      store.indexNames.length !== 0
    )
      return applicationFailure('unsupported_schema');
  }
  return applicationSuccess(undefined);
}
