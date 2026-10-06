import { describe, expect, it } from 'vitest';
import { createPhase2EvidenceCatalog } from '../../src/domain/adaptation/catalog';
import type {
  ConceptEvidenceScope,
  SyntheticEvidenceCatalog,
} from '../../src/domain/adaptation/catalog';
import { ADAPTATION_POLICY } from '../../src/domain/adaptation/policy';
import {
  advanceSyntheticClock,
  applySyntheticObservation,
  checkpointSyntheticSession,
  confirmSyntheticReadiness,
  emptySyntheticSnapshot,
  getConceptState,
  resolveSyntheticClock,
  settleSyntheticRevisit,
} from '../../src/domain/adaptation/state';
import {
  emptySelectionMemory,
  recommendSynthetic,
} from '../../src/domain/adaptation/selection';
import type {
  AttainedState,
  EvidenceOutcome,
  SyntheticObservationInput,
  SyntheticSnapshot,
} from '../../src/domain/adaptation/types';

const checked = createPhase2EvidenceCatalog([
  {
    familyId: 'number.addition',
    maximum: 5,
    coverage: 'singleRepresentationCandidate',
  },
  {
    familyId: 'geometry.quadrilateral',
    maximum: 3,
    coverage: 'singleRepresentationCandidate',
  },
  {
    familyId: 'measurement.unit-length',
    maximum: 8,
    coverage: 'singleRepresentationCandidate',
  },
]);
if (!checked.ok) throw new Error('Invalid independent synthetic fixture');
const catalog: SyntheticEvidenceCatalog = checked.value;
const addition = catalog.scopes.find(
  (item) => item.familyId === 'number.addition',
);
if (!addition) throw new Error('Missing independent addition scope');
const scope: ConceptEvidenceScope = addition;

function event(
  index: number,
  overrides: Partial<SyntheticObservationInput> = {},
): SyntheticObservationInput {
  const evidence = scope.cases[index];
  if (!evidence) throw new Error('Missing independent evidence case');
  return {
    synthetic: true,
    id: `SYNTHETIC-independent-${index}`,
    concept: scope.conceptId,
    representation: evidence.representationId,
    taskFingerprint: evidence.fingerprint,
    evidenceFingerprint: evidence.fingerprint,
    sessionOrdinal: 1,
    coarseDay: 0,
    clockCertain: true,
    mathematicalHintTier: 0,
    solutionExposed: false,
    meaningfulAttempts: 1,
    mode: 'practice',
    completion: 'completed',
    accessible: true,
    correct: true,
    accessibilitySupports: [],
    variationCase: true,
    revisit: false,
    policyVersion: ADAPTATION_POLICY.version,
    generatorVersion: evidence.generatorVersion,
    ...overrides,
  };
}

function apply(
  snapshot: SyntheticSnapshot,
  input: SyntheticObservationInput,
  selectedCatalog = catalog,
) {
  const result = applySyntheticObservation(snapshot, input, selectedCatalog);
  if (!result.ok) throw new Error(result.error.code);
  return result;
}

function scopedEvent(
  selected: ConceptEvidenceScope,
  index: number,
  overrides: Partial<SyntheticObservationInput> = {},
): SyntheticObservationInput {
  const evidence = selected.cases[index];
  if (!evidence) throw new Error('Missing independent scoped evidence');
  return {
    ...event(0),
    id: `SYNTHETIC-scoped-${selected.familyId}-${index}`,
    concept: selected.conceptId,
    representation: evidence.representationId,
    taskFingerprint: evidence.fingerprint,
    evidenceFingerprint: evidence.fingerprint,
    generatorVersion: evidence.generatorVersion,
    ...overrides,
  };
}

// These expectations use the declared candidate's literal 5/3 and 10/8
// hypotheses. They import no production classification/summary helper or
// threshold value; changing an implementation threshold cannot change its oracle.
function fiveWindowOracle(outcomes: readonly EvidenceOutcome[]): AttainedState {
  if (
    outcomes.length === 5 &&
    outcomes.filter((item) => item === 'independentSuccess').length >= 3
  )
    return 'Developing';
  return outcomes.length === 0 ? 'Unseen' : 'Emerging';
}

function tenWindowOracle(outcomes: readonly EvidenceOutcome[]): AttainedState {
  if (
    outcomes.length === 10 &&
    outcomes.filter((item) => item === 'independentSuccess').length >= 8
  )
    return 'Secure';
  return fiveWindowOracle(outcomes.slice(-5));
}

