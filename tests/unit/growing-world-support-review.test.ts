import { describe, expect, it } from 'vitest';
import { applicationFailure } from '../../src/application/core/result';
import {
  operationId,
  revision,
  storageEpoch,
} from '../../src/application/core/integrity';
import { COMMAND_VERSION } from '../../src/application/ports/repository';
import { commandFingerprint } from '../../src/application/repository/validation';
import { createChapterTask } from '../../src/application/growing-world';
import {
  createSyntheticLoopSession,
  deriveSyntheticLoop,
  enterGrowingWorld,
  growingJourneyForRecord,
  initialSyntheticLoop,
  legacySyntheticLoopCodec,
  prepareSyntheticLoopAnswer,
  syntheticLoopCodec,
  syntheticLoopRecordId,
  SYNTHETIC_LOOP_CATALOG,
} from '../../src/application/synthetic-loop';
import type {
  LoopAnswerRequest,
  SyntheticLoopRecord,
} from '../../src/application/synthetic-loop';
import { chapterEvidence } from '../../src/domain/growing-world/content';
import {
  CHAPTER_SUPPORT_LIMIT,
  chapterSupportCase,
  chapterSupportFromInput,
  chapterSupportTier,
  rememberChapterSupport,
} from '../../src/domain/growing-world/support';
import {
  createProofReplay,
  generateProof,
} from '../../src/domain/families/proofs';
import {
  CANONICAL_LIMITS,
  canonicalize,
} from '../../src/domain/replay/canonical';
import { createSyntheticRepository } from '../fakes/synthetic-repository';

function value<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string } },
): T {
  if (!result.ok)
    throw new Error(`Synthetic support review: ${result.error.code}`);
  return result.value;
}
const seed = '00000001000000020000000300000004';
function seedAt(index: number): string {
  return [
    0x12345678 ^ index,
    Math.imul(index + 1, 0x9e3779b9),
    0x76543210 ^ index,
    Math.imul(index + 3, 0x85ebca6b),
  ]
    .map((word) => (word >>> 0).toString(16).padStart(8, '0'))
    .join('');
}
function request(): LoopAnswerRequest {
  const chapter = value(createChapterTask('number.make-ten', seed));
  if (chapter.task.kind !== 'makeTen') throw new Error('Synthetic task kind');
  return {
    replay: chapter.replay,
    answer: {
      kind: 'exactValue',
      value: {
        schema: 'rational-v1',
        numerator: String(10 - chapter.task.first),
        denominator: '1',
      },
    },
    mathematicalHintTier: 0,
    meaningfulAttempts: 1,
    solutionExposed: false,
    accessibilitySupports: [],
    accessible: true,
    playMode: 'practice',
    coarseDay: 100,
    clockCertain: false,
    revisit: false,
  };
}
function historicalRequest(taskSeed = seed): LoopAnswerRequest {
  const replay = value(createProofReplay('number.addition', taskSeed));
  const instance = value(generateProof(replay));
  if (instance.answerContract.kind !== 'exactValue')
    throw new Error('Synthetic contract kind');
  return {
    ...request(),
    replay,
    answer: { kind: 'exactValue', value: instance.answerContract.expected },
  };
}
async function start(
  session: ReturnType<typeof createSyntheticLoopSession>,
  prefix: string,
) {
  value(await session.selectProfile('SYNTHETIC-PLAYER-1', `${prefix}-create`));
  value(await session.setMode('synthetic-policy', `${prefix}-mode`));
  value(await session.setActivity('number.make-ten', `${prefix}-chapter`));
}
function record(): SyntheticLoopRecord {
  return value(
    syntheticLoopCodec.decode({
      ...enterGrowingWorld(initialSyntheticLoop('SYNTHETIC-PLAYER-1')),
      mode: 'synthetic-policy',
      selectedFamily: 'number.make-ten',
    }),
  );
}
function allSupport() {
  const entries: unknown[] = [];
  const add = (familyId: string, fingerprint: string) =>
    entries.push({ familyId, fingerprint, maxHintTier: 3 });
  for (let first = 6; first <= 9; first++)
    add('number.make-ten', `make-ten:${first}`);
  for (let total = 11; total <= 20; total++)
    for (let known = 1; known < total; known++)
      add('number.part-whole', `missing-part:${known}:${total}`);
  for (let a = 2; a <= 5; a++)
    for (let b = a; b <= 5; b++) {
      add('groups.equal', `equal-groups:${a}:${b}`);
      add('measurement.array-area', `array-area:${a}:${b}`);
    }
  for (let groups = 2; groups <= 5; groups++)
    for (let each = 2; each <= 5; each++)
      add('groups.missing', `missing-group:${groups}:${groups * each}`);
  for (let side = 1; side <= 6; side++)
    add('powers.square-side', `square-side:${side * side}`);
  for (const scope of SYNTHETIC_LOOP_CATALOG.scopes)
    for (const item of scope.cases) add(item.familyId, item.fingerprint);
  return value(chapterSupportFromInput(entries));
}

