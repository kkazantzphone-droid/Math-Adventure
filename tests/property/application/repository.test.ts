import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  applicationFailure,
  applicationSuccess,
} from '../../../src/application/core/result';
import type { ApplicationResult } from '../../../src/application/core/result';
import { recordId } from '../../../src/application/core/integrity';
import type { RecordCodec } from '../../../src/application/ports/repository';
import { commandFromData } from '../../../src/application/repository/validation';
import { dataRecord, hasKeys } from '../../../src/domain/core/data';
import { createSyntheticRepository } from '../../fakes/synthetic-repository';
import { RepositoryReferenceModel } from '../../oracle/repository-model';
import type { ModelCommand, ModelPayload } from '../../oracle/repository-model';

// This tiny schema exercises generic integrity independently of the learner
// fixture/schema. It is explicitly synthetic and contains no learner behavior.
const counterCodec: RecordCodec<ModelPayload> = {
  schema: 'synthetic-counter-v1',
  decode(input: unknown): ApplicationResult<ModelPayload> {
    const record = dataRecord(input, 3);
    if (
      !record ||
      !hasKeys(record, ['schema', 'synthetic', 'value']) ||
      record.schema !== 'synthetic-counter-v1' ||
      record.synthetic !== true ||
      typeof record.value !== 'number' ||
      !Number.isSafeInteger(record.value) ||
      record.value < 0 ||
      record.value > 101
    )
      return applicationFailure('invalid_record');
    return applicationSuccess({
      schema: 'synthetic-counter-v1',
      synthetic: true,
      value: record.value,
    });
  },
};

function checked<T>(result: ApplicationResult<T>): T {
  if (!result.ok)
    throw new Error(`Invalid synthetic test setup: ${result.error.code}`);
  return result.value;
}

const actionKinds = [
  'load',
  'create',
  'update',
  'freshUpdate',
  'delete',
  'retry',
  'conflict',
  'staleRevision',
  'staleEpoch',
  'crossProfileCollision',
] as const;
type ActionKind = (typeof actionKinds)[number];
interface Action {
  readonly kind: ActionKind;
  readonly slot: number;
  readonly client: number;
  readonly historyIndex: number;
  readonly value: number;
}
interface ClientView {
  readonly recordId: string;
  readonly revision: number | null;
  readonly epoch: number;
}

const generatedAction = fc.record({
  kind: fc.constantFrom(...actionKinds),
  slot: fc.integer({ min: 0, max: 1 }),
  client: fc.integer({ min: 0, max: 1 }),
  historyIndex: fc.integer({ min: 0, max: 20 }),
  value: fc.integer({ min: 0, max: 100 }),
});

export const repositorySequenceBudget = Object.freeze({
  seed: 20261005,
  generatedSequences: 1000,
  maximumGeneratedLength: 40,
  exhaustiveSequences: 729,
  exhaustiveLength: 3,
});

function payload(value: number): ModelPayload {
  return { schema: 'synthetic-counter-v1', synthetic: true, value };
}