const stateRank: readonly AttainedState[] = [
  'Unseen',
  'Emerging',
  'Developing',
  'Secure',
];
const eligibleOutcomes: readonly EvidenceOutcome[] = [
  'independentSuccess',
  'supportedSuccess',
  'unsuccessful',
];

describe('independent synthetic adaptation state sequences', () => {
  it('enumerates all 243 full support windows against an independent outcome and checkpoint oracle', () => {
    for (let code = 0; code < 243; code += 1) {
      let snapshot = emptySyntheticSnapshot();
      let digits = code;
      const outcomes: EvidenceOutcome[] = [];
      const difficultySessions = new Set<number>();
      for (let index = 0; index < 5; index += 1) {
        const expected = eligibleOutcomes[digits % 3];
        if (!expected) throw new Error('Invalid independent outcome digit');
        digits = Math.floor(digits / 3);
        outcomes.push(expected);
        const sessionOrdinal = index < 2 ? 1 : 2;
        if (expected !== 'independentSuccess')
          difficultySessions.add(sessionOrdinal);
        const result = apply(
          snapshot,
          event(index, {
            sessionOrdinal,
            correct: expected !== 'unsuccessful',
            mathematicalHintTier: expected === 'supportedSuccess' ? 1 : 0,
          }),
        );
        expect(result.observation.outcome).toBe(expected);
        snapshot = result.snapshot;
        expect(getConceptState(snapshot, scope.conceptId).recentState).toBe(
          fiveWindowOracle(outcomes),
        );
        expect(getConceptState(snapshot, scope.conceptId).needsSupport).toBe(
          false,
        );
      }
      const checkpoint = checkpointSyntheticSession(snapshot);
      const expectedSupport =
        outcomes.filter((item) => item !== 'independentSuccess').length >= 3 &&
        difficultySessions.size === 2;
      expect(getConceptState(checkpoint, scope.conceptId)).toMatchObject({
        needsSupport: expectedSupport,
        supportActivatedAfter: expectedSupport ? 5 : 0,
        lastCheckpointOrdinal: 5,
        attained: fiveWindowOracle(outcomes),
      });
      expect(checkpointSyntheticSession(checkpoint)).toEqual(checkpoint);
    }
  }, 15_000);

  it('enumerates all 1024 independent/support masks through Secure and preserves the highest prior attainment', () => {
    for (let mask = 0; mask < 1024; mask += 1) {
      let snapshot = emptySyntheticSnapshot();
      const outcomes: EvidenceOutcome[] = [];
      let expectedAttainment: AttainedState = 'Unseen';
      for (let index = 0; index < 10; index += 1) {
        const independent = Boolean(mask & (1 << index));
        outcomes.push(independent ? 'independentSuccess' : 'supportedSuccess');
        const current = tenWindowOracle(outcomes);
        if (stateRank.indexOf(current) > stateRank.indexOf(expectedAttainment))
          expectedAttainment = current;
        snapshot = apply(
          snapshot,
          event(index % 5, {
            id: `SYNTHETIC-mask-${mask}-${index}`,
            sessionOrdinal: index < 5 ? 1 : 2,
            coarseDay: index < 5 ? 0 : 2,
            mathematicalHintTier: independent ? 0 : 1,
            revisit: index >= 5,
          }),
        ).snapshot;
        expect(getConceptState(snapshot, scope.conceptId)).toMatchObject({
          recentState: current,
          attained: expectedAttainment,
          limitedEvidence: current !== 'Secure',
        });
      }
      const state = getConceptState(snapshot, scope.conceptId);
      expect(state.observations).toHaveLength(10);
      expect(state.representationEvidence[0]?.independent).toBe(
        outcomes.filter((item) => item === 'independentSuccess').length,
      );
      expect(state.attainment?.state).toBe(expectedAttainment);
    }
  }, 60_000);

  it('uses a monotone session fence across concepts while exact old retries stay frozen after expiry', () => {
    const original = event(0, { sessionOrdinal: 2, coarseDay: 10 });
    const first = apply(emptySyntheticSnapshot(), original);
    const expired = advanceSyntheticClock(first.snapshot, 71, true, catalog);
    expect(getConceptState(expired, scope.conceptId)).toMatchObject({
      observations: [],
      attained: 'Emerging',
      recentState: 'Unseen',
      limitedEvidence: true,
    });
    const retry = apply(expired, original);
    expect(retry.exactRetry).toBe(true);
    expect(retry.snapshot).toBe(expired);
    expect(retry.observation).toBe(first.observation);
    expect(retry.observation.clockCertain).toBe(true);
    for (const mode of ['practice', 'diagnostic'] as const)
      expect(
        applySyntheticObservation(
          first.snapshot,
          event(0, {
            id: `SYNTHETIC-backward-${mode}`,
            mode,
            sessionOrdinal: 1,
            coarseDay: 12,
          }),
          catalog,
        ),
      ).toEqual({ ok: false, error: { code: 'invalidObservation' } });
    const geometry = catalog.scopes.find(
      (item) => item.familyId === 'geometry.quadrilateral',
    );
    const evidence = geometry?.cases[0];
    if (!geometry || !evidence)
      throw new Error('Missing separate concept evidence');
    expect(
      applySyntheticObservation(
        expired,
        {
          ...event(0),
          id: 'SYNTHETIC-backward-other-concept',
          concept: geometry.conceptId,
          representation: evidence.representationId,
          taskFingerprint: evidence.fingerprint,
          evidenceFingerprint: evidence.fingerprint,
          generatorVersion: evidence.generatorVersion,
          sessionOrdinal: 1,
          coarseDay: 71,
        },
        catalog,
      ),
    ).toEqual({ ok: false, error: { code: 'invalidObservation' } });
  });

  it('treats every catalog-scope permutation as the same observation and selection catalog', () => {
    const [a, b, c] = catalog.scopes;
    if (!a || !b || !c) throw new Error('Missing independent scopes');
    const permutations = [
      [a, b, c],
      [a, c, b],
      [b, a, c],
      [b, c, a],
      [c, a, b],
      [c, b, a],
    ];
    const snapshot = apply(emptySyntheticSnapshot(), event(0)).snapshot;
    const candidates = catalog.scopes.map((item) => ({
      concept: item.conceptId,
      prerequisiteReady: true,
      generationAvailable: true,
    }));
    const input = {
      snapshot,
      evidenceCatalog: catalog,
      catalog: candidates,
      intent: { kind: 'automatic' as const },
      policyVersion: ADAPTATION_POLICY.version,
      coarseDay: 0,
      clockCertain: true,
      sessionOrdinal: 1,
      seed: '00000001000000000000000000000000',
      memory: emptySelectionMemory(snapshot),
    };
    const expected = recommendSynthetic(input);
    expect(expected.reasonCode).toBe('newReadyConcept');
    for (const scopes of permutations) {
      const reordered = { ...catalog, scopes };
      expect(apply(snapshot, event(1), reordered).snapshot).toEqual(
        apply(snapshot, event(1)).snapshot,
      );
      expect(
        recommendSynthetic({
          ...input,
          evidenceCatalog: reordered,
          catalog: [...candidates].reverse(),
        }),
      ).toEqual(expected);
    }
  });

  it('freezes uncertain observation provenance across resolution and advances only a later due independent revisit once', () => {
    const first = apply(emptySyntheticSnapshot(), event(0, { coarseDay: 10 }));
    const scheduled = confirmSyntheticReadiness(
      first.snapshot,
      scope.conceptId,
      first.observation.input.id,
    );
    const rollback = advanceSyntheticClock(scheduled, 9, true, catalog);
    const fresh = apply(
      rollback,
      event(1, {
        id: 'SYNTHETIC-uncertain-fresh',
        coarseDay: 100,
        sessionOrdinal: 2,
        revisit: true,
      }),
    );
    expect(fresh.observation).toMatchObject({
      outcome: 'independentSuccess',
      clockCertain: false,
    });
    expect(fresh.snapshot).toMatchObject({
      clockCertain: false,
      lastTrustedDay: 10,
    });
    expect(getConceptState(fresh.snapshot, scope.conceptId)).toMatchObject({
      reviewStage: 0,
      nextReviewDay: 12,
      observations: [expect.anything(), expect.anything()],
    });
    expect(
      settleSyntheticRevisit(
        fresh.snapshot,
        scope.conceptId,
        fresh.observation.input.id,
      ),
    ).toBe(fresh.snapshot);
    const resolved = resolveSyntheticClock(fresh.snapshot, 12, catalog);
    expect(resolved.clockCertain).toBe(true);
    const uncertainRetry = apply(resolved, fresh.observation.input);
    expect(uncertainRetry.snapshot).toBe(resolved);
    expect(uncertainRetry.observation.clockCertain).toBe(false);
    const priorUncertain = apply(
      resolved,
      event(1, {
        id: 'SYNTHETIC-retry-uncertain-source',
        coarseDay: 102,
        sessionOrdinal: 3,
      }),
    );
    expect(priorUncertain.observation).toMatchObject({
      outcome: 'excluded',
      reasonCode: 'clockUncertain',
    });
    const due = apply(
      resolved,
      event(0, {
        id: 'SYNTHETIC-certain-due',
        coarseDay: 12,
        sessionOrdinal: 3,
        revisit: true,
      }),
    );
    expect(due.observation.outcome).toBe('independentSuccess');
    const settled = settleSyntheticRevisit(
      due.snapshot,
      scope.conceptId,
      due.observation.input.id,
    );
    expect(getConceptState(settled, scope.conceptId)).toMatchObject({
      reviewStage: 1,
      nextReviewDay: 19,
      reviewDue: false,
    });
    expect(
      settleSyntheticRevisit(
        settled,
        scope.conceptId,
        due.observation.input.id,
      ),
    ).toBe(settled);
  });

  it('keeps exploration outside session, receipt, clock, and schedule fences before new practice confirmation', () => {
    const first = apply(
      emptySyntheticSnapshot(),
      event(0, { sessionOrdinal: 2, coarseDay: 10 }),
    );
    const scheduled = confirmSyntheticReadiness(
      first.snapshot,
      scope.conceptId,
      first.observation.input.id,
    );
    for (const mode of ['exploration', 'numberLab'] as const) {
      const exposure = apply(
        scheduled,
        event(1, {
          id: 'SYNTHETIC-neutral-exposure',
          mode,
          sessionOrdinal: 999,
          coarseDay: 200,
          clockCertain: false,
        }),
      );
      expect(exposure.snapshot).toBe(scheduled);
      expect(exposure.observation).toMatchObject({
        outcome: 'excluded',
        reasonCode: 'nonPractice',
      });
      const confirmation = apply(
        exposure.snapshot,
        event(1, {
          id: 'SYNTHETIC-independent-confirmation',
          sessionOrdinal: 3,
          coarseDay: 12,
        }),
      );
      expect(confirmation.observation.outcome).toBe('independentSuccess');
      expect(confirmation.snapshot.receipts).toHaveLength(2);
      expect(
        getConceptState(confirmation.snapshot, scope.conceptId),
      ).toMatchObject({ reviewStage: 0, nextReviewDay: 12 });
    }
  });

  it('settles at most one due revisit per explicit session even when later coarse dates pass', () => {
    const first = apply(emptySyntheticSnapshot(), event(0));
    const scheduled = confirmSyntheticReadiness(
      first.snapshot,
      scope.conceptId,
      first.observation.input.id,
    );
    const firstDue = apply(
      scheduled,
      event(1, {
        coarseDay: 2,
        sessionOrdinal: 2,
        revisit: true,
      }),
    );
    const firstSettlement = settleSyntheticRevisit(
      firstDue.snapshot,
      scope.conceptId,
      firstDue.observation.input.id,
    );
    expect(getConceptState(firstSettlement, scope.conceptId)).toMatchObject({
      reviewStage: 1,
      nextReviewDay: 9,
    });
    const sameSession = apply(
      firstSettlement,
      event(2, {
        coarseDay: 9,
        sessionOrdinal: 2,
        revisit: true,
      }),
    );
    expect(
      settleSyntheticRevisit(
        sameSession.snapshot,
        scope.conceptId,
        sameSession.observation.input.id,
      ),
    ).toBe(sameSession.snapshot);
    expect(
      getConceptState(sameSession.snapshot, scope.conceptId),
    ).toMatchObject({
      reviewStage: 1,
      nextReviewDay: 9,
    });
    const nextSession = apply(
      sameSession.snapshot,
      event(3, {
        coarseDay: 9,
        sessionOrdinal: 3,
        revisit: true,
      }),
    );
    const nextSettlement = settleSyntheticRevisit(
      nextSession.snapshot,
      scope.conceptId,
      nextSession.observation.input.id,
    );
    expect(getConceptState(nextSettlement, scope.conceptId)).toMatchObject({
      reviewStage: 2,
      nextReviewDay: 30,
    });
  });

  it('shares the one-settlement session fence across due concepts without consuming it on readiness confirmation', () => {
    const geometry = catalog.scopes.find(
      (item) => item.familyId === 'geometry.quadrilateral',
    );
    if (!geometry) throw new Error('Missing separate concept scope');
    function geometryEvent(
      index: number,
      overrides: Partial<SyntheticObservationInput> = {},
    ): SyntheticObservationInput {
      const evidence = geometry?.cases[index];
      if (!geometry || !evidence)
        throw new Error('Missing separate concept evidence');
      return {
        ...event(0),
        id: `SYNTHETIC-global-review-${index}`,
        concept: geometry.conceptId,
        representation: evidence.representationId,
        taskFingerprint: evidence.fingerprint,
        evidenceFingerprint: evidence.fingerprint,
        generatorVersion: evidence.generatorVersion,
        ...overrides,
      };
    }
    const first = apply(emptySyntheticSnapshot(), event(0));
    const second = apply(first.snapshot, geometryEvent(0));
    const scheduledFirst = confirmSyntheticReadiness(
      second.snapshot,
      scope.conceptId,
      first.observation.input.id,
    );
    const scheduledBoth = confirmSyntheticReadiness(
      scheduledFirst,
      geometry.conceptId,
      second.observation.input.id,
    );
    const firstDue = apply(
      scheduledBoth,
      event(1, { coarseDay: 2, sessionOrdinal: 2, revisit: true }),
    );
    const firstSettlement = settleSyntheticRevisit(
      firstDue.snapshot,
      scope.conceptId,
      firstDue.observation.input.id,
    );
    expect(getConceptState(firstSettlement, scope.conceptId)).toMatchObject({
      reviewStage: 1,
      nextReviewDay: 9,
    });
    const secondDue = apply(
      firstSettlement,
      geometryEvent(1, { coarseDay: 2, sessionOrdinal: 2, revisit: true }),
    );
    expect(
      settleSyntheticRevisit(
        secondDue.snapshot,
        geometry.conceptId,
        secondDue.observation.input.id,
      ),
    ).toBe(secondDue.snapshot);
    expect(
      getConceptState(secondDue.snapshot, geometry.conceptId),
    ).toMatchObject({
      reviewStage: 0,
      nextReviewDay: 2,
    });
    const nextSession = apply(
      secondDue.snapshot,
      geometryEvent(2, { coarseDay: 2, sessionOrdinal: 3, revisit: true }),
    );
    const secondSettlement = settleSyntheticRevisit(
      nextSession.snapshot,
      geometry.conceptId,
      nextSession.observation.input.id,
    );
    expect(getConceptState(secondSettlement, geometry.conceptId)).toMatchObject(
      {
        reviewStage: 1,
        nextReviewDay: 9,
      },
    );
  });

  it('does not rewind the global review-session fence by settling an older pending concept event', () => {
    const geometry = catalog.scopes.find(
      (item) => item.familyId === 'geometry.quadrilateral',
    );
    if (!geometry) throw new Error('Missing independent geometry scope');
    const first = apply(emptySyntheticSnapshot(), event(0));
    const second = apply(first.snapshot, scopedEvent(geometry, 0));
    const scheduledFirst = confirmSyntheticReadiness(
      second.snapshot,
      scope.conceptId,
      first.observation.input.id,
    );
    const scheduledBoth = confirmSyntheticReadiness(
      scheduledFirst,
      geometry.conceptId,
      second.observation.input.id,
    );
    const pending = apply(
      scheduledBoth,
      event(1, { coarseDay: 2, sessionOrdinal: 2, revisit: true }),
    );
    const current = apply(
      pending.snapshot,
      scopedEvent(geometry, 1, {
        coarseDay: 2,
        sessionOrdinal: 3,
        revisit: true,
      }),
    );
    const settledCurrent = settleSyntheticRevisit(
      current.snapshot,
      geometry.conceptId,
      current.observation.input.id,
    );
    expect(getConceptState(settledCurrent, geometry.conceptId)).toMatchObject({
      reviewStage: 1,
      nextReviewDay: 9,
    });
    const lateSettlement = settleSyntheticRevisit(
      settledCurrent,
      scope.conceptId,
      pending.observation.input.id,
    );
    expect(lateSettlement).toBe(settledCurrent);
    expect(getConceptState(lateSettlement, scope.conceptId)).toMatchObject({
      reviewStage: 0,
      nextReviewDay: 2,
    });
    const sameSessionLaterDate = apply(
      lateSettlement,
      scopedEvent(geometry, 2, {
        coarseDay: 9,
        sessionOrdinal: 3,
        revisit: true,
      }),
    );
    expect(
      settleSyntheticRevisit(
        sameSessionLaterDate.snapshot,
        geometry.conceptId,
        sameSessionLaterDate.observation.input.id,
      ),
    ).toBe(sameSessionLaterDate.snapshot);
  });
});
