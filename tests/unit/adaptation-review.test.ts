import { describe, expect, it } from 'vitest';
import { PROOF_FAMILIES } from '../../src/domain/families/proofs';
import {
  completeReview,
  conceptReview,
  confirmReadiness,
  emptyReview,
  finiteUniverseReview,
  immediateSupportChoices,
  recommendReview,
  representationEvidence,
  resolveReviewClock,
  retainReview,
  REVIEW_POLICY,
  sessionCheckpoint,
  settleDueRevisit,
} from '../fakes/synthetic-adaptation-review';
import type {
  CoverageProposal,
  SelectionContext,
  SyntheticCandidate,
  SyntheticCompletion,
  SyntheticReviewSnapshot,
} from '../fakes/synthetic-adaptation-review';

const concept = 'synthetic.addition';
const coverage: CoverageProposal = {
  kind: 'default',
  representations: ['groups', 'symbols'],
};
const singleFamily: CoverageProposal = {
  kind: 'singleFamilyProposal',
  representation: 'groups',
  minimumVariationCases: 2,
  educatorReview: 'REQUIRED',
};

function event(
  index: number,
  changes: Partial<SyntheticCompletion> = {},
): SyntheticCompletion {
  return {
    synthetic: true,
    id: `SYNTHETIC-completion-${index}`,
    concept,
    representation: index % 2 === 0 ? 'groups' : 'symbols',
    domainViews: ['arithmetic'],
    taskFingerprint: `synthetic.addition.${index}`,
    evidenceFingerprint: `synthetic.evidence.${index}`,
    day: index < 5 ? 0 : 2,
    session: index < 5 ? 1 : 2,
    mode: 'practice',
    completion: 'completed',
    validAccessibleTask: true,
    correct: true,
    meaningfulAttempts: 1,
    mathematicalHintTier: 0,
    solutionExposed: false,
    accessibilitySupport: [],
    variationCase: true,
    revisit: false,
    locale: 'en-GB',
    cosmetic: 'blue',
    ...changes,
  };
}

function run(
  events: readonly SyntheticCompletion[],
  rule = coverage,
  before = emptyReview(),
): SyntheticReviewSnapshot {
  return events.reduce(
    (snapshot, completion) => completeReview(snapshot, completion, rule),
    before,
  );
}

const selection: SelectionContext = {
  seed: '00000001000000020000000300000004',
  explicitChoice: null,
  requestedHelp: null,
  lastConcept: null,
  consecutiveScored: 0,
  supportOfferedThisSession: [],
  reviewOfferedThisSession: [],
  clockCertain: true,
};
const candidate = (id: string, lastOffered = 0): SyntheticCandidate => ({
  concept: id,
  prerequisiteReady: true,
  generationAvailable: true,
  lastOffered,
});