let fullLegacyFixture: SyntheticLoopRecord | undefined;
function fullLegacyRecord(): SyntheticLoopRecord {
  if (fullLegacyFixture) return fullLegacyFixture;
  const initial = value(
    syntheticLoopCodec.decode({
      ...initialSyntheticLoop('SYNTHETIC-PLAYER-1'),
      mode: 'synthetic-policy',
    }),
  );
  const source = value(
    prepareSyntheticLoopAnswer(
      initial,
      historicalRequest(),
      'support-full-old',
      2,
      0,
    ),
  );
  if (source.kind !== 'pending' || !source.pending.observation)
    throw new Error('Expected historical source');
  const item = source.pending.observation;
  const events = Array.from({ length: 64 }, (_, index) => ({
    ...item,
    input: { ...item.input, id: `SYNTHETIC-support-full-old-${index}` },
  }));
  fullLegacyFixture = value(
    syntheticLoopCodec.decode({
      ...initial,
      events,
      derived: value(deriveSyntheticLoop(initial.profileId, events)).derived,
      completedCount: 64,
      taskOrdinal: 64,
    }),
  );
  return fullLegacyFixture;
}

describe('Independent saved mathematical-support boundary review', () => {
  it('accepts the finite known semantic contexts and rejects free-form, duplicate, unbounded or non-help entries', () => {
    const contexts = allSupport();
    expect(contexts.length).toBeGreaterThan(191);
    expect(contexts.length).toBeLessThanOrEqual(CHAPTER_SUPPORT_LIMIT);
    const one = contexts[0];
    if (!one) throw new Error('Missing context fixture');
    for (const malformed of [
      [{ ...one, maxHintTier: 0 }],
      [{ ...one, maxHintTier: 4 }],
      [{ ...one, fingerprint: 'private-free-text' }],
      [{ ...one, rawAnswer: 'SYNTHETIC-FORBIDDEN' }],
      [{ ...one, sessionOrdinal: 1 }],
      [one, one],
      Array.from({ length: CHAPTER_SUPPORT_LIMIT + 1 }, () => one),
    ])
      expect(chapterSupportFromInput(malformed).ok).toBe(false);
    expect(
      legacySyntheticLoopCodec.decode({
        ...initialSyntheticLoop('SYNTHETIC-PLAYER-1'),
        chapterSupport: [],
      }).ok,
    ).toBe(false);
  });

  it('keys help by semantic relationship across new seeds and representations, and never lowers a requested tier', () => {
    const initial = request().replay;
    const evidence = value(chapterEvidence(initial));
    let alternate: LoopAnswerRequest['replay'] | undefined;
    for (let index = 1; index <= 512 && !alternate; index++) {
      const candidate = value(
        createChapterTask('number.make-ten', seedAt(index)),
      );
      const next = value(chapterEvidence(candidate.replay));
      if (
        next.fingerprint === evidence.fingerprint &&
        next.representation !== evidence.representation
      )
        alternate = candidate.replay;
    }
    expect(alternate).toBeDefined();
    const remembered = value(rememberChapterSupport([], initial, 3));
    expect(chapterSupportTier(remembered, alternate)).toBe(3);
    expect(value(rememberChapterSupport(remembered, alternate, 1))).toEqual(
      remembered,
    );
    expect(
      chapterSupportCase({ ...initial, generatorVersion: 'forged' }).ok,
    ).toBe(false);
  });

  it('saves help without creating assessment evidence, and restores it across badge, activity and reopen boundaries', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    const session = createSyntheticLoopSession(repository);
    await start(session, 'support-retain');
    const before = session.state().record;
    value(
      await session.requestChapterSupport(
        request().replay,
        3,
        'support-retain-help',
      ),
    );
    expect(session.state().record?.completedCount).toBe(0);
    expect(session.state().record?.events).toEqual(before?.events);
    expect(
      value(
        growingJourneyForRecord(session.state().record as SyntheticLoopRecord),
      ).assessmentCount,
    ).toBe(0);
    value(await session.setActivity('groups.equal', 'support-retain-other'));
    value(
      await session.setActivity('number.make-ten', 'support-retain-return'),
    );
    expect(session.chapterHintTier(request().replay)).toBe(3);
    value(
      await session.selectProfile(
        'SYNTHETIC-PLAYER-2',
        'support-retain-second',
      ),
    );
    expect(session.chapterHintTier(request().replay)).toBe(0);
    value(await session.selectProfile('SYNTHETIC-PLAYER-1'));
    expect(session.chapterHintTier(request().replay)).toBe(3);
    const reopened = createSyntheticLoopSession(repository);
    value(await reopened.selectProfile('SYNTHETIC-PLAYER-1'));
    expect(reopened.chapterHintTier(request().replay)).toBe(3);
    value(await reopened.submit(request(), 'support-retain-answer'));
    const current = reopened.state().record;
    if (current?.schema !== 'growing-world-synthetic-loop-v2')
      throw new Error('Expected v2');
    expect(current.chapterEvents[0]).toMatchObject({
      mathematicalHintTier: 3,
      solutionExposed: true,
    });
    expect(
      value(growingJourneyForRecord(current)).classifications[0]?.reason,
    ).toBe('solutionExposed');
  });

  it('retains original-family tier-three mathematical support without inventing worked-solution exposure', async () => {
    const session = createSyntheticLoopSession(null);
    value(await session.selectProfile('SYNTHETIC-PLAYER-1'));
    value(await session.setMode('synthetic-policy', 'support-legacy-mode'));
    const original = historicalRequest();
    let earlier = historicalRequest(seedAt(1));
    for (
      let index = 2;
      value(chapterSupportCase(earlier.replay)).fingerprint ===
        value(chapterSupportCase(original.replay)).fingerprint && index <= 50;
      index++
    )
      earlier = historicalRequest(seedAt(index));
    expect(value(chapterSupportCase(earlier.replay)).fingerprint).not.toBe(
      value(chapterSupportCase(original.replay)).fingerprint,
    );
    value(
      await session.submit(
        { ...earlier, mathematicalHintTier: 3 },
        'support-legacy-original',
      ),
    );
    const historical = session.state().record?.events;
    value(
      await session.requestChapterSupport(
        original.replay,
        3,
        'support-legacy-help',
      ),
    );
    expect(session.state().record?.schema).toBe(
      'growing-world-synthetic-loop-v2',
    );
    expect(session.state().record?.events).toEqual(historical);
    value(await session.setActivity('number.addition', 'support-legacy-next'));
    value(await session.submit(original, 'support-legacy-after-help'));
    expect(session.state().record?.lastCompletion).toMatchObject({
      evidence: 'supportedSuccess',
      reasonCode: 'mathematicalSupport',
    });
    const latest = session.state().record?.events.at(-1);
    expect(latest?.kind === 'observation' && latest.input.solutionExposed).toBe(
      false,
    );
  });

  it('refuses prepared chapter or legacy pending payloads that understate saved help', () => {
    const base = record();
    const prepared = value(
      prepareSyntheticLoopAnswer(base, request(), 'support-forged', 4, 0),
    );
    if (prepared.kind !== 'pending') throw new Error('Expected pending');
    const chapterSupport = value(
      rememberChapterSupport([], request().replay, 3),
    );
    expect(
      syntheticLoopCodec.decode({
        ...base,
        chapterSupport,
        pending: prepared.pending,
      }).ok,
    ).toBe(false);
    const helped = value(
      prepareSyntheticLoopAnswer(
        value(syntheticLoopCodec.decode({ ...base, chapterSupport })),
        request(),
        'support-honest',
        4,
        0,
      ),
    );
    if (helped.kind !== 'pending' || !helped.pending.chapterObservation)
      throw new Error('Expected helped pending');
    expect(helped.pending.chapterObservation).toMatchObject({
      mathematicalHintTier: 3,
      solutionExposed: true,
    });
    expect(
      syntheticLoopCodec.decode({
        ...base,
        chapterSupport,
        pending: {
          ...helped.pending,
          chapterObservation: {
            ...helped.pending.chapterObservation,
            solutionExposed: false,
          },
        },
      }).ok,
    ).toBe(false);
    const old = historicalRequest();
    const legacy = value(
      syntheticLoopCodec.decode({ ...base, selectedFamily: 'number.addition' }),
    );
    const oldPending = value(
      prepareSyntheticLoopAnswer(legacy, old, 'support-old-forged', 4, 0),
    );
    if (oldPending.kind !== 'pending')
      throw new Error('Expected historical pending');
    expect(
      syntheticLoopCodec.decode({
        ...legacy,
        chapterSupport: value(rememberChapterSupport([], old.replay, 2)),
        pending: oldPending.pending,
      }).ok,
    ).toBe(false);
    expect(
      syntheticLoopCodec.decode({
        ...legacy,
        selectedFamily: 'geometry.quadrilateral',
        chapterSupport: value(rememberChapterSupport([], old.replay, 2)),
        pending: oldPending.pending,
      }).ok,
    ).toBe(false);
  });

  it('keeps an aborted help write unavailable and recovers a committed help write whose response was lost', async () => {
    for (const committed of [false, true]) {
      const repository = value(createSyntheticRepository(syntheticLoopCodec));
      const session = createSyntheticLoopSession({
        ...repository,
        execute: async (command) => {
          if (command.operationId !== 'support-lost-help')
            return repository.execute(command);
          if (committed) value(await repository.execute(command));
          return applicationFailure('storage_unavailable');
        },
      });
      await start(session, `support-lost-${String(committed)}`);
      expect(
        (
          await session.requestChapterSupport(
            request().replay,
            3,
            'support-lost-help',
          )
        ).ok,
      ).toBe(false);
      expect(session.chapterHintTier(request().replay)).toBe(0);
      expect(session.state().readOnly).toBe(true);
      const reopened = createSyntheticLoopSession(repository);
      value(await reopened.selectProfile('SYNTHETIC-PLAYER-1'));
      expect(reopened.chapterHintTier(request().replay)).toBe(
        committed ? 3 : 0,
      );
      expect(reopened.state().record?.completedCount).toBe(0);
      expect(
        value(
          growingJourneyForRecord(
            reopened.state().record as SyntheticLoopRecord,
          ),
        ).assessmentCount,
      ).toBe(0);
    }
  });

  it('cannot apply a former badge help result to the newly selected badge', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    let release: (() => void) | undefined, reached: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const session = createSyntheticLoopSession({
      ...repository,
      execute: async (command) => {
        if (command.operationId === 'support-switch-help') {
          reached?.();
          await held;
        }
        return repository.execute(command);
      },
    });
    await start(session, 'support-switch');
    const saving = session.requestChapterSupport(
      request().replay,
      3,
      'support-switch-help',
    );
    await ready;
    value(
      await session.selectProfile(
        'SYNTHETIC-PLAYER-2',
        'support-switch-second',
      ),
    );
    release?.();
    expect((await saving).ok).toBe(false);
    expect(session.state().record?.profileId).toBe('SYNTHETIC-PLAYER-2');
    expect(session.chapterHintTier(request().replay)).toBe(0);
    value(await session.selectProfile('SYNTHETIC-PLAYER-1'));
    expect(session.chapterHintTier(request().replay)).toBe(3);
  });

  it('cannot save stale help across deletion of the other profile', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    let release: (() => void) | undefined, reached: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const session = createSyntheticLoopSession({
      ...repository,
      execute: async (command) => {
        if (command.operationId === 'support-delete-help') {
          reached?.();
          await held;
        }
        return repository.execute(command);
      },
    });
    await start(session, 'support-delete');
    const other = createSyntheticLoopSession(repository);
    value(
      await other.selectProfile('SYNTHETIC-PLAYER-2', 'support-delete-second'),
    );
    const saving = session.requestChapterSupport(
      request().replay,
      3,
      'support-delete-help',
    );
    await ready;
    value(await other.deleteProfile('support-delete-other'));
    release?.();
    expect(await saving).toMatchObject({
      ok: false,
      error: { code: 'epoch_conflict' },
    });
    const loaded = value(
      await repository.load(value(syntheticLoopRecordId('SYNTHETIC-PLAYER-1'))),
    );
    expect(
      loaded.payload.schema === 'growing-world-synthetic-loop-v2' &&
        loaded.payload.chapterSupport,
    ).toEqual([]);
  });

  it('clears support only at an explicit new session while preserving historical observations', async () => {
    const session = createSyntheticLoopSession(null);
    await start(session, 'support-session');
    value(
      await session.requestChapterSupport(
        request().replay,
        2,
        'support-session-help',
      ),
    );
    value(await session.submit(request(), 'support-session-first'));
    value(await session.endSession('support-session-end'));
    expect(session.chapterHintTier(request().replay)).toBe(2);
    const historical = session.state().record;
    if (historical?.schema !== 'growing-world-synthetic-loop-v2')
      throw new Error('Expected historical v2');
    value(await session.startSession('support-session-new'));
    expect(session.chapterHintTier(request().replay)).toBe(0);
    const restarted = session.state().record;
    if (restarted?.schema !== 'growing-world-synthetic-loop-v2')
      throw new Error('Expected restarted v2');
    expect(restarted.chapterEvents).toEqual(historical.chapterEvents);
    value(await session.submit(request(), 'support-session-independent'));
    const latest = session.state().record;
    if (latest?.schema !== 'growing-world-synthetic-loop-v2')
      throw new Error('Expected v2');
    expect(latest.chapterEvents[0]?.mathematicalHintTier).toBe(2);
    expect(latest.chapterEvents[1]?.mathematicalHintTier).toBe(0);
  });

  it.each([false, true])(
    'permits explicit Stop and a fresh support context after a full legacy journal, preserving frozen v1 history (upgraded=%s)',
    async (upgraded) => {
      const historical = fullLegacyRecord();
      const payload = upgraded
        ? value(
            syntheticLoopCodec.decode({
              ...enterGrowingWorld(historical),
              chapterSupport: value(
                rememberChapterSupport([], historicalRequest().replay, 3),
              ),
            }),
          )
        : historical;
      const repository = value(
        createSyntheticRepository(syntheticLoopCodec, {
          epoch: value(storageEpoch(0)),
          records: [
            {
              recordId: value(syntheticLoopRecordId('SYNTHETIC-PLAYER-1')),
              revision: value(revision(1)),
              storageEpoch: value(storageEpoch(0)),
              payload,
            },
          ],
        }),
      );
      const session = createSyntheticLoopSession(repository);
      value(await session.selectProfile('SYNTHETIC-PLAYER-1'));
      value(
        await session.submit(
          historicalRequest(),
          `support-full-unscored-${String(upgraded)}`,
        ),
      );
      expect(session.state().record).toEqual(payload);
      expect(session.state().snapshot?.revision).toBe(1);
      expect(session.state().sessionOnlyCompletion?.evidence).toBe(
        'sessionOnly',
      );
      value(await session.endSession(`support-full-end-${String(upgraded)}`));
      expect(session.state().record?.schema).toBe(
        'growing-world-synthetic-loop-v2',
      );
      expect(session.state().record?.sessionActive).toBe(false);
      expect(session.state().record?.events).toEqual(historical.events);
      expect(session.state().record?.derived).toEqual(historical.derived);
      value(await session.startSession(`support-full-new-${String(upgraded)}`));
      expect(session.state().record?.sessionOrdinal).toBe(2);
      expect(session.state().record?.taskOrdinal).toBe(65);
      expect(session.chapterHintTier(historicalRequest().replay)).toBe(0);
      expect(session.state().record?.events).toEqual(historical.events);
      expect(session.state().record?.derived).toEqual(historical.derived);
    },
  );

  it('round-trips all finite support contexts beside full64+72 journals within unchanged canonical and command bounds', () => {
    const initial = record();
    const old = value(
      prepareSyntheticLoopAnswer(
        initial,
        historicalRequest(),
        'support-capacity-old',
        4,
        0,
      ),
    );
    const chapter = value(
      prepareSyntheticLoopAnswer(
        initial,
        request(),
        'support-capacity-chapter',
        4,
        0,
      ),
    );
    if (
      old.kind !== 'pending' ||
      !old.pending.observation ||
      chapter.kind !== 'pending' ||
      !chapter.pending.chapterObservation
    )
      throw new Error('Expected capacity source');
    const sourceOld = old.pending.observation,
      sourceChapter = chapter.pending.chapterObservation;
    const events = Array.from({ length: 64 }, (_, index) => ({
      ...sourceOld,
      input: {
        ...sourceOld.input,
        id: `SYNTHETIC-support-capacity-old-${index}`,
      },
    }));
    const chapterEvents = Array.from({ length: 72 }, (_, index) => ({
      ...sourceChapter,
      id: `SYNTHETIC-support-capacity-chapter-${index}`,
    }));
    const combined = value(
      syntheticLoopCodec.decode({
        ...initial,
        events,
        chapterEvents,
        chapterSupport: allSupport(),
        derived: value(deriveSyntheticLoop(initial.profileId, events)).derived,
        completedCount: 136,
        taskOrdinal: 136,
      }),
    );
    expect(combined.events).toEqual(events);
    const text = value(canonicalize(combined));
    expect(
      value(
        canonicalize(
          value(syntheticLoopCodec.decode(JSON.parse(text) as unknown)),
        ),
      ),
    ).toBe(text);
    const fingerprint = value(
      commandFingerprint(
        {
          version: COMMAND_VERSION,
          recordSchema: syntheticLoopCodec.schema,
          kind: 'update',
          operationId: value(operationId('support-capacity-command')),
          recordId: value(syntheticLoopRecordId('SYNTHETIC-PLAYER-1')),
          expectedRevision: value(revision(1)),
          storageEpoch: value(storageEpoch(0)),
          payload: combined,
        },
        syntheticLoopCodec,
      ),
    );
    expect(text.length).toBeLessThan(CANONICAL_LIMITS.output);
    expect(fingerprint.length).toBeLessThan(CANONICAL_LIMITS.output);
  });
});
