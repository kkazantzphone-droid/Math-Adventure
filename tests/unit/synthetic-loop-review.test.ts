import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revision } from '../../src/application/core/integrity';
import {
  applicationFailure,
  applicationSuccess,
} from '../../src/application/core/result';
import type { AtomicRecordRepository } from '../../src/application/ports/repository';
import {
  createSyntheticLoopSession,
  syntheticLoopCodec,
  syntheticLoopRecordId,
} from '../../src/application/synthetic-loop';
import type {
  LoopAnswerRequest,
  SyntheticLoopRecord,
} from '../../src/application/synthetic-loop';
import { createProofReplay } from '../../src/domain/families/proofs';
import { createSyntheticRepository } from '../fakes/synthetic-repository';
import { createSliceRuntime } from '../browser/phase3c/runtime';

const adapter = vi.hoisted(() => ({
  repository: null as AtomicRecordRepository<SyntheticLoopRecord> | null,
  openFailure: false,
  validationFailure: false,
}));

vi.mock('../../src/infrastructure/persistence/synthetic-loop-database', () => ({
  openSyntheticLoopDatabase: () =>
    Promise.resolve(
      adapter.openFailure
        ? { ok: false, error: { code: 'unsupported_schema' } }
        : { ok: true, value: { close() {} } },
    ),
  validateSyntheticLoopDatabase: () =>
    Promise.resolve(
      adapter.validationFailure
        ? { ok: false, error: { code: 'unsupported_schema' } }
        : { ok: true, value: undefined },
    ),
}));

vi.mock('../../src/infrastructure/persistence/adapter', () => ({
  createIndexedDbRepository: () => ({
    ok: true,
    value: {
      repository: adapter.repository,
      close() {},
      isRevoked: () => false,
      status: () => 'available',
    },
  }),
}));

function value<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string } },
): T {
  if (!result.ok)
    throw new Error(`Synthetic reviewer fixture: ${result.error.code}`);
  return result.value;
}

function currentRepository(): AtomicRecordRepository<SyntheticLoopRecord> {
  if (!adapter.repository)
    throw new Error('Synthetic reviewer repository missing');
  return adapter.repository;
}

const player1 = 'SYNTHETIC-PLAYER-1';
const player2 = 'SYNTHETIC-PLAYER-2';
const seed = '00000001000000020000000300000004';
function request(): LoopAnswerRequest {
  return {
    replay: value(createProofReplay('number.addition', seed)),
    answer: {
      kind: 'exactValue',
      value: { schema: 'rational-v1', numerator: '0', denominator: '1' },
    },
    mathematicalHintTier: 0,
    meaningfulAttempts: 1,
    solutionExposed: false,
    accessibilitySupports: [],
    accessible: true,
    playMode: 'practice',
    coarseDay: 0,
    clockCertain: true,
    revisit: false,
  };
}

beforeEach(() => {
  adapter.repository = value(createSyntheticRepository(syntheticLoopCodec));
  adapter.openFailure = false;
  adapter.validationFailure = false;
});

