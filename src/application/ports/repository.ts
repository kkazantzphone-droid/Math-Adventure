import type {
  OperationId,
  RecordId,
  Revision,
  StorageEpoch,
} from '../core/integrity';
import type { ApplicationResult } from '../core/result';

export const COMMAND_VERSION = 'atomic-command-v1';
export const RECEIPT_VERSION = 'atomic-receipt-v1';

/** A narrow specialization supplies a checked data schema, not an unvalidated blob.
 * decode must validate/rebuild the exact wire shape without changing its data.
 * No normalization, field removal or migration; output canonical equality is checked.
 * Shared boundary readers enforce Phase 1B canonical-data bounds on both sides.
 */
export interface RecordCodec<T> {
  readonly schema: string;
  decode(input: unknown): ApplicationResult<T>;
}

interface CommandEnvelope {
  readonly version: typeof COMMAND_VERSION;
  readonly recordSchema: string;
  readonly operationId: OperationId;
  readonly storageEpoch: StorageEpoch;
  readonly recordId: RecordId;
}

export type RepositoryCommand<T> = CommandEnvelope &
  (
    | {
        readonly kind: 'create';
        readonly expectedRevision: null;
        readonly payload: T;
      }
    | {
        readonly kind: 'update';
        readonly expectedRevision: Revision;
        readonly payload: T;
      }
    | { readonly kind: 'delete'; readonly expectedRevision: Revision }
  );

export interface RecordSnapshot<T> {
  readonly recordId: RecordId;
  readonly revision: Revision;
  readonly storageEpoch: StorageEpoch;
  readonly payload: T;
}

// No canonical command text in public receipts: it can contain evidence payload.
export interface OperationReceipt {
  readonly version: typeof RECEIPT_VERSION;
  readonly kind: 'create' | 'update' | 'delete';
  readonly operationId: OperationId;
  readonly recordId: RecordId;
  readonly revision: Revision;
  readonly storageEpoch: StorageEpoch;
}

/** All implementations must apply validation → epoch → receipt → revision
 * and atomically commit payload/revision/receipt. IDs are global within an epoch.
 * Delete advances the global epoch and removes all old receipts; its returned
 * receipt is response-only. An old-epoch delete retry requires reconciliation.
 * Failed commands have no receipts. There is no implicit upsert or ID generation.
 */
export interface AtomicRecordRepository<T> {
  getEpoch(): Promise<ApplicationResult<StorageEpoch>>;
  load(id: RecordId): Promise<ApplicationResult<RecordSnapshot<T>>>;
  execute(
    command: RepositoryCommand<T>,
  ): Promise<ApplicationResult<OperationReceipt>>;
}
