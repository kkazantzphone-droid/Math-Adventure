import { beforeAll, describe, expect, it } from 'vitest';
import {
  createSyntheticLoopSession,
  enterGrowingWorld,
  growingJourneyForRecord,
  initialSyntheticLoop,
  legacySyntheticLoopCodec,
  prepareSyntheticLoopAnswer,
  syntheticLoopCodec,
  syntheticLoopTaskSeed,
  syntheticLoopRecordId,
} from '../../src/application/synthetic-loop';
import type {
  LoopAnswerRequest,
  SyntheticLoopRecord,
} from '../../src/application/synthetic-loop';
import { applicationFailure } from '../../src/application/core/result';
import {
  CHAPTER_FAMILY_IDS,
  createChapterReplay,
  generateChapter,
  isChapterFamilyId,
} from '../../src/domain/growing-world/content';
import {
  CHAPTER_SUPPORT_LIMIT,
  chapterSupportCase,
  chapterSupportFromInput,
  chapterSupportTier,
  rememberChapterSupport,
} from '../../src/domain/growing-world/support';
import type { SupportFamilyId } from '../../src/domain/growing-world/support';
import {
  createProofReplay,
  generateProof,
  PROOF_FAMILY_IDS,
} from '../../src/domain/families/proofs';
import type { ReplayDescriptor } from '../../src/domain/replay/descriptor';
import { canonicalize } from '../../src/domain/replay/canonical';
import { createSyntheticRepository } from '../fakes/synthetic-repository';
import {
  growingWorldCapacitySupport,
  growingWorldCapacityFixture,
} from '../fixtures/synthetic/growing-world-capacity';
import { revision, storageEpoch } from '../../src/application/core/integrity';

function value<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string } },
): T {
  if (!result.ok)
    throw new Error(`Synthetic support fixture: ${result.error.code}`);
  return result.value;
}

const seed = '00000001000000020000000300000004';
function replay(family: SupportFamilyId): ReplayDescriptor {
  return value(
    isChapterFamilyId(family)
      ? createChapterReplay(family, seed)
      : createProofReplay(family, seed),
  );
}

/** Truth is already tested independently. Here contracts supply correct fixture
 * answers so provenance classification can be checked for every assessed scope. */
function request(descriptor: ReplayDescriptor): LoopAnswerRequest {
  const contract = isChapterFamilyId(descriptor.familyId)
    ? value(generateChapter(descriptor)).answerContract
    : value(generateProof(descriptor)).answerContract;
  const answer =
    contract.kind === 'exactValue'
      ? { kind: 'exactValue' as const, value: contract.expected }
      : contract.kind === 'quantity'
        ? { kind: 'quantity' as const, quantity: contract.expected }
        : contract.kind === 'classification'
          ? {
              kind: 'classification' as const,
              classIds: contract.expectedClassIds,
            }
          : null;
  if (!answer) throw new Error('Unexpected synthetic answer contract');
  return {
    replay: descriptor,
    answer,
    mathematicalHintTier: 0,
    meaningfulAttempts: 1,
    solutionExposed: false,
    accessible: true,
    accessibilitySupports: [],
    playMode: 'practice',
    coarseDay: 100,
    clockCertain: false,
    revisit: false,
  };
}

async function selected(
  session: ReturnType<typeof createSyntheticLoopSession>,
  family: SupportFamilyId,
  prefix: string,
) {
  value(await session.selectProfile('SYNTHETIC-PLAYER-1', `${prefix}-create`));
  value(await session.setMode('synthetic-policy', `${prefix}-mode`));
  value(await session.setActivity(family, `${prefix}-activity`));
}

