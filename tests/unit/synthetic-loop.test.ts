import { describe, expect, it } from 'vitest';
import { applicationFailure } from '../../src/application/core/result';
import {
  createSyntheticLoopSession,
  deriveSyntheticLoop,
  initialSyntheticLoop,
  syntheticLoopCodec,
  syntheticLoopRecordId,
  prepareSyntheticLoopAnswer,
} from '../../src/application/synthetic-loop';
import { completePendingSyntheticLoop } from '../../src/application/synthetic-loop/record';
import type {
  LoopAnswerRequest,
  SyntheticLoopRecord,
} from '../../src/application/synthetic-loop';
import type {
  AtomicRecordRepository,
  RepositoryCommand,
} from '../../src/application/ports/repository';
import { createProofReplay } from '../../src/domain/families/proofs';
import { createSliceReplay } from '../../src/domain/families/slice';
import { canonicalize } from '../../src/domain/replay/canonical';
import { createSyntheticRepository } from '../fakes/synthetic-repository';

const seed = '00000001000000020000000300000004';
const player1 = 'SYNTHETIC-PLAYER-1';
const player2 = 'SYNTHETIC-PLAYER-2';

function value<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string } },
): T {
  if (!result.ok) throw new Error(`Synthetic test: ${result.error.code}`);
  return result.value;
}