describe('PROPOSED synthetic adaptation review; no learner or educational validation', () => {
  it('keeps policy hypotheses explicit and rejects non-synthetic profile labels', () => {
    expect(REVIEW_POLICY).toMatchObject({
      status: 'PROPOSED',
      version: 'phase3-readiness-simulation-v2',
    });
    expect(() => emptyReview('Player 1')).toThrow('Synthetic profile required');
    expect(conceptReview(emptyReview(), concept)).toMatchObject({
      attained: 'Unseen',
      limitedEvidence: true,
    });
  });

  it('starts with a ready invitation when probes are declined and allows a harder explicit choice', () => {
    const catalog = [
      candidate('synthetic.easy'),
      { ...candidate('synthetic.harder'), prerequisiteReady: false },
    ];
    expect(recommendReview(emptyReview(), catalog, selection)).toMatchObject({
      concept: 'synthetic.easy',
      reasonCode: 'newReady',
      retainedCount: 0,
    });
    expect(
      recommendReview(emptyReview(), catalog, {
        ...selection,
        explicitChoice: 'synthetic.harder',
      }),
    ).toMatchObject({
      concept: 'synthetic.harder',
      reasonCode: 'explicitChoice',
      independentCount: 0,
    });
    expect(conceptReview(emptyReview(), 'synthetic.harder').attained).toBe(
      'Unseen',
    );
  });

  it('keeps diagnostic readiness scoped and out of mastery windows', () => {
    const snapshot = run([event(0, { mode: 'diagnostic' })]);
    expect(snapshot.diagnostics).toEqual(['synthetic.addition/groups']);
    expect(snapshot.concepts).toEqual({});
    expect(
      run([event(1, { mode: 'diagnostic', mathematicalHintTier: 1 })])
        .diagnostics,
    ).toEqual([]);
    expect(snapshot.audit[0]).toMatchObject({
      outcome: 'excluded',
      reason: 'nonPractice',
    });
  });

  it('requires a full five-observation window, three independent successes and diversity', () => {
    expect(conceptReview(run([event(0)]), concept).attained).toBe('Emerging');
    expect(
      conceptReview(run([0, 1, 2, 3].map((i) => event(i))), concept).attained,
    ).toBe('Emerging');
    const developing = run([
      event(0),
      event(1),
      event(2),
      event(3, { mathematicalHintTier: 1 }),
      event(4, { correct: false }),
    ]);
    expect(conceptReview(developing, concept).attained).toBe('Developing');
    expect(
      conceptReview(
        run([
          event(0),
          event(1),
          event(2, { mathematicalHintTier: 1 }),
          event(3, { correct: false }),
          event(4, { correct: false }),
        ]),
        concept,
      ).attained,
    ).toBe('Emerging');
  });

  it('distinguishes mathematical support, meaningful retries and unsuccessful completion', () => {
    const snapshot = run([
      event(0),
      event(1, { mathematicalHintTier: 1 }),
      event(2, { meaningfulAttempts: 2 }),
      event(3, { correct: false }),
    ]);
    expect(snapshot.audit.map((item) => item.outcome)).toEqual([
      'independentSuccess',
      'supportedSuccess',
      'supportedSuccess',
      'unsuccessful',
    ]);
    expect(conceptReview(snapshot, concept).observations).toHaveLength(4);
  });

  it.each(['skipped', 'interrupted', 'adapterFailed', 'abandoned'] as const)(
    'excludes %s without adding a denominator or negative support',
    (completion) => {
      const snapshot = sessionCheckpoint(run([event(0, { completion })]));
      expect(snapshot.audit[0]).toMatchObject({
        outcome: 'excluded',
        reason: 'notCompleted',
      });
      expect(snapshot.concepts).toEqual({});
    },
  );

  it('excludes solution exposure and inaccessible tasks even when correct', () => {
    const snapshot = run([
      event(0, { solutionExposed: true }),
      event(1, { validAccessibleTask: false }),
    ]);
    expect(snapshot.audit.map((item) => item.reason)).toEqual([
      'solutionExposed',
      'inaccessible',
    ]);
    expect(snapshot.concepts).toEqual({});
  });

  it('treats accessibility and instruction support as neutral mathematical evidence', () => {
    const plain = run([event(0)]);
    const accessible = run([
      event(0, {
        accessibilitySupport: [
          'speechReplay',
          'screenReader',
          'largeText',
          'alternateControl',
          'instructionClarification',
        ],
      }),
    ]);
    expect(accessible.audit[0]?.outcome).toBe('independentSuccess');
    expect(conceptReview(accessible, concept).attained).toBe(
      conceptReview(plain, concept).attained,
    );
    expect(
      recommendReview(accessible, [candidate(concept)], selection),
    ).toEqual(recommendReview(plain, [candidate(concept)], selection));
  });

  it('excludes immediate mathematical duplicates despite locale, colour or instance changes', () => {
    const snapshot = run([
      event(0),
      event(1, {
        taskFingerprint: 'synthetic.addition.0',
        evidenceFingerprint: 'synthetic.evidence.0',
        locale: 'el-GR',
        cosmetic: 'red',
      }),
    ]);
    expect(snapshot.audit.map((item) => item.outcome)).toEqual([
      'independentSuccess',
      'excluded',
    ]);
    expect(conceptReview(snapshot, concept).observations).toHaveLength(1);
  });

  it('permits educator-declared meaningful variation of the same relationship', () => {
    const snapshot = run([
      event(0),
      event(1, {
        taskFingerprint: 'synthetic.addition.0',
        evidenceFingerprint: 'synthetic.unknown-position.changed',
      }),
    ]);
    expect(snapshot.audit.map((item) => item.outcome)).toEqual([
      'independentSuccess',
      'independentSuccess',
    ]);
    // This fixture assumes a reviewed fingerprint declaration; it does not
    // approve arbitrary layout/position changes as mathematical diversity.
    expect(conceptReview(snapshot, concept).observations).toHaveLength(2);
  });

  it('counts delayed retrieval only after two coarse days in another session, at most twice per retained window', () => {
    const changes = {
      taskFingerprint: 'synthetic.addition.0',
      evidenceFingerprint: 'synthetic.evidence.0',
    };
    const snapshot = run([
      event(0),
      event(1, { ...changes, day: 1, session: 2 }),
      event(2, { ...changes, day: 2, session: 1 }),
      event(3, { ...changes, day: 2, session: 2 }),
      event(4, { ...changes, day: 4, session: 3 }),
    ]);
    expect(snapshot.audit.map((item) => item.outcome)).toEqual([
      'independentSuccess',
      'excluded',
      'excluded',
      'independentSuccess',
      'excluded',
    ]);
    expect(conceptReview(snapshot, concept).observations).toHaveLength(2);
  });

  it('freezes pre-event classification and exact retries rather than excluding replay against itself', () => {
    const completed = event(0);
    const snapshot = run([completed]);
    expect(completeReview(snapshot, completed, coverage)).toBe(snapshot);
    expect(snapshot.audit[0]?.outcome).toBe('independentSuccess');
    const excluded = event(1, {
      evidenceFingerprint: completed.evidenceFingerprint,
    });
    const after = completeReview(snapshot, excluded, coverage);
    expect(completeReview(after, excluded, coverage)).toBe(after);
    expect(after.audit[1]?.outcome).toBe('excluded');
    expect(() =>
      completeReview(snapshot, { ...completed, correct: false }, coverage),
    ).toThrow('Conflicting completion retry');
  });

  it('detaches recorded classification from the caller completion and metadata arrays', () => {
    const domains = ['arithmetic'];
    const completion = { ...event(0), domainViews: domains };
    const snapshot = run([completion]);
    completion.correct = false;
    domains.push('geometry');
    expect(snapshot.audit[0]?.completion.correct).toBe(true);
    expect(snapshot.audit[0]?.completion.domainViews).toEqual(['arithmetic']);
    expect(snapshot.audit[0]?.outcome).toBe('independentSuccess');
  });

  it('partitions profiles, canonical concepts and representations without domain-tag credit', () => {
    const snapshot = run([
      event(0, {
        domainViews: ['arithmetic', 'geometry', 'measurement', 'arithmetic'],
      }),
    ]);
    expect(Object.keys(snapshot.concepts)).toEqual([concept]);
    expect(conceptReview(snapshot, concept).observations).toHaveLength(1);
    for (const id of [
      'synthetic.geometry',
      'synthetic.measurement',
      'synthetic.powers',
      'synthetic.roots',
    ])
      expect(conceptReview(snapshot, id).attained).toBe('Unseen');
    expect(
      conceptReview(emptyReview('SYNTHETIC-OTHER-PROFILE'), concept).attained,
    ).toBe('Unseen');
    expect(snapshot.diagnostics).toEqual([]);
    expect(representationEvidence(snapshot, concept, 'groups')).toEqual({
      independent: 1,
      supported: 0,
      unsuccessful: 0,
      retained: 1,
    });
    expect(representationEvidence(snapshot, concept, 'symbols')).toEqual({
      independent: 0,
      supported: 0,
      unsuccessful: 0,
      retained: 0,
    });
    const another = run(
      [event(1, { mathematicalHintTier: 1 })],
      coverage,
      snapshot,
    );
    expect(representationEvidence(another, concept, 'groups')).toEqual({
      independent: 1,
      supported: 0,
      unsuccessful: 0,
      retained: 1,
    });
    expect(representationEvidence(another, concept, 'symbols')).toEqual({
      independent: 0,
      supported: 1,
      unsuccessful: 0,
      retained: 1,
    });
  });

  it('retains independent geometry and measurement paths after arithmetic is Secure', () => {
    const arithmetic = run(Array.from({ length: 10 }, (_, i) => event(i)));
    const geometry = event(10, {
      concept: 'synthetic.geometry',
      representation: 'attributes',
      mathematicalHintTier: 1,
    });
    const measurement = event(11, {
      concept: 'synthetic.measurement',
      representation: 'unit-iteration',
      correct: false,
    });
    const snapshot = run([geometry, measurement], coverage, arithmetic);
    expect(conceptReview(snapshot, concept).attained).toBe('Secure');
    expect(conceptReview(snapshot, 'synthetic.geometry')).toMatchObject({
      attained: 'Emerging',
      limitedEvidence: true,
    });
    expect(
      conceptReview(snapshot, 'synthetic.geometry').observations[0]?.outcome,
    ).toBe('supportedSuccess');
    expect(
      conceptReview(snapshot, 'synthetic.measurement').observations[0]?.outcome,
    ).toBe('unsuccessful');
    expect(conceptReview(snapshot, 'synthetic.powers').attained).toBe('Unseen');
  });

  it.each(['numberLab', 'exploration'] as const)(
    'keeps %s success and difficulty neutral, even after a long absence',
    (mode) => {
      const before = run(Array.from({ length: 10 }, (_, i) => event(i)));
      const after = run(
        [
          event(10, { mode, day: 200 }),
          event(11, { mode, day: 201, correct: false }),
        ],
        coverage,
        before,
      );
      expect(after.concepts).toEqual(before.concepts);
      expect(after.diagnostics).toEqual(before.diagnostics);
      expect(after.audit.slice(-2).map((item) => item.outcome)).toEqual([
        'excluded',
        'excluded',
      ]);
      expect(after.audit.every((item) => item.completion.synthetic)).toBe(true);
    },
  );

  it('requires a new normal-practice confirmation after exploration', () => {
    const afterExposure = run([event(0, { mode: 'exploration' })]);
    const afterConfirmation = run([event(1)], coverage, afterExposure);
    expect(conceptReview(afterExposure, concept).attained).toBe('Unseen');
    expect(conceptReview(afterConfirmation, concept).attained).toBe('Emerging');
    expect(conceptReview(afterConfirmation, concept).observations).toHaveLength(
      1,
    );
  });

  it('requires full ten, eight independent, two sessions, coverage and two variation cases for Secure', () => {
    const trace = Array.from({ length: 10 }, (_, i) =>
      event(i, { mathematicalHintTier: i >= 8 ? 1 : 0 }),
    );
    expect(conceptReview(run(trace.slice(0, 9)), concept).attained).toBe(
      'Developing',
    );
    expect(conceptReview(run(trace), concept)).toMatchObject({
      attained: 'Secure',
      limitedEvidence: false,
    });
    expect(
      conceptReview(
        run(
          trace.map((item, i) =>
            i === 7 ? { ...item, mathematicalHintTier: 1 } : item,
          ),
        ),
        concept,
      ).attained,
    ).toBe('Developing');
    expect(
      conceptReview(
        run(trace.map((item) => ({ ...item, session: 1 }))),
        concept,
      ).attained,
    ).toBe('Developing');
    expect(
      conceptReview(
        run(trace.map((item) => ({ ...item, representation: 'groups' }))),
        concept,
      ),
    ).toMatchObject({ attained: 'Developing', limitedEvidence: true });
    expect(
      conceptReview(
        run(trace.map((item, i) => ({ ...item, variationCase: i === 0 }))),
        concept,
      ).attained,
    ).toBe('Developing');
  });

  it('preserves attainment after one failure or sparse retained evidence', () => {
    const secure = run(Array.from({ length: 10 }, (_, i) => event(i)));
    const failed = run([event(10, { correct: false })], coverage, secure);
    expect(conceptReview(failed, concept).attained).toBe('Secure');
    const away = retainReview(secure, 63);
    expect(conceptReview(away, concept)).toMatchObject({
      attained: 'Secure',
      limitedEvidence: true,
      observations: [],
    });
    expect(
      recommendReview(away, [candidate(concept)], selection),
    ).toMatchObject({
      reasonCode: 'familiar',
      retainedCount: 0,
      independentCount: 0,
    });
  });

  it('enforces inclusive age boundary, per-concept count and global oldest-first retention', () => {
    const sparse = run([event(0)]);
    expect(
      conceptReview(retainReview(sparse, 60), concept).observations,
    ).toHaveLength(1);
    expect(
      conceptReview(retainReview(sparse, 61), concept).observations,
    ).toHaveLength(0);
    const many = run(Array.from({ length: 12 }, (_, i) => event(i)));
    expect(
      conceptReview(many, concept).observations.map(
        (item) => item.completion.id,
      ),
    ).toEqual(
      Array.from({ length: 10 }, (_, i) => `SYNTHETIC-completion-${i + 2}`),
    );
    const global = run(
      Array.from({ length: 501 }, (_, i) =>
        event(i, { concept: `synthetic.concept.${i}`, day: 0, session: 1 }),
      ),
    );
    expect(
      Object.values(global.concepts).reduce(
        (count, state) => count + state.observations.length,
        0,
      ),
    ).toBe(500);
    expect(conceptReview(global, 'synthetic.concept.0')).toMatchObject({
      attained: 'Emerging',
      observations: [],
      limitedEvidence: true,
    });
    expect(
      conceptReview(global, 'synthetic.concept.500').observations,
    ).toHaveLength(1);
  });

  it('suspends date-based changes under clock uncertainty', () => {
    const before = confirmReadiness(
      run([event(0)]),
      concept,
      'SYNTHETIC-completion-0',
    );
    const after = retainReview(before, 200, false);
    expect(conceptReview(after, concept)).toMatchObject({
      observations: conceptReview(before, concept).observations,
      reviewStage: 0,
      nextReviewDay: 2,
      reviewDue: false,
    });
    expect(
      recommendReview(
        {
          ...after,
          concepts: {
            ...after.concepts,
            [concept]: { ...conceptReview(after, concept), reviewDue: true },
          },
        },
        [candidate(concept)],
        { ...selection, clockCertain: false },
      ).reasonCode,
    ).toBe('familiar');
  });

  it('carries uncertainty across new practice until explicit synthetic parent clock resolution', () => {
    const before = run([event(0)]);
    const uncertain = retainReview(before, 200, false);
    const after = completeReview(
      uncertain,
      event(1, { day: 200, session: 3 }),
      coverage,
    );
    expect(after).toMatchObject({ clockCertain: false, lastTrustedDay: 0 });
    expect(
      conceptReview(after, concept).observations.map(
        (item) => item.completion.id,
      ),
    ).toEqual(['SYNTHETIC-completion-0', 'SYNTHETIC-completion-1']);
    expect(after.audit[1]?.clockCertain).toBe(false);
    expect(confirmReadiness(after, concept, 'SYNTHETIC-completion-1')).toBe(
      after,
    );
    const repeat = completeReview(
      after,
      event(2, {
        day: 201,
        session: 4,
        evidenceFingerprint: 'synthetic.evidence.0',
      }),
      coverage,
    );
    expect(repeat.audit[2]?.outcome).toBe('excluded');
    const resolved = resolveReviewClock(repeat, 201);
    expect(resolved).toMatchObject({ clockCertain: true, lastTrustedDay: 201 });
    expect(
      conceptReview(resolved, concept).observations.map(
        (item) => item.completion.id,
      ),
    ).toEqual(['SYNTHETIC-completion-1']);
    expect(confirmReadiness(resolved, concept, 'SYNTHETIC-completion-1')).toBe(
      resolved,
    );
  });

  it('detects backward coarse days and cannot implicitly resume dates on a later completion', () => {
    const before = confirmReadiness(
      run([event(0, { day: 10 })]),
      concept,
      'SYNTHETIC-completion-0',
    );
    const rollback = completeReview(
      before,
      event(1, { day: 9, session: 2 }),
      coverage,
    );
    expect(rollback).toMatchObject({ clockCertain: false, lastTrustedDay: 10 });
    expect(conceptReview(rollback, concept)).toMatchObject({
      reviewStage: 0,
      nextReviewDay: 12,
      reviewDue: false,
      limitedEvidence: true,
    });
    const later = completeReview(
      rollback,
      event(2, { day: 200, session: 3, revisit: true }),
      coverage,
    );
    expect(later.clockCertain).toBe(false);
    expect(conceptReview(later, concept).observations).toHaveLength(3);
    expect(settleDueRevisit(later, concept, 'SYNTHETIC-completion-2')).toBe(
      later,
    );
    expect(
      recommendReview(later, [candidate(concept)], selection).reasonCode,
    ).toBe('familiar');
  });

  it('preserves count bounds while uncertain instead of accumulating an unlimited evidence window', () => {
    const uncertain = retainReview(emptyReview(), 0, false);
    const many = run(
      Array.from({ length: 501 }, (_, i) =>
        event(i, { concept: `synthetic.concept.${i}`, day: 200, session: 1 }),
      ),
      coverage,
      uncertain,
    );
    expect(many.clockCertain).toBe(false);
    expect(
      Object.values(many.concepts).reduce(
        (count, state) => count + state.observations.length,
        0,
      ),
    ).toBe(500);
    expect(
      conceptReview(many, 'synthetic.concept.0').observations,
    ).toHaveLength(0);
  });

  it('offers immediate support after two unsuccessful or high-hint experiences before a full window', () => {
    const snapshot = run([
      event(0, { correct: false }),
      event(1, { mathematicalHintTier: 2 }),
    ]);
    expect(immediateSupportChoices(snapshot, concept)).toEqual([
      'easier',
      'anotherRepresentation',
      'workedExample',
      'stop',
    ]);
    expect(
      conceptReview(sessionCheckpoint(snapshot), concept).needsSupport,
    ).toBe(false);
    expect(
      immediateSupportChoices(
        run([event(0, { correct: false }), event(1)]),
        concept,
      ),
    ).toEqual([]);
  });

  it('activates support at a stable checkpoint with three non-independent completions across two sessions', () => {
    const snapshot = run([
      event(0),
      event(1),
      event(2, { mathematicalHintTier: 1 }),
      event(3, { correct: false }),
      event(4, { mathematicalHintTier: 2, session: 2 }),
    ]);
    expect(conceptReview(snapshot, concept).needsSupport).toBe(false);
    const checked = sessionCheckpoint(snapshot);
    expect(conceptReview(checked, concept)).toMatchObject({
      needsSupport: true,
      supportActivatedAfter: 5,
      attained: 'Emerging',
    });
    expect(
      recommendReview(checked, [candidate(concept)], selection),
    ).toMatchObject({
      reasonCode: 'support',
      independentCount: 2,
      retainedCount: 5,
    });
    const sameSession = run(
      [0, 1, 2, 3, 4].map((i) => event(i, { correct: i < 2, session: 1 })),
    );
    expect(
      conceptReview(sessionCheckpoint(sameSession), concept).needsSupport,
    ).toBe(false);
  });

  it('clears support only with three varied independent revisits after activation across two sessions', () => {
    let snapshot = sessionCheckpoint(
      run(
        [0, 1, 2, 3, 4].map((i) =>
          event(i, { correct: i >= 3, session: i < 3 ? 1 : 2 }),
        ),
      ),
    );
    expect(conceptReview(snapshot, concept).needsSupport).toBe(false);
    // Three struggling completions must themselves cross sessions.
    snapshot = sessionCheckpoint(
      run(
        [0, 1, 2, 3, 4].map((i) =>
          event(i, { correct: i >= 3, session: i === 2 ? 2 : 1 }),
        ),
      ),
    );
    expect(conceptReview(snapshot, concept).needsSupport).toBe(true);
    const ordinary = run([event(5), event(6), event(7)], coverage, snapshot);
    expect(
      conceptReview(sessionCheckpoint(ordinary), concept).needsSupport,
    ).toBe(true);
    const two = run(
      [
        event(5, { revisit: true, session: 3 }),
        event(6, { revisit: true, session: 3 }),
      ],
      coverage,
      snapshot,
    );
    expect(conceptReview(sessionCheckpoint(two), concept).needsSupport).toBe(
      true,
    );
    const same = run([event(7, { revisit: true, session: 3 })], coverage, two);
    expect(conceptReview(sessionCheckpoint(same), concept).needsSupport).toBe(
      true,
    );
    const varied = run(
      [event(7, { revisit: true, session: 4 })],
      coverage,
      two,
    );
    expect(conceptReview(varied, concept).needsSupport).toBe(true);
    expect(conceptReview(sessionCheckpoint(varied), concept).needsSupport).toBe(
      false,
    );
  });

  it('keeps Secure attainment while sustained recent evidence requests support', () => {
    const before = run(Array.from({ length: 10 }, (_, i) => event(i)));
    const after = sessionCheckpoint(
      run(
        Array.from({ length: 5 }, (_, i) =>
          event(i + 10, { correct: i >= 3, session: i === 2 ? 4 : 3 }),
        ),
        coverage,
        before,
      ),
    );
    expect(conceptReview(after, concept)).toMatchObject({
      attained: 'Secure',
      needsSupport: true,
    });
  });

  it('makes repeated support checkpoints idempotent even with interleaved recovery and failures', () => {
    let snapshot = sessionCheckpoint(
      run(
        Array.from({ length: 5 }, (_, i) =>
          event(i, {
            correct: i >= 3,
            session: i < 2 ? 1 : 2,
          }),
        ),
      ),
    );
    expect(conceptReview(snapshot, concept).needsSupport).toBe(true);
    snapshot = run(
      [
        event(5, { session: 3, revisit: true }),
        event(6, { session: 3, correct: false }),
        event(7, { session: 3, revisit: true }),
        event(8, { session: 3, correct: false }),
        event(9, { session: 4, revisit: true }),
        event(10, { session: 4, correct: false }),
        event(11, { session: 4, correct: false }),
      ],
      coverage,
      snapshot,
    );
    const once = sessionCheckpoint(snapshot);
    expect(conceptReview(once, concept)).toMatchObject({
      needsSupport: false,
      lastCheckpointOrdinal: 12,
    });
    expect(sessionCheckpoint(once)).toEqual(once);
    const excluded = completeReview(
      once,
      event(12, { completion: 'skipped' }),
      coverage,
    );
    expect(
      conceptReview(sessionCheckpoint(excluded), concept).needsSupport,
    ).toBe(false);
  });

  it('advances exactly the hypothesised staged revisit trace 2,9,30,60,90', () => {
    let snapshot = confirmReadiness(
      run([event(0)]),
      concept,
      'SYNTHETIC-completion-0',
    );
    expect(conceptReview(snapshot, concept)).toMatchObject({
      reviewStage: 0,
      nextReviewDay: 2,
    });
    const expected = [
      [2, 1, 9],
      [9, 2, 30],
      [30, 3, 60],
      [60, 3, 90],
    ] as const;
    for (const [day, stage, next] of expected) {
      snapshot = retainReview(snapshot, day);
      expect(conceptReview(snapshot, concept).reviewDue).toBe(true);
      const completion = event(100 + day, {
        day,
        session: day + 1,
        revisit: true,
      });
      snapshot = completeReview(snapshot, completion, coverage);
      snapshot = settleDueRevisit(snapshot, concept, completion.id);
      expect(conceptReview(snapshot, concept)).toMatchObject({
        reviewStage: stage,
        nextReviewDay: next,
        reviewDue: false,
      });
      expect(settleDueRevisit(snapshot, concept, completion.id)).toBe(snapshot);
    }
  });

  it('does not reset revisit dates for skip, support, failure, unrelated practice or an early revisit', () => {
    const before = confirmReadiness(
      run([event(0)]),
      concept,
      'SYNTHETIC-completion-0',
    );
    for (const completion of [
      event(1, { day: 2, revisit: true, completion: 'skipped' }),
      event(2, { day: 2, revisit: true, mathematicalHintTier: 1 }),
      event(3, { day: 2, revisit: true, correct: false }),
      event(4, { day: 2, revisit: false }),
      event(5, { day: 1, revisit: true }),
    ]) {
      const after = settleDueRevisit(
        completeReview(before, completion, coverage),
        concept,
        completion.id,
      );
      expect(conceptReview(after, concept)).toMatchObject({
        reviewStage: 0,
        nextReviewDay: 2,
      });
    }
  });

  it('offers one current overdue revisit, no missed-date backlog and no uncertainty advancement', () => {
    const before = confirmReadiness(
      run([event(0)]),
      concept,
      'SYNTHETIC-completion-0',
    );
    const away = retainReview(before, 200);
    const catalog = [candidate(concept), candidate('synthetic.other')];
    expect(recommendReview(away, catalog, selection)).toMatchObject({
      concept,
      reasonCode: 'reviewDue',
    });
    expect(
      recommendReview(away, catalog, {
        ...selection,
        reviewOfferedThisSession: [concept],
      }),
    ).toMatchObject({ concept: 'synthetic.other', reasonCode: 'newReady' });
    const completion = event(1, { day: 200, session: 9, revisit: true });
    const after = completeReview(away, completion, coverage);
    expect(settleDueRevisit(after, concept, completion.id, false)).toBe(after);
    expect(
      conceptReview(settleDueRevisit(after, concept, completion.id), concept),
    ).toMatchObject({ reviewStage: 1, nextReviewDay: 207 });
  });

  it('prevents repeated support/review blocks and three scored tasks from starving other concepts', () => {
    const supporting = sessionCheckpoint(
      run(
        [0, 1, 2, 3, 4].map((i) =>
          event(i, { correct: i >= 3, session: i === 2 ? 2 : 1 }),
        ),
      ),
    );
    const catalog = [candidate(concept), candidate('synthetic.other')];
    expect(recommendReview(supporting, catalog, selection)).toMatchObject({
      concept,
      reasonCode: 'support',
    });
    expect(
      recommendReview(supporting, catalog, {
        ...selection,
        supportOfferedThisSession: [concept],
      }),
    ).toMatchObject({ concept: 'synthetic.other', reasonCode: 'newReady' });
    expect(
      recommendReview(supporting, catalog, {
        ...selection,
        lastConcept: concept,
        consecutiveScored: 3,
      }),
    ).toMatchObject({ concept: 'synthetic.other', reasonCode: 'newReady' });
    expect(
      recommendReview(supporting, [candidate(concept)], {
        ...selection,
        lastConcept: concept,
        consecutiveScored: 3,
      }),
    ).toMatchObject({
      concept: null,
      reasonCode: 'menu',
      alternatives: ['manualChoice', 'numberLab', 'stop'],
    });
    expect(
      recommendReview(supporting, catalog, {
        ...selection,
        supportOfferedThisSession: [concept],
        requestedHelp: concept,
      }),
    ).toMatchObject({ concept, reasonCode: 'support' });
  });

  it('selects least-recently-offered canonical ties deterministically despite catalog order', () => {
    const catalog = [
      candidate('synthetic.a'),
      candidate('synthetic.b'),
      candidate('synthetic.c', 9),
    ];
    const expected = {
      concept: 'synthetic.a',
      reasonCode: 'newReady',
      policyVersion: 'phase3-readiness-simulation-v2',
      retainedCount: 0,
      independentCount: 0,
      alternatives: ['manualChoice', 'numberLab', 'stop'],
    };
    expect(recommendReview(emptyReview(), catalog, selection)).toEqual(
      expected,
    );
    expect(
      recommendReview(emptyReview(), [...catalog].reverse(), selection),
    ).toEqual(expected);
    expect(
      recommendReview(
        emptyReview(),
        [candidate('synthetic.a', 1), candidate('synthetic.b')],
        selection,
      ).concept,
    ).toBe('synthetic.b');
    expect(
      recommendReview(emptyReview(), catalog, {
        ...selection,
        seed: 'not-a-seed',
      }).reasonCode,
    ).toBe('menu');
  });

  it('bounds priority blocks globally per session and fairly cycles least-offered equal candidates', () => {
    let snapshot = emptyReview();
    for (const id of ['synthetic.support.a', 'synthetic.support.b']) {
      snapshot = run(
        Array.from({ length: 5 }, (_, i) =>
          event(snapshot.audit.length + i, {
            concept: id,
            correct: i >= 3,
            session: i === 2 ? 2 : 1,
          }),
        ),
        coverage,
        snapshot,
      );
    }
    snapshot = sessionCheckpoint(snapshot);
    const catalog = [
      candidate('synthetic.support.a'),
      candidate('synthetic.support.b'),
      candidate('synthetic.new'),
    ];
    expect(
      recommendReview(snapshot, catalog, {
        ...selection,
        supportOfferedThisSession: ['synthetic.support.a'],
      }),
    ).toMatchObject({ concept: 'synthetic.new', reasonCode: 'newReady' });
    const dueConcepts = Object.fromEntries(
      Object.entries(snapshot.concepts).map(([id, state]) => [
        id,
        { ...state, needsSupport: false, reviewDue: true },
      ]),
    );
    expect(
      recommendReview({ ...snapshot, concepts: dueConcepts }, catalog, {
        ...selection,
        reviewOfferedThisSession: ['synthetic.support.a'],
      }),
    ).toMatchObject({ concept: 'synthetic.new', reasonCode: 'newReady' });
    let equal = [
      candidate('synthetic.a'),
      candidate('synthetic.b'),
      candidate('synthetic.c'),
    ];
    const offered: string[] = [];
    for (let turn = 1; turn <= 9; turn += 1) {
      const next = recommendReview(emptyReview(), equal, selection).concept;
      if (next === null) throw new Error('Missing fair candidate');
      offered.push(next);
      equal = equal.map((item) =>
        item.concept === next ? { ...item, lastOffered: turn } : item,
      );
    }
    expect(offered).toEqual([
      'synthetic.a',
      'synthetic.b',
      'synthetic.c',
      'synthetic.a',
      'synthetic.b',
      'synthetic.c',
      'synthetic.a',
      'synthetic.b',
      'synthetic.c',
    ]);
  });

  it('skips bounded unavailable generation and returns a safe menu when exhausted', () => {
    const unavailable = {
      ...candidate('synthetic.a'),
      generationAvailable: false,
    };
    expect(
      recommendReview(
        emptyReview(),
        [unavailable, candidate('synthetic.b')],
        selection,
      ).concept,
    ).toBe('synthetic.b');
    expect(
      recommendReview(emptyReview(), [unavailable], selection),
    ).toMatchObject({ concept: null, reasonCode: 'menu' });
  });

  it('exposes the proposed priority starvation of a new-ready concept by two Developing concepts', () => {
    let snapshot = emptyReview();
    for (const id of ['synthetic.developing.a', 'synthetic.developing.b']) {
      const offset = snapshot.audit.length;
      snapshot = run(
        Array.from({ length: 5 }, (_, i) =>
          event(offset + i, { concept: id, day: 0, session: 1 }),
        ),
        coverage,
        snapshot,
      );
      expect(conceptReview(snapshot, id).attained).toBe('Developing');
    }
    let catalog = [
      candidate('synthetic.developing.a'),
      candidate('synthetic.developing.b'),
      candidate('synthetic.unseen'),
    ];
    const offered: string[] = [];
    for (let turn = 1; turn <= 12; turn += 1) {
      const previous = offered.at(-1) ?? null;
      const next = recommendReview(snapshot, catalog, {
        ...selection,
        lastConcept: previous,
        consecutiveScored: 1,
      }).concept;
      if (next === null) throw new Error('Missing proposed-policy candidate');
      offered.push(next);
      catalog = catalog.map((item) =>
        item.concept === next ? { ...item, lastOffered: turn } : item,
      );
    }
    expect(offered).toEqual(
      Array.from({ length: 12 }, (_, i) =>
        i % 2 === 0 ? 'synthetic.developing.a' : 'synthetic.developing.b',
      ),
    );
    expect(offered).not.toContain('synthetic.unseen');
    expect(
      recommendReview(snapshot, catalog, {
        ...selection,
        explicitChoice: 'synthetic.unseen',
      }),
    ).toMatchObject({
      concept: 'synthetic.unseen',
      reasonCode: 'explicitChoice',
    });
    // Reporting this unchanged proposed-selector defect is deliberate. A new
    // lower-priority opportunity bound requires policy review and a new version.
  });

  it('identifies the finite-universe impossibility rather than inflating duplicate credit', () => {
    expect(finiteUniverseReview(4, ['groups'], singleFamily)).toEqual([
      'finiteUniverseCannotFillWindow',
    ]);
    expect(finiteUniverseReview(5, ['groups'], singleFamily)).toEqual([]);
    const four = run(
      Array.from({ length: 8 }, (_, i) =>
        event(i, {
          day: i < 4 ? 0 : 2,
          session: i < 4 ? 1 : 2,
          representation: 'groups',
          taskFingerprint: `finite.task.${i % 4}`,
          evidenceFingerprint: `finite.evidence.${i % 4}`,
        }),
      ),
      singleFamily,
    );
    expect(conceptReview(four, concept)).toMatchObject({
      attained: 'Developing',
      limitedEvidence: true,
    });
    expect(conceptReview(four, concept).observations).toHaveLength(8);
    const attempted = run(
      [
        event(20, {
          representation: 'groups',
          day: 4,
          session: 3,
          evidenceFingerprint: 'finite.evidence.0',
        }),
      ],
      singleFamily,
      four,
    );
    expect(attempted.audit.at(-1)?.outcome).toBe('excluded');
    expect(conceptReview(attempted, concept).attained).toBe('Developing');
  });

  it('demonstrates attainable Secure with five legitimate single-family cases plus delayed retrieval', () => {
    const trace = Array.from({ length: 10 }, (_, i) =>
      event(i, {
        representation: 'groups',
        taskFingerprint: `finite.task.${i % 5}`,
        evidenceFingerprint: `finite.evidence.${i % 5}`,
      }),
    );
    const snapshot = run(trace, singleFamily);
    expect(snapshot.audit.map((item) => item.outcome)).toEqual(
      Array.from({ length: 10 }, () => 'independentSuccess'),
    );
    expect(conceptReview(snapshot, concept)).toMatchObject({
      attained: 'Secure',
      limitedEvidence: false,
    });
    // This remains an educator-review-required exception proposal, not accepted
    // coverage or empirical evidence that these ten successes measure learning.
    expect(singleFamily).toMatchObject({ educatorReview: 'REQUIRED' });
  });

  it('makes bounded unit-length coverage attainable only under an explicit reviewed exception proposal', () => {
    const measurementCoverage: CoverageProposal = {
      kind: 'singleFamilyProposal',
      representation: 'representation.unit-iteration',
      minimumVariationCases: 2,
      educatorReview: 'REQUIRED',
    };
    const trace = Array.from({ length: 10 }, (_, i) =>
      event(i, {
        concept: 'measurement.length.unit-iteration',
        representation: 'representation.unit-iteration',
        domainViews: ['measurement'],
        day: i < 8 ? 0 : 2,
        session: i < 8 ? 1 : 2,
        taskFingerprint: `unit-length.${(i % 8) + 1}`,
        evidenceFingerprint: `unit-length.${(i % 8) + 1}`,
      }),
    );
    expect(
      conceptReview(
        run(trace, measurementCoverage),
        'measurement.length.unit-iteration',
      ),
    ).toMatchObject({ attained: 'Secure', limitedEvidence: false });
    expect(
      finiteUniverseReview(
        1,
        ['representation.unit-iteration'],
        measurementCoverage,
      ),
    ).toEqual(['finiteUniverseCannotFillWindow']);
  });

  it('exposes default-coverage blockers for every current Phase 2 family', () => {
    expect(
      PROOF_FAMILIES.map(
        (family) => family.metadata.representationCapabilities,
      ),
    ).toEqual([
      ['representation.addition-groups'],
      ['representation.geometry-attributes'],
      ['representation.unit-iteration'],
    ]);
    for (const family of PROOF_FAMILIES) {
      const representation = family.metadata.representationCapabilities[0];
      if (!representation) throw new Error('Missing family representation');
      expect(
        finiteUniverseReview(8, family.metadata.representationCapabilities, {
          kind: 'default',
          representations: [
            representation,
            'synthetic.second-reviewed-representation',
          ],
        }),
      ).toEqual(['requiredRepresentationUnavailable']);
    }
    const oneView = run(
      Array.from({ length: 10 }, (_, i) =>
        event(i, { representation: 'groups' }),
      ),
    );
    expect(conceptReview(oneView, concept)).toMatchObject({
      attained: 'Developing',
      limitedEvidence: true,
    });
  });

  it('cannot satisfy two-family coverage by listing the same representation twice', () => {
    const duplicatedCoverage: CoverageProposal = {
      kind: 'default',
      representations: ['groups', 'groups'],
    };
    expect(finiteUniverseReview(8, ['groups'], duplicatedCoverage)).toEqual([
      'requiredRepresentationUnavailable',
    ]);
    const snapshot = run(
      Array.from({ length: 10 }, (_, i) =>
        event(i, { representation: 'groups' }),
      ),
      duplicatedCoverage,
    );
    expect(conceptReview(snapshot, concept)).toMatchObject({
      attained: 'Developing',
      limitedEvidence: true,
    });
  });
});
