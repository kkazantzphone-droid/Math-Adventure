import { describe, expect, it, vi } from 'vitest';
import { storageEpoch } from '../../src/application/core/integrity';
import {
  COMMAND_VERSION,
  RECEIPT_VERSION,
} from '../../src/application/ports/repository';
import { canonicalize } from '../../src/domain/replay/canonical';
import {
  controlFromData,
  readyControl,
  storedReceiptFromData,
  storedRecordFromData,
} from '../../src/infrastructure/persistence/layout';
import {
  syntheticLearnerCodec,
  syntheticLearnerRecord,
} from '../fixtures/synthetic/learner-record';

const id = 'synthetic-layout-profile-a';
const op = 'synthetic-layout-operation-a';
const checkedEpoch = storageEpoch(7);
if (!checkedEpoch.ok) throw new Error('Invalid synthetic epoch fixture');
const epoch = checkedEpoch.value;
const invalidRecord = { ok: false, error: { code: 'invalid_record' } };
const invalidReceipt = { ok: false, error: { code: 'invalid_receipt' } };
const unsupported = { ok: false, error: { code: 'unsupported_schema' } };

function fingerprint(input: unknown): string {
  const result = canonicalize(input);
  if (!result.ok) throw new Error('Invalid synthetic fingerprint fixture');
  return result.value;
}

function receiptRow(kind: 'create' | 'update' = 'update') {
  const command = {
    version: COMMAND_VERSION,
    recordSchema: syntheticLearnerCodec.schema,
    operationId: op,
    storageEpoch: epoch,
    recordId: id,
    kind,
    expectedRevision: kind === 'create' ? null : 2,
    payload: syntheticLearnerRecord(),
  };
  return {
    operationId: op,
    recordId: id,
    storageEpoch: epoch,
    fingerprint: fingerprint(command),
    receipt: {
      version: RECEIPT_VERSION,
      kind,
      operationId: op,
      recordId: id,
      storageEpoch: epoch,
      revision: kind === 'create' ? 1 : 3,
    },
  };
}