describe('Independent synthetic developer runtime boundaries', () => {
  it('forwards first-entry language into new profiles and restores persisted choices on return', async () => {
    const runtime = createSliceRuntime(new URL('http://127.0.0.1:4200/'));
    const english = {
      uiLocale: 'en-GB',
      instructionLocale: 'en-GB',
      numberSpeechLocale: 'en-GB',
    } as const;
    const german = {
      uiLocale: 'de-DE',
      instructionLocale: 'de-DE',
      numberSpeechLocale: 'de-DE',
    } as const;
    await runtime.selectProfile(
      player1,
      'language-runtime-create',
      true,
      english,
    );
    expect(runtime.session().state().record?.preferences).toEqual(english);
    await runtime.selectProfile(
      player2,
      'language-runtime-unsaved',
      false,
      german,
    );
    expect(runtime.session().state().record?.preferences).toEqual(german);
    expect(runtime.session().state().saved).toBe(false);
    await runtime.selectProfile(
      player1,
      'language-runtime-return',
      true,
      german,
    );
    expect(runtime.session().state().record?.preferences).toEqual(english);
    expect(runtime.session().state().snapshot?.revision).toBe(1);
  });

  it('explicit saved play resumes persistence after choosing an unsaved profile', async () => {
    const runtime = createSliceRuntime(new URL('http://127.0.0.1:4200/'));
    await runtime.selectProfile(player1, 'review-create-one', true);
    value(await runtime.session().submit(request(), 'review-first-answer'));
    await runtime.selectProfile(player2, 'review-unsaved-two', false);
    value(await runtime.session().submit(request(), 'review-unsaved-answer'));
    expect(runtime.session().state().saved).toBe(false);
    await runtime.selectProfile(player1, 'review-return-one', true);
    expect(runtime.session().state().saved).toBe(true);
    expect(runtime.session().state().record?.completedCount).toBe(1);
    value(await runtime.session().submit(request(), 'review-second-answer'));
    const reloaded = value(
      await currentRepository().load(value(syntheticLoopRecordId(player1))),
    );
    expect(reloaded.payload.completedCount).toBe(2);
    expect(
      await currentRepository().load(value(syntheticLoopRecordId(player2))),
    ).toEqual(applicationFailure('record_not_found'));
  });

  it('unrecognized database schema requires explicit unsaved selection', async () => {
    adapter.openFailure = true;
    const runtime = createSliceRuntime(new URL('http://127.0.0.1:4200/'));
    await runtime.selectProfile(player1, 'review-create-refused', true);
    expect(runtime.recovery().error).toBe('unsupported_schema');
    expect(runtime.session().state().record).toBeNull();
    await runtime.selectProfile(player1, 'review-explicit-unsaved', false);
    expect(runtime.session().state().record?.profileId).toBe(player1);
    value(await runtime.session().submit(request(), 'review-local-answer'));
    expect(runtime.session().state().saved).toBe(false);
  });

  it('an unsupported row found by whole-store validation cannot become a blank saved profile', async () => {
    adapter.validationFailure = true;
    const runtime = createSliceRuntime(new URL('http://127.0.0.1:4200/'));
    await runtime.selectProfile(player1, 'review-row-refused', true);
    expect(runtime.recovery().error).toBe('unsupported_schema');
    expect(runtime.session().state().record).toBeNull();
    expect(
      await currentRepository().load(value(syntheticLoopRecordId(player1))),
    ).toEqual(applicationFailure('record_not_found'));
  });

  it('switching to unsaved play cancels an old uncommitted terminal observation', async () => {
    const runtime = createSliceRuntime(new URL('http://127.0.0.1:4200/'));
    await runtime.selectProfile(player1, 'review-create-race', true);
    const prior = runtime.session();
    value(await prior.setMode('synthetic-policy', 'review-mode'));
    runtime.holdWrites(true);
    const pending = prior.submit(request(), 'review-race-answer');
    expect(runtime.held()).toBe(1);
    await runtime.selectProfile(player2, 'review-switch-local', false);
    runtime.holdWrites(false);
    expect(await pending).toEqual(applicationFailure('operation_conflict'));
    const old = value(
      await currentRepository().load(value(syntheticLoopRecordId(player1))),
    );
    expect(old.payload.completedCount).toBe(0);
    expect(old.payload.events).toEqual([]);
    expect(old.payload.pending).toBeNull();
    expect(runtime.session().state().record?.profileId).toBe(player2);
    expect(runtime.session().state().record?.events).toEqual([]);
  });

  it('an unresolved durable command in another profile prevents update readiness', async () => {
    const base = currentRepository();
    let failFinal = true;
    adapter.repository = {
      getEpoch: () => base.getEpoch(),
      load: (id) => base.load(id),
      execute: (command) =>
        failFinal && command.operationId === 'review-nonselected-answer'
          ? Promise.resolve(applicationFailure('storage_unavailable'))
          : base.execute(command),
    };
    const runtime = createSliceRuntime(new URL('http://127.0.0.1:4200/'));
    await runtime.selectProfile(player1, 'review-nonselected-create-one', true);
    const prior = runtime.session();
    expect(await prior.submit(request(), 'review-nonselected-answer')).toEqual(
      applicationFailure('storage_unavailable'),
    );
    expect(prior.state().record?.pending).not.toBeNull();
    await runtime.selectProfile(player2, 'review-nonselected-local-two', false);
    await runtime.selectProfile(player2, 'review-nonselected-create-two', true);
    const firstAttempt = {
      releaseId: 'review-release',
      attemptId: 'review-attempt-one',
    };
    const shell = { releaseId: null, shellId: 'a'.repeat(64) };
    runtime.learnerData.fence(firstAttempt);
    expect(await runtime.learnerData.reconcile(firstAttempt, shell)).toBe(
      false,
    );
    expect(runtime.learnerData.isReady(firstAttempt)).toBe(false);
    runtime.learnerData.cancel(firstAttempt);
    await runtime.selectProfile(player1, 'review-nonselected-return-one', true);
    failFinal = false;
    value(await runtime.session().retryPending());
    await runtime.selectProfile(player2, 'review-nonselected-return-two', true);
    const secondAttempt = { ...firstAttempt, attemptId: 'review-attempt-two' };
    runtime.learnerData.fence(secondAttempt);
    expect(await runtime.learnerData.reconcile(secondAttempt, shell)).toBe(
      true,
    );
    expect(runtime.learnerData.isReady(secondAttempt)).toBe(true);
  });
});

