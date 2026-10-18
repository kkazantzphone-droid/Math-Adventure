import { describe, expect, it } from 'vitest';
import { canonicalize } from '../../src/domain/replay/canonical';
import {
  deriveGrowingJourney,
  GROWING_JOURNEY_POLICY,
} from '../../src/domain/growing-world/journey';
import type { ChapterObservation } from '../../src/domain/growing-world/journey';
import { createChapterTask } from '../../src/application/growing-world';
import {
  createSyntheticLoopSession,
  deriveSyntheticLoop,
  initialSyntheticLoop,
  legacySyntheticLoopCodec,
  syntheticLoopCodec,
  syntheticLoopTaskSeed,
  growingJourneyForRecord,
} from '../../src/application/synthetic-loop';
import { SYNTHETIC_LOOP_CATALOG } from '../../src/application/synthetic-loop/record';
import type {
  LoopAnswerRequest,
  SyntheticLoopRecord,
} from '../../src/application/synthetic-loop';
import { createSyntheticRepository } from '../fakes/synthetic-repository';
import { createProofReplay } from '../../src/domain/families/proofs';
import { applicationFailure } from '../../src/application/core/result';

function value<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string } },
): T {
  if (!result.ok)
    throw new Error(`Synthetic journey fixture: ${result.error.code}`);
  return result.value;
}

function observation(
  index: number,
  first = 6 + (index % 4),
  sessionOrdinal = index < 2 ? 1 : 2,
  representation = index % 2 ? 'relational' : 'concrete',
): ChapterObservation {
  return {
    schema: 'growing-world-observation-v1',
    policyVersion: GROWING_JOURNEY_POLICY.version,
    id: `SYNTHETIC-growth-${index}`,
    familyId: 'number.make-ten',
    concept: 'growth.number.make-ten',
    representation: `representation.growth.number.make-ten.${representation}`,
    fingerprint: `make-ten:${first}`,
    generatorVersion: 'make-ten-crossing-v1',
    sessionOrdinal,
    correct: true,
    mathematicalHintTier: 0,
    meaningfulAttempts: 1,
    solutionExposed: false,
    accessible: true,
  };
}

function legacyRecord(
  profileId: 'SYNTHETIC-PLAYER-1' | 'SYNTHETIC-PLAYER-2' = 'SYNTHETIC-PLAYER-1',
): SyntheticLoopRecord {
  const scope = SYNTHETIC_LOOP_CATALOG.scopes.find(
    (item) => item.conceptId === 'addition.part-whole',
  );
  if (!scope) throw new Error('Missing synthetic addition scope');
  const events = scope.cases.slice(0, 3).map((evidence, index) => ({
    kind: 'observation' as const,
    selectionSeed: '00000001000000020000000300000004',
    input: {
      synthetic: true as const,
      id: `SYNTHETIC-legacy-${index}`,
      concept: evidence.conceptId,
      representation: evidence.representationId,
      taskFingerprint: evidence.fingerprint,
      evidenceFingerprint: evidence.fingerprint,
      sessionOrdinal: 1,
      coarseDay: 100,
      clockCertain: false,
      mathematicalHintTier: 0 as const,
      solutionExposed: false,
      meaningfulAttempts: 1 as const,
      mode: 'practice' as const,
      completion: 'completed' as const,
      accessible: true,
      correct: true,
      accessibilitySupports: [],
      variationCase: true,
      revisit: false,
      policyVersion: 'phase3b-synthetic-policy-v1',
      generatorVersion: evidence.generatorVersion,
    },
  }));
  return value(
    syntheticLoopCodec.decode({
      ...initialSyntheticLoop(profileId),
      mode: 'synthetic-policy',
      events,
      completedCount: 3,
      taskOrdinal: 3,
      derived: value(deriveSyntheticLoop(profileId, events)).derived,
      preferences: {
        uiLocale: 'de-DE',
        instructionLocale: 'en-GB',
        numberSpeechLocale: 'el-GR',
      },
    }),
  );
}