function request(correct = true): LoopAnswerRequest {
  return {
    replay: value(createProofReplay('number.addition', seed)),
    answer: {
      kind: 'exactValue',
      value: {
        schema: 'rational-v1',
        numerator: correct ? '0' : '1',
        denominator: '1',
      },
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

function repository() {
  return value(createSyntheticRepository(syntheticLoopCodec));
}

async function selected(repo = repository()) {
  const session = createSyntheticLoopSession(repo);
  value(await session.selectProfile(player1, 'create-one'));
  return { session, repo };
}

describe('Synthetic loop atomic application integration', () => {
  it('regenerates correct/incorrect truth and manual play never creates evidence or recommendation', async () => {
    const { session } = await selected();
    value(await session.submit(request(false), 'answer-wrong'));
    expect(session.state().saved).toBe(true);
    expect(session.state().record?.lastCompletion).toEqual({
      operationId: 'answer-wrong',
      correct: false,
      evidence: 'manual',
      reasonCode: null,
    });
    expect(session.state().record?.events).toEqual([]);
    expect(session.state().record?.derived.recommendation).toBeNull();
    expect(session.state().adaptation?.concepts).toEqual({});
    value(await session.setMode('synthetic-policy', 'mode-policy'));
    expect(session.state().record?.events).toEqual([]);
    value(await session.submit(request(), 'answer-policy'));
    expect(session.state().record?.lastCompletion?.evidence).toBe(
      'independentSuccess',
    );
    expect(session.state().adaptation?.nextOrdinal).toBe(2);
    expect(session.state().record?.derived.recommendation?.policyVersion).toBe(
      'phase3b-synthetic-policy-v1',
    );
  });

  it('does not show saved success before both journal and terminal transactions complete', async () => {
    const underlying = repository();
    let releaseStage: (() => void) | undefined;
    let releaseFinal: (() => void) | undefined;
    const repo: AtomicRecordRepository<SyntheticLoopRecord> = {
      ...underlying,
      execute: (command) => {
        if (
          command.operationId !== 'answer-pending' &&
          command.operationId !== 'answer'
        )
          return underlying.execute(command);
        return new Promise((resolve) => {
          const release = () => {
            void underlying.execute(command).then(resolve);
          };
          if (command.operationId === 'answer-pending') releaseStage = release;
          else releaseFinal = release;
        });
      },
    };
    const { session } = await selected(repo);
    value(await session.setMode('synthetic-policy', 'mode'));
    const pending = session.submit(request(), 'answer');
    expect(session.state().busy).toBe(true);
    expect(session.state().saved).toBe(false);
    expect(session.state().record?.completedCount).toBe(0);
    expect(session.state().record?.events).toEqual([]);
    expect(session.isUpdateReady()).toBe(false);
    if (!releaseStage) throw new Error('Journal was not queued');
    releaseStage();
    for (let pass = 0; pass < 10 && !releaseFinal; pass += 1)
      await Promise.resolve();
    expect(session.state().record?.pending?.operationId).toBe('answer');
    expect(session.state().record?.completedCount).toBe(0);
    expect(session.state().saved).toBe(false);
    expect(session.state().adaptation?.concepts).toEqual({});
    if (!releaseFinal) throw new Error('Terminal command was not queued');
    releaseFinal();
    value(await pending);
    expect(session.state().saved).toBe(true);
    expect(session.state().record?.pending).toBeNull();
    expect(session.state().record?.completedCount).toBe(1);
  });

  it('exact retry returns one logical completion and changed retry refuses', async () => {
    const { session } = await selected();
    value(await session.setMode('synthetic-policy', 'mode'));
    value(await session.submit(request(), 'answer'));
    const revision = session.state().snapshot?.revision;
    value(await session.submit(request(), 'answer'));
    expect(session.state().snapshot?.revision).toBe(revision);
    expect(session.state().record?.completedCount).toBe(1);
    expect(session.state().record?.events).toHaveLength(1);
    expect(await session.submit(request(false), 'answer')).toEqual({
      ok: false,
      error: { code: 'operation_conflict' },
    });
    expect(session.state().record?.completedCount).toBe(1);
  });

  it('reload reconciles an uncertain committed terminal response without duplicate evidence', async () => {
    const underlying = repository();
    let loseResponse = true;
    const repo: AtomicRecordRepository<SyntheticLoopRecord> = {
      ...underlying,
      execute: async (command) => {
        const result = await underlying.execute(command);
        return command.operationId === 'answer' && loseResponse
          ? applicationFailure('storage_unavailable')
          : result;
      },
    };
    const { session } = await selected(repo);
    value(await session.setMode('synthetic-policy', 'mode'));
    expect((await session.submit(request(), 'answer')).ok).toBe(false);
    expect(session.state().saved).toBe(false);
    expect(session.state().uncertain).toBe(true);
    expect(session.state().record?.pending?.operationId).toBe('answer');
    loseResponse = false;
    value(await session.retryPending());
    expect(session.state().saved).toBe(true);
    expect(session.state().record?.completedCount).toBe(1);
    expect(session.state().record?.events).toHaveLength(1);
    const restarted = createSyntheticLoopSession(underlying);
    value(await restarted.selectProfile(player1));
    expect(restarted.state().record?.completedCount).toBe(1);
    expect(restarted.state().record?.sessionOrdinal).toBe(1);
    expect(restarted.state().record?.pending).toBeNull();
  });

  it('durable aborted pending command resumes only on explicit retry and raw answers never enter commands', async () => {
    const underlying = repository();
    const commands: RepositoryCommand<SyntheticLoopRecord>[] = [];
    let abortFinal = true;
    const repo: AtomicRecordRepository<SyntheticLoopRecord> = {
      ...underlying,
      execute: (command) => {
        commands.push(command);
        return command.operationId === 'answer' && abortFinal
          ? Promise.resolve(applicationFailure('quota_exceeded'))
          : underlying.execute(command);
      },
    };
    const { session } = await selected(repo);
    value(await session.setMode('synthetic-policy', 'mode'));
    expect(await session.submit(request(false), 'answer')).toEqual({
      ok: false,
      error: { code: 'quota_exceeded' },
    });
    expect(session.state().record?.completedCount).toBe(0);
    expect(session.state().saved).toBe(false);
    const restarted = createSyntheticLoopSession(repo);
    value(await restarted.selectProfile(player1));
    expect(restarted.state().record?.pending?.correct).toBe(false);
    expect(restarted.state().record?.events).toEqual([]);
    expect(restarted.isUpdateReady()).toBe(false);
    for (const command of commands) {
      const wire = value(canonicalize(command));
      expect(wire).not.toMatch(
        /"answer"\s*:|"replay"\s*:|"numerator"\s*:|"denominator"\s*:/,
      );
    }
    abortFinal = false;
    value(await restarted.retryPending());
    expect(restarted.state().record?.lastCompletion?.evidence).toBe(
      'unsuccessful',
    );
    expect(restarted.state().record?.completedCount).toBe(1);
  });

  it('mathematical help changes classification while neutral accessibility support does not', async () => {
    const first = await selected();
    value(await first.session.setMode('synthetic-policy', 'mode'));
    value(
      await first.session.submit(
        { ...request(), mathematicalHintTier: 1 },
        'hint-answer',
      ),
    );
    expect(first.session.state().record?.lastCompletion?.evidence).toBe(
      'supportedSuccess',
    );
    const second = await selected();
    value(await second.session.setMode('synthetic-policy', 'mode'));
    value(
      await second.session.submit(
        {
          ...request(),
          accessibilitySupports: ['speechReplay', 'screenReader'],
        },
        'accessible-answer',
      ),
    );
    expect(second.session.state().record?.lastCompletion?.evidence).toBe(
      'independentSuccess',
    );
    const inaccessible = await selected();
    value(await inaccessible.session.setMode('synthetic-policy', 'mode'));
    value(
      await inaccessible.session.submit(
        { ...request(), accessible: false },
        'scope-answer',
      ),
    );
    expect(inaccessible.session.state().record?.lastCompletion).toMatchObject({
      evidence: 'excluded',
      reasonCode: 'inaccessibleScope',
    });
    expect(inaccessible.session.state().adaptation?.concepts).toEqual({});
  });

  it('new families report limitedEvidence and exploratory exposure stays session-only', async () => {
    const { session } = await selected();
    value(await session.setMode('synthetic-policy', 'mode'));
    value(
      await session.submit(
        {
          ...request(),
          replay: value(createSliceReplay('number.counting', seed)),
        },
        'new-answer',
      ),
    );
    expect(session.state().record?.lastCompletion?.evidence).toBe(
      'limitedEvidence',
    );
    expect(session.state().record?.events).toEqual([]);
    const before = value(canonicalize(session.state().record));
    value(
      await session.submit({ ...request(), playMode: 'numberLab' }, 'exposure'),
    );
    expect(value(canonicalize(session.state().record))).toBe(before);
    expect(session.state().sessionOnlyCompletion?.evidence).toBe('sessionOnly');
    expect(session.state().explorationCount).toBe(1);
    value(await session.selectProfile(player2, 'create-two'));
    expect(session.state().explorationCount).toBe(0);
    expect(session.state().sessionOnlyCompletion).toBeNull();
    expect(session.state().adaptation?.concepts).toEqual({});
  });

  it('profiles retain independent state and refresh never advances the explicit session ordinal', async () => {
    const { session, repo } = await selected();
    value(
      await session.setPreferences(
        {
          uiLocale: 'el-GR',
          instructionLocale: 'en-GB',
          numberSpeechLocale: 'de-DE',
        },
        'preferences',
      ),
    );
    value(await session.setMode('synthetic-policy', 'mode'));
    value(await session.submit(request(), 'answer-one'));
    value(await session.selectProfile(player2, 'create-two'));
    expect(session.state().record?.mode).toBe('manual');
    expect(session.state().record?.completedCount).toBe(0);
    value(await session.submit(request(false), 'answer-two'));
    value(await session.selectProfile(player1));
    expect(session.state().record?.completedCount).toBe(1);
    expect(session.state().record?.preferences).toEqual({
      uiLocale: 'el-GR',
      instructionLocale: 'en-GB',
      numberSpeechLocale: 'de-DE',
    });
    value(await session.reload());
    expect(session.state().record?.sessionOrdinal).toBe(1);
    value(await session.endSession('end'));
    expect(session.state().record?.sessionActive).toBe(false);
    const restarted = createSyntheticLoopSession(repo);
    value(await restarted.selectProfile(player1));
    expect(restarted.state().record?.sessionOrdinal).toBe(1);
    value(await restarted.startSession('start'));
    expect(restarted.state().record?.sessionOrdinal).toBe(2);
    value(await restarted.reload());
    expect(restarted.state().record?.sessionOrdinal).toBe(2);
  });

  it('profile switch fences obsolete callbacks and never redirects their command to the new profile', async () => {
    const underlying = repository();
    let release: (() => void) | undefined;
    const repo: AtomicRecordRepository<SyntheticLoopRecord> = {
      ...underlying,
      execute: (command) =>
        command.operationId !== 'answer-pending'
          ? underlying.execute(command)
          : new Promise((resolve) => {
              release = () => {
                void underlying.execute(command).then(resolve);
              };
            }),
    };
    const { session } = await selected(repo);
    value(await session.setMode('synthetic-policy', 'mode'));
    const answer = session.submit(request(), 'answer');
    value(await session.selectProfile(player2, 'create-two'));
    expect(session.state().record?.profileId).toBe(player2);
    if (!release) throw new Error('Expected delayed stage');
    release();
    expect(await answer).toEqual({
      ok: false,
      error: { code: 'operation_conflict' },
    });
    expect(session.state().record?.completedCount).toBe(0);
    expect(session.state().record?.profileId).toBe(player2);
    const original = value(
      await underlying.load(value(syntheticLoopRecordId(player1))),
    );
    expect(original.payload.pending?.operationId).toBe('answer');
    expect(original.payload.completedCount).toBe(0);
  });

  it('stale tabs and deletion fences refuse pending writes without resurrecting records', async () => {
    const { session, repo } = await selected();
    const stale = createSyntheticLoopSession(repo);
    value(await stale.selectProfile(player1));
    value(await session.setMode('synthetic-policy', 'mode'));
    expect((await stale.submit(request(), 'stale-answer')).ok).toBe(false);
    expect(stale.state().saved).toBe(false);
    value(await session.deleteProfile('delete'));
    const resumed = createSyntheticLoopSession(repo);
    expect(await resumed.selectProfile(player1)).toEqual({
      ok: false,
      error: { code: 'record_not_found' },
    });
    expect((await stale.reload()).ok).toBe(false);
    expect(stale.isUpdateReady()).toBe(false);
  });

  it('delete while the terminal answer is pending fences it and preserves the survivor', async () => {
    const underlying = repository();
    let release: (() => void) | undefined;
    const repo: AtomicRecordRepository<SyntheticLoopRecord> = {
      ...underlying,
      execute: (command) =>
        command.operationId !== 'answer'
          ? underlying.execute(command)
          : new Promise((resolve) => {
              release = () => {
                void underlying.execute(command).then(resolve);
              };
            }),
    };
    const { session } = await selected(repo);
    const survivor = createSyntheticLoopSession(repo);
    value(await survivor.selectProfile(player2, 'create-two'));
    value(await session.setMode('synthetic-policy', 'mode'));
    const pending = session.submit(request(), 'answer');
    for (let pass = 0; pass < 10 && !release; pass += 1)
      await Promise.resolve();
    expect(session.state().record?.pending?.operationId).toBe('answer');
    value(await session.deleteProfile('delete'));
    if (!release) throw new Error('Expected delayed terminal answer');
    release();
    expect(await pending).toEqual({
      ok: false,
      error: { code: 'operation_conflict' },
    });
    expect(session.state().record).toBeNull();
    expect(
      await underlying.load(value(syntheticLoopRecordId(player1))),
    ).toEqual({ ok: false, error: { code: 'record_not_found' } });
    value(await survivor.reload());
    expect(survivor.state().record?.completedCount).toBe(0);
    expect(survivor.state().adaptation?.concepts).toEqual({});
    expect(survivor.state().snapshot?.storageEpoch).toBe(1);
  });

  it('update freeze checks live epoch and revalidated payload, with unknown data refusing readiness', async () => {
    const { session, repo } = await selected();
    session.freeze();
    expect((await session.submit(request(), 'frozen-answer')).ok).toBe(false);
    expect(await session.updateReadiness()).toBe(true);
    session.unfreeze();
    const other = createSyntheticLoopSession(repo);
    value(await other.selectProfile(player2, 'create-two'));
    value(await other.deleteProfile('delete-two'));
    expect(await session.updateReadiness()).toBe(false);
    value(await session.reload());
    expect(await session.updateReadiness()).toBe(true);
    const broken: AtomicRecordRepository<SyntheticLoopRecord> = {
      ...repo,
      getEpoch: () => {
        throw new Error('Synthetic blocked store');
      },
    };
    const unready = createSyntheticLoopSession(broken);
    value(await unready.selectProfile(player1));
    expect(await unready.updateReadiness()).toBe(false);
    expect(unready.state().readOnly).toBe(true);
  });

  it('unavailable repository offers explicit unsaved play and never retries it later', async () => {
    let calls = 0;
    const failed: AtomicRecordRepository<SyntheticLoopRecord> = {
      getEpoch: () =>
        Promise.resolve(applicationFailure('storage_unavailable')),
      load: () => Promise.resolve(applicationFailure('storage_unavailable')),
      execute: () => {
        calls += 1;
        return Promise.resolve(applicationFailure('storage_unavailable'));
      },
    };
    const session = createSyntheticLoopSession(failed);
    expect((await session.selectProfile(player1)).ok).toBe(false);
    value(session.useUnsaved());
    value(await session.submit(request(), 'unsaved-answer'));
    expect(session.state().saved).toBe(false);
    expect(session.state().record?.completedCount).toBe(1);
    expect(calls).toBe(0);
    expect(await session.updateReadiness()).toBe(false);
    expect((await session.reload()).ok).toBe(false);
  });

  it('exact bounded codec rejects forged derived state, raw histories and mutable aliases', () => {
    const record = initialSyntheticLoop(player1);
    const decoded = value(syntheticLoopCodec.decode(record));
    expect(Object.isFrozen(decoded.preferences)).toBe(true);
    expect(Object.isFrozen(decoded.events)).toBe(true);
    expect(
      syntheticLoopCodec.decode({ ...record, rawAnswers: [request().answer] })
        .ok,
    ).toBe(false);
    expect(
      syntheticLoopCodec.decode({ ...record, profileId: 'REAL-PLAYER' }).ok,
    ).toBe(false);
    expect(
      syntheticLoopCodec.decode({
        ...record,
        derived: { ...record.derived, nextOrdinal: 2 },
      }).ok,
    ).toBe(false);
    expect(
      syntheticLoopCodec.decode({
        ...record,
        preferences: { ...record.preferences, uiLocale: 'en-US' },
      }).ok,
    ).toBe(false);
    expect(
      syntheticLoopCodec.decode({ ...record, schema: 'synthetic-learner-v1' })
        .ok,
    ).toBe(false);
  });

  it('bounded wire remains canonical at capacity and refuses further evidence without pruning', () => {
    const initial = value(
      syntheticLoopCodec.decode({
        ...initialSyntheticLoop(player1),
        mode: 'synthetic-policy',
      }),
    );
    const prepared = value(
      prepareSyntheticLoopAnswer(initial, request(), 'answer-0', 1, 0),
    );
    if (prepared.kind !== 'pending' || !prepared.pending.observation)
      throw new Error('Expected prepared observation');
    const observation = prepared.pending.observation;
    const events = Array.from({ length: 64 }, (_, ordinal) => ({
      ...observation,
      input: { ...observation.input, id: `SYNTHETIC-answer-${ordinal}` },
    }));
    const derived = value(deriveSyntheticLoop(player1, events));
    const record = value(
      syntheticLoopCodec.decode({
        ...initial,
        completedCount: 64,
        taskOrdinal: 64,
        events,
        derived: derived.derived,
      }),
    );
    expect(record.events).toHaveLength(64);
    expect(value(canonicalize(record)).length).toBeLessThan(262_144);
    expect(
      value(deriveSyntheticLoop(player1, record.events)).snapshot.receipts,
    ).toHaveLength(64);
    const overflow = value(
      prepareSyntheticLoopAnswer(record, request(), 'answer-overflow', 1, 0),
    );
    if (overflow.kind !== 'pending')
      throw new Error('Expected pending overflow probe');
    expect(
      syntheticLoopCodec.decode({ ...record, pending: overflow.pending }).ok,
    ).toBe(false);
    expect(record.completedCount).toBe(64);
    expect(record.events).toHaveLength(64);
    const manual = value(
      syntheticLoopCodec.decode({ ...record, mode: 'manual' }),
    );
    const progress = value(
      prepareSyntheticLoopAnswer(manual, request(), 'manual-progress', 1, 0),
    );
    if (progress.kind !== 'pending')
      throw new Error('Expected manual progress');
    const completed = value(
      completePendingSyntheticLoop(
        value(
          syntheticLoopCodec.decode({ ...manual, pending: progress.pending }),
        ),
      ),
    );
    expect(completed.completedCount).toBe(65);
    expect(completed.events).toHaveLength(64);
    expect(completed.lastCompletion?.evidence).toBe('manual');
  });
});