describe('IndexedDB stored-data boundaries — no browser or durability claim', () => {
  it('accepts only compatible exact control and recovery states', () => {
    const ready = readyControl(1, epoch);
    expect(controlFromData(ready, 1)).toEqual({ ok: true, value: ready });
    for (const changes of [
      { storageEpoch: -1 },
      { storageEpoch: Number.MAX_SAFE_INTEGER + 1 },
      { storageEpoch: 0.1 },
      { storageEpoch: NaN },
      { planId: 'synthetic-layout-1-to-2' },
      { extra: 'synthetic-only' },
    ]) {
      expect(controlFromData({ ...ready, ...changes }, 1)).toEqual(
        invalidRecord,
      );
    }
    for (const changes of [
      { schemaVersion: 2 },
      { compatibleReaderMin: 2 },
      { compatibleReaderMax: 0 },
      { recoveryPhase: 'unknown' },
    ]) {
      expect(controlFromData({ ...ready, ...changes }, 1)).toEqual(unsupported);
    }
    expect(controlFromData(ready, 3)).toEqual(unsupported);
    const prepared = {
      ...ready,
      recoveryPhase: 'prepared',
      planId: 'synthetic-layout-1-to-2',
    };
    expect(controlFromData(prepared, 1).ok).toBe(true);
    expect(
      controlFromData(
        {
          ...prepared,
          schemaVersion: 2,
          compatibleReaderMin: 2,
          compatibleReaderMax: 2,
        },
        2,
      ),
    ).toEqual(invalidRecord);
    const pending = {
      ...readyControl(2, epoch),
      recoveryPhase: 'upgradedPendingValidation',
      planId: 'synthetic-layout-1-to-2',
    };
    expect(controlFromData(pending, 2).ok).toBe(true);
    expect(controlFromData({ ...pending, planId: null }, 2)).toEqual(
      invalidRecord,
    );
  });

  it('never invokes control accessors and rejects non-data control objects', () => {
    const getter = vi.fn(() => epoch);
    const input = { ...readyControl(1, epoch) };
    Object.defineProperty(input, 'storageEpoch', {
      enumerable: true,
      get: getter,
    });
    expect(controlFromData(input, 1)).toEqual(invalidRecord);
    expect(getter).not.toHaveBeenCalled();
    expect(controlFromData(Object.create(readyControl(1, epoch)), 1)).toEqual(
      invalidRecord,
    );
  });

  it('checks record key, exact layout, schema and payload while detaching data', () => {
    const row = {
      recordId: id,
      revision: 3,
      recordSchema: syntheticLearnerCodec.schema,
      payload: syntheticLearnerRecord(),
    };
    const result = storedRecordFromData(row, id, syntheticLearnerCodec, 2);
    expect(result).toEqual({ ok: true, value: row });
    if (!result.ok) throw new Error('Expected valid synthetic record');
    expect(result.value.payload).not.toBe(row.payload);
    expect(result.value.payload.assessments[0]).not.toBe(
      row.payload.assessments[0],
    );
    expect(
      storedRecordFromData(
        row,
        'synthetic-layout-profile-b',
        syntheticLearnerCodec,
        2,
      ),
    ).toEqual(invalidRecord);
    expect(
      storedRecordFromData(
        { ...row, revision: 0.1 },
        id,
        syntheticLearnerCodec,
        2,
      ),
    ).toEqual(invalidRecord);
    expect(
      storedRecordFromData(
        { ...row, recordSchema: 'synthetic-learner-v2' },
        id,
        syntheticLearnerCodec,
        2,
      ),
    ).toEqual(unsupported);
    expect(
      storedRecordFromData(
        { ...row, payload: { ...row.payload, nickname: 'synthetic' } },
        id,
        syntheticLearnerCodec,
        2,
      ),
    ).toEqual(invalidRecord);
    expect(storedRecordFromData(row, id, syntheticLearnerCodec, 1)).toEqual(
      invalidRecord,
    );
    const source = { recordId: id, revision: 3, payload: row.payload };
    expect(storedRecordFromData(source, id, syntheticLearnerCodec, 1)).toEqual({
      ok: true,
      value: row,
    });
    expect(storedRecordFromData(source, id, syntheticLearnerCodec, 2)).toEqual(
      invalidRecord,
    );
    expect(storedRecordFromData(row, id, syntheticLearnerCodec, 3)).toEqual(
      unsupported,
    );
  });

  it('links receipts to the exact canonical command, global key, epoch and next revision', () => {
    for (const kind of ['create', 'update'] as const) {
      const row = receiptRow(kind);
      expect(
        storedReceiptFromData(row, op, epoch, syntheticLearnerCodec),
      ).toEqual({ ok: true, value: row });
      for (const changes of [
        { operationId: 'synthetic-layout-operation-b' },
        { recordId: 'synthetic-layout-profile-b' },
        { storageEpoch: 6 },
        { fingerprint: ` ${row.fingerprint}` },
        { extra: 'synthetic-only' },
      ]) {
        expect(
          storedReceiptFromData(
            { ...row, ...changes },
            op,
            epoch,
            syntheticLearnerCodec,
          ),
        ).toEqual(invalidReceipt);
      }
      for (const changes of [
        { operationId: 'synthetic-layout-operation-b' },
        { recordId: 'synthetic-layout-profile-b' },
        { storageEpoch: 6 },
        { kind: kind === 'create' ? 'update' : 'create' },
        { revision: row.receipt.revision + 1 },
      ]) {
        expect(
          storedReceiptFromData(
            { ...row, receipt: { ...row.receipt, ...changes } },
            op,
            epoch,
            syntheticLearnerCodec,
          ),
        ).toEqual(invalidReceipt);
      }
      expect(
        storedReceiptFromData(
          row,
          'synthetic-layout-operation-b',
          epoch,
          syntheticLearnerCodec,
        ),
      ).toEqual(invalidReceipt);
      const anotherEpoch = storageEpoch(8);
      if (!anotherEpoch.ok) throw new Error('Invalid synthetic epoch fixture');
      expect(
        storedReceiptFromData(
          row,
          op,
          anotherEpoch.value,
          syntheticLearnerCodec,
        ),
      ).toEqual(invalidReceipt);
    }
  });

  it('never stores a deletion receipt or accepts a fingerprint with rounded numeric tokens', () => {
    const row = receiptRow();
    const deletion = {
      version: COMMAND_VERSION,
      recordSchema: syntheticLearnerCodec.schema,
      operationId: op,
      storageEpoch: epoch,
      recordId: id,
      kind: 'delete',
      expectedRevision: 2,
    };
    expect(
      storedReceiptFromData(
        {
          ...row,
          fingerprint: fingerprint(deletion),
          receipt: { ...row.receipt, kind: 'delete', storageEpoch: 8 },
        },
        op,
        epoch,
        syntheticLearnerCodec,
      ),
    ).toEqual(invalidReceipt);
    expect(
      storedReceiptFromData(
        {
          ...row,
          fingerprint: row.fingerprint.replace(
            '"expectedRevision":2',
            '"expectedRevision":2.00000000000000001',
          ),
        },
        op,
        epoch,
        syntheticLearnerCodec,
      ),
    ).toEqual(invalidReceipt);
  });

  it('preserves valid canonical command text longer than the payload-string limit', () => {
    const row = receiptRow();
    const first = syntheticLearnerRecord().assessments[0];
    if (!first) throw new Error('Expected synthetic assessment fixture');
    const command = {
      version: COMMAND_VERSION,
      recordSchema: syntheticLearnerCodec.schema,
      operationId: op,
      storageEpoch: epoch,
      recordId: id,
      kind: 'update',
      expectedRevision: 2,
      payload: {
        marker: 'synthetic-only',
        assessments: Array.from({ length: 32 }, () => first),
      },
    };
    const longRow = { ...row, fingerprint: fingerprint(command) };
    expect(longRow.fingerprint.length).toBeGreaterThan(4096);
    expect(
      storedReceiptFromData(longRow, op, epoch, syntheticLearnerCodec),
    ).toEqual({ ok: true, value: longRow });
  });
});