describe('bounded durable mathematical support context', () => {
  it('accepts every finite known semantic case and rejects malformed, duplicate, extra and oversized support data', () => {
    const all = growingWorldCapacitySupport();
    expect(all.length).toBe(232);
    expect(all.length).toBeLessThanOrEqual(CHAPTER_SUPPORT_LIMIT);
    expect(value(chapterSupportFromInput(all))).toEqual(all);
    const entry = all[0];
    if (!entry) throw new Error('Missing synthetic support entry');
    for (const forged of [
      null,
      {},
      [entry, entry],
      Array.from({ length: 257 }, () => entry),
      [{ ...entry, maxHintTier: 0 }],
      [{ ...entry, maxHintTier: 4 }],
      [{ ...entry, fingerprint: 'SYNTHETIC-UNKNOWN' }],
      [{ ...entry, familyId: 'number.numeral' }],
      [{ ...entry, unexpected: true }],
      [
        {
          familyId: 'number.make-ten',
          fingerprint: 'make-ten:5',
          maxHintTier: 3,
        },
      ],
    ])
      expect(chapterSupportFromInput(forged).ok).toBe(false);
    const legacy = initialSyntheticLoop('SYNTHETIC-PLAYER-1');
    const entered = enterGrowingWorld(legacy);
    expect(
      value(canonicalize(value(legacySyntheticLoopCodec.decode(legacy)))),
    ).toBe(value(canonicalize(legacy)));
    expect(
      legacySyntheticLoopCodec.decode({ ...legacy, chapterSupport: [] }).ok,
    ).toBe(false);
    expect(legacySyntheticLoopCodec.decode(entered).ok).toBe(false);
    const { chapterSupport: omitted, ...without } =
      entered.schema === 'growing-world-synthetic-loop-v2'
        ? entered
        : { ...entered, chapterSupport: [] };
    expect(omitted).toEqual([]);
    expect(syntheticLoopCodec.decode(without).ok).toBe(false);
    expect(
      syntheticLoopCodec.decode({ ...entered, chapterSupport: all }).ok,
    ).toBe(true);
  });

  it('uses semantic identity across seeds and representations and monotonically remembers the highest tier', () => {
    const seen = new Map<
      string,
      { descriptor: ReplayDescriptor; representation: string }
    >();
    let pair: readonly [ReplayDescriptor, ReplayDescriptor] | undefined;
    for (let ordinal = 0; ordinal < 128; ordinal++) {
      const descriptor = value(
        createChapterReplay(
          'number.make-ten',
          value(
            syntheticLoopTaskSeed(
              'SYNTHETIC-PLAYER-1',
              'number.make-ten',
              ordinal,
            ),
          ),
        ),
      );
      const generated = value(generateChapter(descriptor));
      const key = value(chapterSupportCase(descriptor));
      const previous = seen.get(key.fingerprint);
      if (
        previous &&
        previous.representation !== generated.task.representation
      ) {
        pair = [previous.descriptor, descriptor];
        break;
      }
      seen.set(key.fingerprint, {
        descriptor,
        representation: generated.task.representation,
      });
    }
    if (!pair) throw new Error('Synthetic same-case representations missing');
    expect(pair[0].seedHex).not.toBe(pair[1].seedHex);
    let support = value(rememberChapterSupport([], pair[0], 2));
    expect(chapterSupportTier(support, pair[1])).toBe(2);
    support = value(rememberChapterSupport(support, pair[1], 3));
    support = value(rememberChapterSupport(support, pair[0], 1));
    expect(support).toHaveLength(1);
    expect(chapterSupportTier(support, pair[0])).toBe(3);
    expect(
      rememberChapterSupport(
        support,
        { ...pair[0], generatorVersion: 'synthetic-unknown' },
        1,
      ).ok,
    ).toBe(false);
  });

  it('persists unsubmitted help across same-badge reselection, other badges, activity switches and a reopened session without assessment changes', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    const session = createSyntheticLoopSession(repository);
    await selected(session, 'number.make-ten', 'support-preserve');
    const descriptor = replay('number.make-ten');
    const before = session.state().record;
    value(
      await session.requestChapterSupport(
        descriptor,
        3,
        'support-preserve-help',
      ),
    );
    expect(session.chapterHintTier(descriptor)).toBe(3);
    expect(session.state().record).toMatchObject({
      completedCount: before?.completedCount,
      taskOrdinal: before?.taskOrdinal,
      events: before?.events,
      chapterEvents: [],
      derived: before?.derived,
    });
    value(await session.selectProfile('SYNTHETIC-PLAYER-1'));
    expect(session.chapterHintTier(descriptor)).toBe(3);
    value(
      await session.selectProfile('SYNTHETIC-PLAYER-2', 'support-other-create'),
    );
    expect(session.chapterHintTier(descriptor)).toBe(0);
    value(await session.selectProfile('SYNTHETIC-PLAYER-1'));
    value(await session.setActivity('groups.equal', 'support-other-activity'));
    expect(session.chapterHintTier(descriptor)).toBe(3);
    value(
      await session.setActivity('number.make-ten', 'support-return-activity'),
    );
    const reopened = createSyntheticLoopSession(repository);
    value(await reopened.selectProfile('SYNTHETIC-PLAYER-1'));
    expect(reopened.chapterHintTier(descriptor)).toBe(3);
    expect(
      value(
        growingJourneyForRecord(reopened.state().record as SyntheticLoopRecord),
      ).assessmentCount,
    ).toBe(0);
  });

  for (const family of [...CHAPTER_FAMILY_IDS, ...PROOF_FAMILY_IDS])
    it(`${family}: saved tier overrides underreported answer provenance while preserving historical help meaning`, async () => {
      const repository = value(createSyntheticRepository(syntheticLoopCodec));
      const session = createSyntheticLoopSession(repository);
      await selected(session, family, `support-${family}`);
      const descriptor = replay(family);
      value(
        await session.requestChapterSupport(
          descriptor,
          3,
          `support-${family}-help`,
        ),
      );
      value(
        await session.submit(request(descriptor), `support-${family}-answer`),
      );
      const record = session.state().record;
      if (!record || record.schema !== 'growing-world-synthetic-loop-v2')
        throw new Error('Synthetic v2 expected');
      if (isChapterFamilyId(family)) {
        expect(record.chapterEvents[0]).toMatchObject({
          mathematicalHintTier: 3,
          solutionExposed: true,
        });
        expect(
          value(growingJourneyForRecord(record)).classifications[0],
        ).toMatchObject({ outcome: 'excluded', reason: 'solutionExposed' });
      } else {
        expect(record.events[0]).toMatchObject({
          kind: 'observation',
          input: { mathematicalHintTier: 3, solutionExposed: false },
        });
        expect(record.lastCompletion).toMatchObject({
          evidence: 'supportedSuccess',
          reasonCode: 'mathematicalSupport',
        });
      }
    });

  it('stores manual-mode help without evidence and applies it after switching policy mode', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    const session = createSyntheticLoopSession(repository);
    value(
      await session.selectProfile(
        'SYNTHETIC-PLAYER-1',
        'manual-support-create',
      ),
    );
    value(
      await session.requestChapterSupport(
        replay('number.addition'),
        2,
        'manual-support-help',
      ),
    );
    expect(session.state().record).toMatchObject({
      schema: 'growing-world-synthetic-loop-v2',
      completedCount: 0,
      events: [],
      chapterEvents: [],
    });
    value(await session.setMode('synthetic-policy', 'manual-support-policy'));
    value(
      await session.submit(
        request(replay('number.addition')),
        'manual-support-answer',
      ),
    );
    expect(session.state().record?.lastCompletion?.evidence).toBe(
      'supportedSuccess',
    );
  });

  it('clears context only when explicitly starting a new v2 session and advances the replay ordinal without assessment credit', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    const session = createSyntheticLoopSession(repository);
    await selected(session, 'number.make-ten', 'support-new-session');
    const descriptor = replay('number.make-ten');
    value(
      await session.requestChapterSupport(
        descriptor,
        3,
        'support-session-help',
      ),
    );
    const before = session.state().record;
    if (!before) throw new Error('Missing synthetic record');
    value(await session.startSession('support-session-already-active'));
    expect(session.chapterHintTier(descriptor)).toBe(3);
    expect(session.state().record?.taskOrdinal).toBe(before.taskOrdinal);
    value(await session.endSession('support-session-end'));
    expect(session.chapterHintTier(descriptor)).toBe(3);
    value(await session.startSession('support-session-start'));
    const after = session.state().record;
    if (!after) throw new Error('Missing restarted synthetic record');
    expect(after.taskOrdinal).toBe(before.taskOrdinal + 1);
    expect(after.sessionOrdinal).toBe(before.sessionOrdinal + 1);
    expect(after.completedCount).toBe(before.completedCount);
    expect(session.chapterHintTier(descriptor)).toBe(0);
    expect(
      value(
        syntheticLoopTaskSeed(
          after.profileId,
          after.selectedFamily,
          after.taskOrdinal,
        ),
      ),
    ).not.toBe(
      value(
        syntheticLoopTaskSeed(
          before.profileId,
          before.selectedFamily,
          before.taskOrdinal,
        ),
      ),
    );
    expect(value(growingJourneyForRecord(after)).assessmentCount).toBe(0);
    const legacy = createSyntheticLoopSession(null);
    value(await legacy.selectProfile('SYNTHETIC-PLAYER-1'));
    value(await legacy.endSession('legacy-support-end'));
    value(await legacy.startSession('legacy-support-start'));
    expect(legacy.state().record?.taskOrdinal).toBe(0);
    expect(legacy.state().record?.schema).toBe('phase3c-synthetic-loop-v1');
  });

  it('does not expose held or failed support saves and recovers a committed response loss through reload', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    let release: (() => void) | undefined;
    let entered: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const session = createSyntheticLoopSession({
      ...repository,
      execute: async (command) => {
        if (command.operationId === 'support-held') {
          entered?.();
          await hold;
        }
        if (command.operationId === 'support-abort')
          return applicationFailure('storage_unavailable');
        const result = await repository.execute(command);
        return command.operationId === 'support-lost' && result.ok
          ? applicationFailure('storage_unavailable')
          : result;
      },
    });
    await selected(session, 'number.make-ten', 'support-failure');
    const descriptor = replay('number.make-ten');
    const pending = session.requestChapterSupport(
      descriptor,
      1,
      'support-held',
    );
    await ready;
    expect(session.chapterHintTier(descriptor)).toBe(0);
    expect(session.state().busy).toBe(true);
    expect(
      (await session.submit(request(descriptor), 'support-during-held')).ok,
    ).toBe(false);
    release?.();
    value(await pending);
    expect(session.chapterHintTier(descriptor)).toBe(1);
    expect(
      (await session.requestChapterSupport(descriptor, 3, 'support-abort')).ok,
    ).toBe(false);
    expect(session.chapterHintTier(descriptor)).toBe(1);
    value(await session.reload());
    expect(session.chapterHintTier(descriptor)).toBe(1);
    expect(
      (await session.requestChapterSupport(descriptor, 3, 'support-lost')).ok,
    ).toBe(false);
    expect(session.chapterHintTier(descriptor)).toBe(1);
    value(await session.reload());
    expect(session.chapterHintTier(descriptor)).toBe(3);
    expect(session.state().record?.completedCount).toBe(0);
  });

  describe('full historical journal boundaries', () => {
    let full: SyntheticLoopRecord;
    let stopped: SyntheticLoopRecord;
    let historicalBytes: string;

    beforeAll(() => {
      // Immutable wire fixtures are shared; each test still creates an isolated
      // repository and executes the application operation it certifies.
      full = growingWorldCapacityFixture(3).legacy;
      stopped = value(
        syntheticLoopCodec.decode({
          ...enterGrowingWorld(full),
          sessionActive: false,
        }),
      );
      historicalBytes = value(
        canonicalize({ events: full.events, derived: full.derived }),
      );
    });

    async function fullSession(payload: SyntheticLoopRecord) {
      const repository = value(
        createSyntheticRepository(syntheticLoopCodec, {
          epoch: value(storageEpoch(0)),
          records: [
            {
              recordId: value(syntheticLoopRecordId(payload.profileId)),
              revision: value(revision(1)),
              storageEpoch: value(storageEpoch(0)),
              payload,
            },
          ],
        }),
      );
      const session = createSyntheticLoopSession(repository);
      value(await session.selectProfile(payload.profileId));
      return session;
    }

    it('keeps a full historical journal unscored without a write or exploration count', async () => {
      const session = await fullSession(full);
      value(
        await session.submit(
          request(replay('number.addition')),
          'support-full-unscored',
        ),
      );
      expect(session.state().record?.completedCount).toBe(64);
      expect(session.state().sessionOnlyCompletion).toMatchObject({
        evidence: 'sessionOnly',
        reasonCode: 'nonPractice',
      });
      expect(session.state().snapshot?.revision).toBe(1);
      expect(session.state().explorationCount).toBe(0);
    });

    it('closes a full historical journal through a lossless v2 entry', async () => {
      const session = await fullSession(full);
      value(await session.endSession('support-full-end'));
      const ended = session.state().record;
      expect(ended?.schema).toBe('growing-world-synthetic-loop-v2');
      expect(ended?.sessionActive).toBe(false);
      expect(
        value(canonicalize({ events: ended?.events, derived: ended?.derived })),
      ).toBe(historicalBytes);
      expect(ended).toEqual(stopped);
    });

    it('starts a fresh v2 replay after a full journal was closed, preserving exact history and counts', async () => {
      const session = await fullSession(stopped);
      value(await session.startSession('support-full-start'));
      const restarted = session.state().record;
      if (!restarted) throw new Error('Missing full restarted record');
      expect(restarted.taskOrdinal).toBe(full.taskOrdinal + 1);
      expect(restarted.completedCount).toBe(64);
      expect(restarted.sessionOrdinal).toBe(2);
      expect(
        value(
          canonicalize({
            events: restarted.events,
            derived: restarted.derived,
          }),
        ),
      ).toBe(historicalBytes);
      expect(
        value(
          syntheticLoopTaskSeed(
            restarted.profileId,
            restarted.selectedFamily,
            restarted.taskOrdinal,
          ),
        ),
      ).not.toBe(
        value(
          syntheticLoopTaskSeed(
            full.profileId,
            full.selectedFamily,
            full.taskOrdinal,
          ),
        ),
      );
    });
  });

  for (const family of ['number.make-ten', 'number.addition'] as const)
    it(`${family}: v2 codec refuses a recovered pending command that underreports saved support`, () => {
      const descriptor = replay(family);
      const record = value(
        syntheticLoopCodec.decode({
          ...enterGrowingWorld(initialSyntheticLoop('SYNTHETIC-PLAYER-1')),
          mode: 'synthetic-policy',
          selectedFamily: family,
          chapterSupport: value(rememberChapterSupport([], descriptor, 3)),
        }),
      );
      const prepared = value(
        prepareSyntheticLoopAnswer(
          record,
          request(descriptor),
          `support-pending-${family}`,
          2,
          0,
        ),
      );
      if (prepared.kind !== 'pending')
        throw new Error('Synthetic pending required');
      expect(
        syntheticLoopCodec.decode({ ...record, pending: prepared.pending }).ok,
      ).toBe(true);
      if (prepared.pending.chapterObservation) {
        for (const forged of [
          { ...prepared.pending.chapterObservation, mathematicalHintTier: 0 },
          { ...prepared.pending.chapterObservation, solutionExposed: false },
        ])
          expect(
            syntheticLoopCodec.decode({
              ...record,
              pending: { ...prepared.pending, chapterObservation: forged },
            }).ok,
          ).toBe(false);
      } else {
        const observation = prepared.pending.observation;
        if (!observation)
          throw new Error('Synthetic historical pending required');
        expect(
          syntheticLoopCodec.decode({
            ...record,
            pending: {
              ...prepared.pending,
              observation: {
                ...observation,
                input: { ...observation.input, mathematicalHintTier: 0 },
              },
            },
          }).ok,
        ).toBe(false);
      }
    });
});
