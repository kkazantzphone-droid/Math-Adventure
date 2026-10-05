// SYNTHETIC TEST REFERENCE ONLY. No production/fake imports, canonicalizer or
// command-processing helper. Arrays and semantic tuples provide a deliberately
// separate model of the public atomic repository contract.
export type ModelPayload = {
  readonly schema: 'synthetic-counter-v1';
  readonly synthetic: true;
  readonly value: number;
};

interface ModelEnvelope {
  readonly version: 'atomic-command-v1';
  readonly recordSchema: 'synthetic-counter-v1';
  readonly operationId: string;
  readonly storageEpoch: number;
  readonly recordId: string;
}

export type ModelCommand = ModelEnvelope &
  (
    | {
        readonly kind: 'create';
        readonly expectedRevision: null;
        readonly payload: ModelPayload;
      }
    | {
        readonly kind: 'update';
        readonly expectedRevision: number;
        readonly payload: ModelPayload;
      }
    | { readonly kind: 'delete'; readonly expectedRevision: number }
  );

export interface ModelReceipt {
  readonly version: 'atomic-receipt-v1';
  readonly kind: 'create' | 'update' | 'delete';
  readonly operationId: string;
  readonly recordId: string;
  readonly revision: number;
  readonly storageEpoch: number;
}

export interface ModelRecord {
  readonly recordId: string;
  readonly revision: number;
  readonly payload: ModelPayload;
}

export type ModelErrorCode =
  | 'epoch_conflict'
  | 'operation_conflict'
  | 'record_already_exists'
  | 'record_not_found'
  | 'revision_conflict'
  | 'revision_overflow'
  | 'epoch_overflow';

export type ModelOutcome =
  | { readonly ok: true; readonly value: ModelReceipt }
  | { readonly ok: false; readonly error: { readonly code: ModelErrorCode } };

interface RememberedSuccess {
  readonly identity: string;
  readonly receipt: ModelReceipt;
}

function copyPayload(payload: ModelPayload): ModelPayload {
  return {
    schema: 'synthetic-counter-v1',
    synthetic: true,
    value: payload.value,
  };
}

function semanticIdentity(command: ModelCommand): string {
  // Fixed-field tuple equality is independent of the production key-sorting
  // canonicalizer. These generated commands use a small exact synthetic schema.
  return JSON.stringify([
    command.kind,
    command.operationId,
    command.storageEpoch,
    command.recordId,
    command.expectedRevision,
    command.kind === 'delete' ? null : command.payload.value,
  ]);
}

function rejected(code: ModelErrorCode): ModelOutcome {
  return { ok: false, error: { code } };
}

export class RepositoryReferenceModel {
  private currentEpoch = 0;
  private records: ModelRecord[] = [];
  private remembered: RememberedSuccess[] = [];

  get epoch(): number {
    return this.currentEpoch;
  }

  get committedReceipts(): readonly ModelReceipt[] {
    return this.remembered.map(({ receipt }) => ({ ...receipt }));
  }

  load(id: string): ModelRecord | undefined {
    const found = this.records.find((record) => record.recordId === id);
    return found
      ? { ...found, payload: copyPayload(found.payload) }
      : undefined;
  }

  allRecords(): readonly ModelRecord[] {
    return this.records.map((record) => ({
      ...record,
      payload: copyPayload(record.payload),
    }));
  }

  execute(command: ModelCommand): ModelOutcome {
    if (command.storageEpoch !== this.currentEpoch)
      return rejected('epoch_conflict');

    const identity = semanticIdentity(command);
    const previous = this.remembered.find(
      ({ receipt }) => receipt.operationId === command.operationId,
    );
    if (previous)
      return previous.identity === identity
        ? { ok: true, value: { ...previous.receipt } }
        : rejected('operation_conflict');

    const existing = this.load(command.recordId);
    if (command.kind === 'create' && existing)
      return rejected('record_already_exists');
    if (command.kind !== 'create') {
      if (!existing) return rejected('record_not_found');
      if (existing.revision !== command.expectedRevision)
        return rejected('revision_conflict');
    }

    const resultingRevision =
      command.kind === 'create' ? 1 : (existing?.revision ?? 0) + 1;
    if (!Number.isSafeInteger(resultingRevision))
      return rejected('revision_overflow');
    if (
      command.kind === 'delete' &&
      !Number.isSafeInteger(this.currentEpoch + 1)
    )
      return rejected('epoch_overflow');

    const nextEpoch = this.currentEpoch + (command.kind === 'delete' ? 1 : 0);
    const receipt: ModelReceipt = {
      version: 'atomic-receipt-v1',
      kind: command.kind,
      operationId: command.operationId,
      recordId: command.recordId,
      revision: resultingRevision,
      storageEpoch: nextEpoch,
    };
    const survivors = this.records.filter(
      (record) => record.recordId !== command.recordId,
    );
    if (command.kind === 'delete') {
      this.records = survivors;
      this.currentEpoch = nextEpoch;
      this.remembered = [];
    } else {
      this.records = [
        ...survivors,
        {
          recordId: command.recordId,
          revision: resultingRevision,
          payload: copyPayload(command.payload),
        },
      ];
      this.remembered = [...this.remembered, { identity, receipt }];
    }
    return { ok: true, value: { ...receipt } };
  }
}