function makeTenRequest(ordinal: number): LoopAnswerRequest {
  const presentation = value(
    createChapterTask(
      'number.make-ten',
      value(
        syntheticLoopTaskSeed('SYNTHETIC-PLAYER-1', 'number.make-ten', ordinal),
      ),
    ),
  );
  if (presentation.task.kind !== 'makeTen')
    throw new Error('Wrong synthetic fixture task');
  return {
    replay: presentation.replay,
    answer: {
      kind: 'exactValue',
      value: {
        schema: 'rational-v1',
        numerator: String(10 - presentation.task.first),
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

describe('Growing world experimental invitation contracts', () => {
  it('requires four distinct independent cases, two representations and two explicit sessions', () => {
    const complete = [0, 1, 2, 3].map((index) => observation(index));
    for (const sparse of [
      complete.slice(0, 1),
      complete.slice(0, 3),
      complete.map((item) => ({ ...item, sessionOrdinal: 1 })),
      complete.map((item) => ({
        ...item,
        representation: 'representation.growth.number.make-ten.concrete',
      })),
    ])
      expect(
        value(deriveGrowingJourney(sparse)).readiness[0]?.readyForInvitation,
      ).toBe(false);
    const journey = value(deriveGrowingJourney(complete));
    expect(journey.readiness[0]).toMatchObject({
      independentCases: 4,
      representations: 2,
      sessions: 2,
      readyForInvitation: true,
      limitedEvidence: true,
    });
    expect(
      journey.invitations.find((item) => item.familyId === 'number.part-whole'),
    ).toMatchObject({
      reason: 'connectedReadiness',
      connectedFrom: 'number.make-ten',
    });
    expect(
      journey.readiness.slice(1).every((item) => item.independentCases === 0),
    ).toBe(true);
    expect(journey.limitedEvidence).toBe(true);
  });

  it('repetition cannot inflate distinct cases and confirmations are bounded', () => {
    const journey = value(
      deriveGrowingJourney(
        Array.from({ length: 12 }, (_, index) =>
          observation(index, 6, index + 1),
        ),
      ),
    );
    expect(journey.readiness[0]).toMatchObject({
      independentCases: 1,
      representations: 2,
      sessions: 3,
      readyForInvitation: false,
    });
    expect(
      journey.classifications
        .slice(3)
        .every((item) => item.reason === 'repeatedRelationship'),
    ).toBe(true);
    expect(
      journey.classifications.filter(
        (item) => item.reason === 'independentConfirmation',
      ),
    ).toHaveLength(2);
  });

  it('keeps help/retry/exposed/incorrect experiences separate from independent evidence', () => {
    const journey = value(
      deriveGrowingJourney([
        { ...observation(0), mathematicalHintTier: 1 },
        { ...observation(1), meaningfulAttempts: 2 },
        { ...observation(2), solutionExposed: true },
        { ...observation(3), correct: false },
      ]),
    );
    expect(journey.readiness[0]).toMatchObject({
      independentCases: 0,
      supported: 2,
      unsuccessful: 1,
    });
    expect(journey.classifications.map((item) => item.outcome)).toEqual([
      'supportedSuccess',
      'supportedSuccess',
      'excluded',
      'unsuccessful',
    ]);
  });

  it('allows later-session independent recovery without erasing support or inflating repeated cases', () => {
    const supported = { ...observation(0), mathematicalHintTier: 2 as const };
    const sameSession = observation(1, 6, 1),
      recovered = observation(2, 6, 2, 'relational');
    const journey = value(
      deriveGrowingJourney([supported, sameSession, recovered]),
    );
    expect(journey.classifications.map((item) => item.outcome)).toEqual([
      'supportedSuccess',
      'excluded',
      'independentSuccess',
    ]);
    expect(journey.readiness[0]).toMatchObject({
      independentCases: 1,
      supported: 1,
      needsSupport: false,
    });
    const rest = [
      observation(3, 7, 2, 'concrete'),
      observation(4, 8, 3, 'concrete'),
      observation(5, 9, 3, 'relational'),
    ];
    expect(
      value(deriveGrowingJourney([supported, sameSession, recovered, ...rest]))
        .readiness[0]?.readyForInvitation,
    ).toBe(true);
  });

  it('invites support after two difficulties with all six choices still available', () => {
    const journey = value(
      deriveGrowingJourney([
        { ...observation(0), correct: false },
        { ...observation(1), mathematicalHintTier: 1 },
      ]),
    );
    expect(journey.invitations[0]?.reason).toBe('support');
    expect(journey.invitations).toHaveLength(6);
    expect(
      journey.invitations
        .slice(1)
        .every((item) => item.reason === 'chooseFreely'),
    ).toBe(true);
  });

  it('uses uncertain legacy independent cases only for invitations and never changes old evidence', () => {
    const record = legacyRecord(),
      before = value(canonicalize(record));
    const journey = value(growingJourneyForRecord(record));
    expect(journey.invitations[0]).toMatchObject({
      reason: 'connectedReadiness',
      connectedFrom: 'addition.part-whole',
    });
    expect(
      record.derived.concepts['addition.part-whole']?.limitedEvidence,
    ).toBe(true);
    expect(journey.limitedEvidence).toBe(true);
    expect(value(canonicalize(record))).toBe(before);
    expect(
      value(growingJourneyForRecord(legacyRecord('SYNTHETIC-PLAYER-2')))
        .invitations,
    ).toEqual(journey.invitations);
  });

  it('rejects forged versions/scopes/free text, duplicate IDs and backwards sessions', () => {
    expect(
      deriveGrowingJourney([
        {
          ...observation(0),
          policyVersion: 'unknown',
        } as unknown as ChapterObservation,
      ]).ok,
    ).toBe(false);
    expect(
      deriveGrowingJourney([{ ...observation(0), fingerprint: 'make-ten:99' }])
        .ok,
    ).toBe(false);
    expect(
      deriveGrowingJourney([
        {
          ...observation(0),
          rawAnswer: 'private',
        } as unknown as ChapterObservation,
      ]).ok,
    ).toBe(false);
    expect(deriveGrowingJourney([observation(0), observation(0)]).ok).toBe(
      false,
    );
    expect(
      deriveGrowingJourney([observation(0, 6, 2), observation(1, 7, 1)]).ok,
    ).toBe(false);
  });
});

describe('Growing world lossless versioned session integration', () => {
  it('retains a populated historical journal, accomplishments and preferences through exact v2 entry', () => {
    const old = legacyRecord();
    const upgraded = value(
      syntheticLoopCodec.decode({
        ...old,
        schema: 'growing-world-synthetic-loop-v2',
        chapterEvents: [],
        chapterSupport: [],
        selectedFamily: 'number.make-ten',
      }),
    );
    expect(upgraded.events).toEqual(old.events);
    expect(upgraded.derived).toEqual(old.derived);
    expect(upgraded.completedCount).toBe(old.completedCount);
    expect(upgraded.preferences).toEqual(old.preferences);
    expect(value(growingJourneyForRecord(upgraded)).invitations).toEqual(
      value(growingJourneyForRecord(old)).invitations,
    );
  });

  it('finishes an interrupted v1 pending write as v1 before a later chapter migration', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    const interrupted = createSyntheticLoopSession({
      ...repository,
      execute: (command) =>
        command.operationId === 'growth-legacy-final'
          ? Promise.resolve(applicationFailure('storage_unavailable'))
          : repository.execute(command),
    });
    value(
      await interrupted.selectProfile(
        'SYNTHETIC-PLAYER-1',
        'growth-legacy-create',
      ),
    );
    value(await interrupted.setMode('synthetic-policy', 'growth-legacy-mode'));
    const request = {
      ...makeTenRequest(1),
      replay: value(
        createProofReplay(
          'number.addition',
          '00000001000000020000000300000004',
        ),
      ),
      answer: {
        kind: 'exactValue' as const,
        value: {
          schema: 'rational-v1' as const,
          numerator: '0',
          denominator: '1',
        },
      },
    };
    expect((await interrupted.submit(request, 'growth-legacy-final')).ok).toBe(
      false,
    );
    const survivor = createSyntheticLoopSession(repository);
    value(await survivor.selectProfile('SYNTHETIC-PLAYER-1'));
    expect(survivor.state().record?.schema).toBe('phase3c-synthetic-loop-v1');
    expect(survivor.state().record?.pending).not.toBeNull();
    expect(
      (await survivor.setActivity('number.make-ten', 'growth-premature-entry'))
        .ok,
    ).toBe(false);
    value(await survivor.retryPending());
    expect(survivor.state().record?.schema).toBe('phase3c-synthetic-loop-v1');
    expect(survivor.state().record?.completedCount).toBe(1);
    const historical = survivor.state().record?.events;
    value(await survivor.setActivity('number.make-ten', 'growth-safe-entry'));
    expect(survivor.state().record?.schema).toBe(
      'growing-world-synthetic-loop-v2',
    );
    expect(survivor.state().record?.events).toEqual(historical);
  });

  it('decodes v1 exactly and upgrades only on explicit chapter entry, retaining legacy data', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    const session = createSyntheticLoopSession(repository);
    value(await session.selectProfile('SYNTHETIC-PLAYER-1', 'growth-create'));
    const original = session.state().record;
    expect(original?.schema).toBe('phase3c-synthetic-loop-v1');
    expect(
      value(canonicalize(value(syntheticLoopCodec.decode(original)))),
    ).toBe(value(canonicalize(original)));
    value(
      await session.setPreferences(
        {
          uiLocale: 'de-DE',
          instructionLocale: 'en-GB',
          numberSpeechLocale: 'el-GR',
        },
        'growth-language',
      ),
    );
    value(await session.setMode('synthetic-policy', 'growth-policy'));
    expect(session.state().record?.schema).toBe('phase3c-synthetic-loop-v1');
    const before = session.state().record;
    value(await session.setActivity('number.make-ten', 'growth-enter'));
    const next = session.state().record;
    expect(next?.schema).toBe('growing-world-synthetic-loop-v2');
    expect(next?.preferences).toEqual(before?.preferences);
    expect(next?.events).toEqual(before?.events);
    expect(next?.derived).toEqual(before?.derived);
    expect(legacySyntheticLoopCodec.decode(next).ok).toBe(false);
    expect(syntheticLoopCodec.decode(next).ok).toBe(true);
  });

  it('persists limited chapter evidence once, resumes it, and isolates the other badge', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    const session = createSyntheticLoopSession(repository);
    value(
      await session.selectProfile(
        'SYNTHETIC-PLAYER-1',
        'growth-evidence-create',
      ),
    );
    value(await session.setMode('synthetic-policy', 'growth-evidence-mode'));
    value(
      await session.setActivity('number.make-ten', 'growth-evidence-enter'),
    );
    const request = makeTenRequest(1);
    value(await session.submit(request, 'growth-answer'));
    const first = session.state().record;
    expect(first?.lastCompletion?.evidence).toBe('limitedEvidence');
    expect(
      first?.schema === 'growing-world-synthetic-loop-v2' &&
        first.chapterEvents,
    ).toHaveLength(1);
    expect(first?.events).toEqual([]);
    value(await session.submit(request, 'growth-answer'));
    expect(session.state().record).toEqual(first);
    value(
      await session.selectProfile('SYNTHETIC-PLAYER-2', 'growth-second-badge'),
    );
    expect(
      value(
        growingJourneyForRecord(session.state().record as SyntheticLoopRecord),
      ).assessmentCount,
    ).toBe(0);
    value(await session.selectProfile('SYNTHETIC-PLAYER-1'));
    expect(
      value(
        growingJourneyForRecord(session.state().record as SyntheticLoopRecord),
      ).assessmentCount,
    ).toBe(1);
  });

  it('Explore and Number Lab leave the record, revision, readiness and write count unchanged', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    let writes = 0;
    const session = createSyntheticLoopSession({
      ...repository,
      execute: (command) => {
        writes += 1;
        return repository.execute(command);
      },
    });
    value(
      await session.selectProfile(
        'SYNTHETIC-PLAYER-1',
        'growth-explore-create',
      ),
    );
    value(await session.setMode('synthetic-policy', 'growth-explore-mode'));
    value(await session.setActivity('number.make-ten', 'growth-explore-enter'));
    const before = session.state().record,
      revision = session.state().snapshot?.revision,
      count = writes;
    for (const playMode of ['exploration', 'numberLab'] as const)
      value(
        await session.submit(
          { ...makeTenRequest(2), playMode },
          `growth-${playMode.toLowerCase()}`,
        ),
      );
    expect(session.state().record).toBe(before);
    expect(session.state().snapshot?.revision).toBe(revision);
    expect(writes).toBe(count);
    expect(
      value(
        growingJourneyForRecord(session.state().record as SyntheticLoopRecord),
      ).assessmentCount,
    ).toBe(0);
  });

  it('continues unscored at explicit journal capacity and refuses overflow or forged provenance', async () => {
    const session = createSyntheticLoopSession(null);
    value(await session.selectProfile('SYNTHETIC-PLAYER-1'));
    value(await session.setMode('synthetic-policy', 'growth-capacity-mode'));
    value(
      await session.setActivity('number.make-ten', 'growth-capacity-enter'),
    );
    for (let index = 0; index < GROWING_JOURNEY_POLICY.eventLimit; index += 1)
      value(
        await session.submit(makeTenRequest(index), `growth-capacity-${index}`),
      );
    const full = session.state().record;
    const journey = value(growingJourneyForRecord(full as SyntheticLoopRecord));
    expect(journey.capacityReached).toBe(true);
    expect(journey.remainingCapacity).toBe(0);
    value(await session.submit(makeTenRequest(90), 'growth-capacity-unscored'));
    expect(session.state().record).toBe(full);
    expect(session.state().sessionOnlyCompletion?.evidence).toBe('sessionOnly');
    if (full?.schema !== 'growing-world-synthetic-loop-v2')
      throw new Error('Missing v2 fixture');
    expect(
      syntheticLoopCodec.decode({
        ...full,
        chapterEvents: [...full.chapterEvents, observation(99)],
      }).ok,
    ).toBe(false);
    expect(
      syntheticLoopCodec.decode({
        ...full,
        chapterEvents: [{ ...observation(1), concept: 'addition.part-whole' }],
      }).ok,
    ).toBe(false);
  });
});