async function exerciseSequence(actions: readonly Action[]): Promise<number> {
  const repository = checked(createSyntheticRepository(counterCodec));
  const model = new RepositoryReferenceModel();
  const physicalIds = ['synthetic-player-001', 'synthetic-player-002'];
  const knownIds = new Set(physicalIds);
  const views: ClientView[][] = [
    physicalIds.map((id) => ({ recordId: id, revision: null, epoch: 0 })),
    physicalIds.map((id) => ({ recordId: id, revision: null, epoch: 0 })),
  ];
  const history: ModelCommand[] = [];
  const successfulCommands = new Map<string, ModelCommand>();
  let nextOperation = 1;
  let nextRecord = 3;
  let commandSteps = 0;

  async function compareState(): Promise<void> {
    expect(checked(await repository.getEpoch())).toBe(model.epoch);
    for (const id of knownIds) {
      const actual = await repository.load(checked(recordId(id)));
      const expected = model.load(id);
      expect(actual).toEqual(
        expected
          ? { ok: true, value: { ...expected, storageEpoch: model.epoch } }
          : { ok: false, error: { code: 'record_not_found' } },
      );
    }
  }

  async function send(command: ModelCommand): Promise<boolean> {
    const expected = model.execute(command);
    // Production readers are used on the adapter side only. The reference model
    // independently receives the original semantic command and owns its outcome.
    const actual = await repository.execute(
      checked(commandFromData(command, counterCodec)),
    );
    expect(actual).toEqual(expected);
    if (expected.ok) {
      if (command.kind === 'delete') successfulCommands.clear();
      else if (!successfulCommands.has(command.operationId))
        successfulCommands.set(command.operationId, command);
    }
    commandSteps += 1;
    history.push(command);
    await compareState();
    return expected.ok;
  }

  function envelope(
    id: string,
    epoch: number,
  ): {
    readonly version: 'atomic-command-v1';
    readonly recordSchema: 'synthetic-counter-v1';
    readonly operationId: string;
    readonly storageEpoch: number;
    readonly recordId: string;
  } {
    return {
      version: 'atomic-command-v1',
      recordSchema: 'synthetic-counter-v1',
      operationId: `synthetic-operation-${nextOperation++}`,
      storageEpoch: epoch,
      recordId: id,
    };
  }

  function refresh(client: number, slot: number): void {
    const id = physicalIds[slot];
    const row = views[client];
    if (!id || !row) throw new Error('Invalid synthetic client index');
    row[slot] = {
      recordId: id,
      revision: model.load(id)?.revision ?? null,
      epoch: model.epoch,
    };
  }

  // Both clients begin from the same two-record snapshot. No fixture shares
  // learner evidence; this setup only makes stale-client races reachable early.
  for (let slot = 0; slot < 2; slot += 1) {
    const id = physicalIds[slot];
    if (!id) throw new Error('Invalid synthetic record index');
    await send({
      ...envelope(id, 0),
      kind: 'create',
      expectedRevision: null,
      payload: payload(slot),
    });
    refresh(0, slot);
    refresh(1, slot);
  }

  for (const action of actions) {
    const id = physicalIds[action.slot];
    const view = views[action.client]?.[action.slot];
    if (!id || !view) throw new Error('Invalid synthetic sequence index');
    if (action.kind === 'load') {
      // Reads refresh only this client's view; the other client remains stale.
      refresh(action.client, action.slot);
      await compareState();
      continue;
    }

    const selected = history[action.historyIndex % history.length];
    let command: ModelCommand;
    if (action.kind === 'retry' && selected) command = selected;
    else if (action.kind === 'conflict' && selected) {
      command =
        selected.kind === 'delete'
          ? { ...selected, expectedRevision: selected.expectedRevision + 1 }
          : {
              ...selected,
              payload: payload((selected.payload.value + 1) % 102),
            };
    } else if (action.kind === 'crossProfileCollision' && selected) {
      const otherId = physicalIds[1 - action.slot];
      if (!otherId) throw new Error('Invalid synthetic profile index');
      const other = model.load(otherId);
      command = other
        ? {
            ...envelope(otherId, model.epoch),
            operationId: selected.operationId,
            kind: 'update',
            expectedRevision: other.revision,
            payload: payload(action.value),
          }
        : {
            ...envelope(otherId, model.epoch),
            operationId: selected.operationId,
            kind: 'create',
            expectedRevision: null,
            payload: payload(action.value),
          };
    } else if (action.kind === 'create') {
      // A later explicit create uses a fresh physical ID after deletion. This
      // test does not decide whether production profile IDs may ever be reused.
      let target = id;
      if (
        !model.load(id) &&
        history.some(
          (prior) => prior.recordId === id && prior.kind === 'delete',
        )
      ) {
        target = `synthetic-player-${String(nextRecord++).padStart(3, '0')}`;
        physicalIds[action.slot] = target;
        knownIds.add(target);
      }
      command = {
        ...envelope(target, view.epoch),
        kind: 'create',
        expectedRevision: null,
        payload: payload(action.value),
      };
    } else {
      const current = model.load(id);
      const forceFresh =
        action.kind === 'freshUpdate' ||
        action.kind === 'staleRevision' ||
        action.kind === 'staleEpoch';
      const commandId = forceFresh ? id : view.recordId;
      const epoch =
        action.kind === 'staleEpoch'
          ? model.epoch === 0
            ? 1
            : model.epoch - 1
          : forceFresh
            ? model.epoch
            : view.epoch;
      const expectedRevision =
        action.kind === 'staleRevision'
          ? (current?.revision ?? 0) + 1
          : forceFresh
            ? (current?.revision ?? 0)
            : (view.revision ?? 0);
      command =
        action.kind === 'delete'
          ? { ...envelope(commandId, epoch), kind: 'delete', expectedRevision }
          : {
              ...envelope(commandId, epoch),
              kind: 'update',
              expectedRevision,
              payload: payload(action.value),
            };
    }
    const committed = await send(command);
    if (
      committed &&
      (action.kind === 'create' ||
        action.kind === 'update' ||
        action.kind === 'freshUpdate') &&
      model.load(command.recordId)
    )
      refresh(action.client, action.slot);
  }

  // Probe every surviving success receipt through the public port. This checks
  // receipt retention/outcomes without depending on Map layout or private fields.
  for (const receipt of model.committedReceipts) {
    const original = successfulCommands.get(receipt.operationId);
    if (!original) throw new Error('Missing synthetic receipt command');
    expect(
      await repository.execute(
        checked(commandFromData(original, counterCodec)),
      ),
    ).toEqual({ ok: true, value: receipt });
    commandSteps += 1;
  }
  await compareState();
  return commandSteps;
}