describe('Independent synthetic application reconciliation boundaries', () => {
  it('manual outcomes never turn into observations when proposed-policy mode resumes', async () => {
    const session = createSyntheticLoopSession(currentRepository());
    value(await session.selectProfile(player1, 'review-manual-create'));
    value(await session.submit(request(), 'review-manual-answer-one'));
    value(await session.setMode('synthetic-policy', 'review-policy-on'));
    value(await session.submit(request(), 'review-policy-answer'));
    const priorEvents = session.state().record?.events;
    const priorDerived = session.state().record?.derived;
    value(await session.setMode('manual', 'review-policy-off'));
    value(await session.submit(request(), 'review-manual-answer-two'));
    expect(session.state().record?.events).toEqual(priorEvents);
    expect(session.state().record?.derived).toEqual(priorDerived);
    value(await session.setMode('synthetic-policy', 'review-policy-resume'));
    expect(session.state().record?.events).toHaveLength(1);
    expect(
      session.state().adaptation?.receipts.map((receipt) => receipt.id),
    ).toEqual(['SYNTHETIC-review-policy-answer']);
  });

  it('exploratory answers leave persisted state and transaction counts unchanged', async () => {
    const underlying = currentRepository();
    let writes = 0;
    const counted: AtomicRecordRepository<SyntheticLoopRecord> = {
      ...underlying,
      execute: (command) => {
        writes += 1;
        return underlying.execute(command);
      },
    };
    const session = createSyntheticLoopSession(counted);
    value(await session.selectProfile(player1, 'review-explore-create'));
    value(await session.setMode('synthetic-policy', 'review-explore-mode'));
    const prior = session.state().record;
    const priorWrites = writes;
    for (let index = 0; index < 70; index += 1) {
      value(
        await session.submit(
          { ...request(), playMode: index % 2 ? 'numberLab' : 'exploration' },
          `review-explore-${index}`,
        ),
      );
    }
    expect(writes).toBe(priorWrites);
    expect(session.state().record).toBe(prior);
    expect(session.state().explorationCount).toBe(64);
    value(await session.endSession('review-explore-stop'));
    expect(session.state().explorationCount).toBe(0);
    expect(session.state().sessionOnlyCompletion).toBeNull();
    expect(
      session
        .state()
        .record?.events.every((event) => event.kind === 'checkpoint'),
    ).toBe(true);
  });

  it('a malformed successful adapter receipt cannot manufacture saved success', async () => {
    const repository = currentRepository();
    const altered: AtomicRecordRepository<SyntheticLoopRecord> = {
      ...repository,
      execute: async (command) => {
        const result = await repository.execute(command);
        return result.ok && command.operationId === 'review-bad-receipt'
          ? applicationSuccess({
              ...result.value,
              revision: value(revision(result.value.revision + 1)),
            })
          : result;
      },
    };
    const session = createSyntheticLoopSession(altered);
    value(await session.selectProfile(player1, 'review-receipt-create'));
    expect(await session.submit(request(), 'review-bad-receipt')).toEqual(
      applicationFailure('invalid_receipt'),
    );
    expect(session.state().saved).toBe(false);
    expect(session.state().uncertain).toBe(true);
    expect(session.state().readOnly).toBe(true);
    value(await session.retryPending());
    expect(session.state().saved).toBe(true);
    expect(session.state().record?.completedCount).toBe(1);
  });

  it('global epoch conflicts precede an old exact success receipt', async () => {
    const repository = currentRepository();
    const first = createSyntheticLoopSession(repository);
    value(await first.selectProfile(player1, 'review-fence-create-one'));
    value(await first.submit(request(), 'review-fence-answer'));
    const other = createSyntheticLoopSession(repository);
    value(await other.selectProfile(player2, 'review-fence-create-two'));
    value(await other.deleteProfile('review-fence-delete-two'));
    expect(await first.submit(request(), 'review-fence-answer')).toEqual(
      applicationFailure('epoch_conflict'),
    );
    expect(first.state().saved).toBe(false);
    expect(await first.updateReadiness()).toBe(false);
    value(await first.reload());
    expect(first.state().snapshot?.storageEpoch).toBe(1);
    expect(first.state().record?.completedCount).toBe(1);
  });

  it('a survivor with an old-epoch prepared command stays fenced but can be explicitly deleted', async () => {
    const underlying = currentRepository();
    const interrupted: AtomicRecordRepository<SyntheticLoopRecord> = {
      ...underlying,
      execute: (command) =>
        command.operationId === 'review-survivor-answer'
          ? Promise.resolve(applicationFailure('storage_unavailable'))
          : underlying.execute(command),
    };
    const original = createSyntheticLoopSession(interrupted);
    value(await original.selectProfile(player1, 'review-survivor-create-one'));
    expect(await original.submit(request(), 'review-survivor-answer')).toEqual(
      applicationFailure('storage_unavailable'),
    );
    const other = createSyntheticLoopSession(underlying);
    value(await other.selectProfile(player2, 'review-survivor-create-two'));
    value(await other.deleteProfile('review-survivor-delete-two'));
    const resumed = createSyntheticLoopSession(underlying);
    expect(await resumed.selectProfile(player1)).toEqual(
      applicationFailure('epoch_conflict'),
    );
    expect(resumed.state().snapshot?.storageEpoch).toBe(1);
    expect(resumed.state().record?.pending?.storageEpoch).toBe(0);
    expect(resumed.state().readOnly).toBe(true);
    expect(await resumed.retryPending()).toEqual(
      applicationFailure('epoch_conflict'),
    );
    expect(resumed.state().record?.completedCount).toBe(0);
    value(await resumed.deleteProfile('review-survivor-explicit-delete'));
    expect(
      await underlying.load(value(syntheticLoopRecordId(player1))),
    ).toEqual(applicationFailure('record_not_found'));
  });
});
