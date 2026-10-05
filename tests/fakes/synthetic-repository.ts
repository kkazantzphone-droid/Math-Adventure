import {
  advanceEpoch,
  advanceRevision,
  recordId,
  revision,
  storageEpoch,
} from '../../src/application/core/integrity';
import type {
  OperationId,
  RecordId,
  Revision,
  StorageEpoch,
} from '../../src/application/core/integrity';
import {
  applicationFailure,
  applicationSuccess,
} from '../../src/application/core/result';
import type { ApplicationResult } from '../../src/application/core/result';
import { RECEIPT_VERSION } from '../../src/application/ports/repository';
import type {
  AtomicRecordRepository,
  OperationReceipt,
  RecordCodec,
  RecordSnapshot,
  RepositoryCommand,
} from '../../src/application/ports/repository';
import {
  commandFingerprint,
  commandFromData,
  receiptFromData,
  snapshotFromData,
} from '../../src/application/repository/validation';

interface StoredRecord<T> {
  readonly revision: Revision;
  readonly payload: T;
}
interface StoredReceipt {
  readonly fingerprint: string;
  readonly receipt: OperationReceipt;
}
interface State<T> {
  readonly epoch: StorageEpoch;
  readonly records: ReadonlyMap<RecordId, StoredRecord<T>>;
  readonly receipts: ReadonlyMap<OperationId, StoredReceipt>;
}

/** TEST ONLY: synthetic state, no storage durability or multi-tab transaction proof.
 * Success receipts remain for this test instance's lifetime until epoch rotation;
 * this is not a production retention decision. No clocks, quotas or tombstones.
 * Optional validated initial state exists solely for overflow conformance probes.
 */
export function createSyntheticRepository<T>(
  codec: RecordCodec<T>,
  initial?: {
    readonly epoch: StorageEpoch;
    readonly records: readonly RecordSnapshot<T>[];
  },
): ApplicationResult<AtomicRecordRepository<T>> {
  const epoch = storageEpoch(initial?.epoch ?? 0);
  if (!epoch.ok) return epoch;
  const records = new Map<RecordId, StoredRecord<T>>();
  for (const raw of initial?.records ?? []) {
    const snapshot = snapshotFromData(raw, codec);
    if (
      !snapshot.ok ||
      snapshot.value.storageEpoch !== epoch.value ||
      records.has(snapshot.value.recordId)
    )
      return applicationFailure('invalid_record');
    records.set(snapshot.value.recordId, {
      revision: snapshot.value.revision,
      payload: snapshot.value.payload,
    });
  }
  let state: State<T> = { epoch: epoch.value, records, receipts: new Map() };

  function execute(
    input: RepositoryCommand<T>,
  ): ApplicationResult<OperationReceipt> {
    // Everything before state replacement is preparation on detached values.
    // No await/yield during this fake's linearization; real adapters need a transaction.
    const parsed = commandFromData(input, codec);
    if (!parsed.ok) return parsed;
    const command = parsed.value;
    const fingerprint = commandFingerprint(command, codec);
    if (!fingerprint.ok) return fingerprint;
    if (command.storageEpoch !== state.epoch)
      return applicationFailure('epoch_conflict');
    const prior = state.receipts.get(command.operationId);
    if (prior)
      return prior.fingerprint === fingerprint.value
        ? receiptFromData(prior.receipt)
        : applicationFailure('operation_conflict');
    const current = state.records.get(command.recordId);
    if (command.kind === 'create' && current)
      return applicationFailure('record_already_exists');
    if (command.kind !== 'create' && !current)
      return applicationFailure('record_not_found');
    if (
      command.kind !== 'create' &&
      current?.revision !== command.expectedRevision
    )
      return applicationFailure('revision_conflict');
    const nextRevision = advanceRevision(current?.revision ?? revisionZero);
    if (!nextRevision.ok) return nextRevision;
    const nextEpoch =
      command.kind === 'delete'
        ? advanceEpoch(state.epoch)
        : applicationSuccess(state.epoch);
    if (!nextEpoch.ok) return nextEpoch;
    const receipt: OperationReceipt = {
      version: RECEIPT_VERSION,
      kind: command.kind,
      operationId: command.operationId,
      recordId: command.recordId,
      revision: nextRevision.value,
      storageEpoch: nextEpoch.value,
    };
    const response = receiptFromData(receipt);
    if (!response.ok) return response;
    const nextRecords = new Map(state.records);
    const nextReceipts =
      command.kind === 'delete'
        ? new Map<OperationId, StoredReceipt>()
        : new Map(state.receipts);
    if (command.kind === 'delete') nextRecords.delete(command.recordId);
    else {
      nextRecords.set(command.recordId, {
        revision: nextRevision.value,
        payload: command.payload,
      });
      nextReceipts.set(command.operationId, {
        fingerprint: fingerprint.value,
        receipt,
      });
    }
    // One observable commit publishes payload, revision, epoch and receipts together.
    state = {
      epoch: nextEpoch.value,
      records: nextRecords,
      receipts: nextReceipts,
    };
    return response;
  }

  return applicationSuccess({
    getEpoch: () => Promise.resolve(applicationSuccess(state.epoch)),
    load: (input) => {
      const id = recordId(input);
      if (!id.ok) return Promise.resolve(id);
      const current = state.records.get(id.value);
      return Promise.resolve(
        current
          ? snapshotFromData(
              {
                recordId: id.value,
                revision: current.revision,
                storageEpoch: state.epoch,
                payload: current.payload,
              },
              codec,
            )
          : applicationFailure('record_not_found'),
      );
    },
    execute: (command) => Promise.resolve(execute(command)),
  });
}

// Checked constant, not an unchecked branded assertion.
const zero = revision(0);
if (!zero.ok) throw new Error('Synthetic fixture constant invalid');
const revisionZero = zero.value;