describe('independent synthetic repository sequence model', () => {
  it('matches 1000 reproducible two-client sequences with up to 40 actions', async () => {
    let commandSteps = 0;
    await fc.assert(
      fc.asyncProperty(
        fc.array(generatedAction, {
          minLength: 20,
          maxLength: repositorySequenceBudget.maximumGeneratedLength,
        }),
        async (actions) => {
          commandSteps += await exerciseSequence(actions);
        },
      ),
      {
        seed: repositorySequenceBudget.seed,
        numRuns: repositorySequenceBudget.generatedSequences,
      },
    );
    expect(commandSteps).toBeGreaterThan(20_000);
    console.info(
      `Synthetic repository model: 1000 generated sequences, max 40 actions, ${commandSteps} command/receipt probes; seed ${repositorySequenceBudget.seed}.`,
    );
  }, 15_000);

  it('exhaustively matches 729 short sequences over nine client operations', async () => {
    const primitives: readonly Action[] = [
      { kind: 'create', slot: 0, client: 0, historyIndex: 0, value: 3 },
      { kind: 'load', slot: 0, client: 1, historyIndex: 0, value: 3 },
      { kind: 'update', slot: 0, client: 0, historyIndex: 0, value: 3 },
      { kind: 'update', slot: 0, client: 1, historyIndex: 0, value: 4 },
      { kind: 'freshUpdate', slot: 1, client: 1, historyIndex: 0, value: 5 },
      { kind: 'delete', slot: 0, client: 0, historyIndex: 0, value: 3 },
      { kind: 'retry', slot: 0, client: 0, historyIndex: 0, value: 3 },
      { kind: 'conflict', slot: 0, client: 0, historyIndex: 0, value: 3 },
      {
        kind: 'crossProfileCollision',
        slot: 0,
        client: 0,
        historyIndex: 0,
        value: 3,
      },
    ];
    let commandSteps = 0;
    for (const first of primitives)
      for (const second of primitives)
        for (const third of primitives)
          commandSteps += await exerciseSequence([first, second, third]);
    expect(primitives.length ** 3).toBe(
      repositorySequenceBudget.exhaustiveSequences,
    );
    console.info(
      `Synthetic repository exhaustive model: 729 sequences, 2187 actions, ${commandSteps} command/receipt probes.`,
    );
  }, 15_000);
});
