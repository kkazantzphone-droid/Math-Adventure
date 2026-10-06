import { describe, expect, it } from 'vitest';
import { createPhase2EvidenceCatalog } from '../../src/domain/adaptation/catalog';
import type {
  ConceptEvidenceScope,
  SyntheticEvidenceCatalog,
} from '../../src/domain/adaptation/catalog';
import {
  ADAPTATION_POLICY,
  SYNTHETIC_ENGINE_LIMITS,
} from '../../src/domain/adaptation/policy';
import {
  advanceSyntheticClock,
  applySyntheticObservation,
  checkpointSyntheticSession,
  confirmSyntheticReadiness,
  emptySyntheticSnapshot,
  getConceptState,
  immediateSyntheticSupportChoices,
  representationEvidence,
  resolveSyntheticClock,
  settleSyntheticRevisit,
  syntheticObservationFromInput,
} from '../../src/domain/adaptation/state';
import type {
  FrozenObservation,
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
if (!checked.ok) throw new Error('Invalid synthetic test catalog');
const catalog: SyntheticEvidenceCatalog = checked.value;
const addition = catalog.scopes.find(
  (scope) => scope.familyId === 'number.addition',
);
if (!addition) throw new Error('Missing synthetic addition');
const scope: ConceptEvidenceScope = addition;

function observation(
  index: number,
  overrides: Partial<SyntheticObservationInput> = {},
  selected = scope,
): SyntheticObservationInput {
  const evidence = selected.cases[index % selected.cases.length];
  if (!evidence) throw new Error('Missing synthetic evidence');
  return {
    synthetic: true,
    id: `SYNTHETIC-observation-${index}`,
    concept: selected.conceptId,
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

function complete(
  snapshot: SyntheticSnapshot,
  input: SyntheticObservationInput,
): {
  readonly snapshot: SyntheticSnapshot;
  readonly observation: FrozenObservation;
} {
  const result = applySyntheticObservation(snapshot, input, catalog);
  if (!result.ok) throw new Error(result.error.code);
  return result;
}

function secureSnapshot(): SyntheticSnapshot {
  let snapshot = emptySyntheticSnapshot();
  for (let index = 0; index < 10; index += 1) {
    const original = observation(index % 5);
    snapshot = complete(snapshot, {
      ...original,
      id: `SYNTHETIC-secure-${index}`,
      sessionOrdinal: index < 5 ? 1 : 2,
      coarseDay: index < 5 ? 0 : 2,
      revisit: index >= 5,
    }).snapshot;
  }
  return snapshot;
}

describe('synthetic adaptation structured observations', () => {
  it('exhausts structured classification flags against a separate direct rule oracle', () => {
    let cases = 0;
    for (const mode of [
      'practice',
      'diagnostic',
      'exploration',
      'numberLab',
    ] as const)
      for (const completion of [
        'completed',
        'skipped',
        'interrupted',
        'adapterFailed',
        'abandoned',
      ] as const)
        for (const accessible of [true, false])
          for (const correct of [true, false])
            for (const meaningfulAttempts of [1, 2, 3] as const)
              for (const mathematicalHintTier of [0, 1, 2, 3] as const)
                for (const solutionExposed of [true, false]) {
                  const expected =
                    mode !== 'practice' ||
                    completion !== 'completed' ||
                    !accessible ||
                    solutionExposed
                      ? 'excluded'
                      : !correct
                        ? 'unsuccessful'
                        : meaningfulAttempts > 1 || mathematicalHintTier > 0
                          ? 'supportedSuccess'
                          : 'independentSuccess';
                  const result = complete(
                    emptySyntheticSnapshot(),
                    observation(0, {
                      mode,
                      completion,
                      accessible,
                      correct,
                      meaningfulAttempts,
                      mathematicalHintTier,
                      solutionExposed,
                    }),
                  );
                  expect(result.observation.outcome).toBe(expected);
                  expect(
                    getConceptState(result.snapshot, scope.conceptId)
                      .observations,
                  ).toHaveLength(expected === 'excluded' ? 0 : 1);
                  cases += 1;
                }
    expect(cases).toBe(1920);
  }, 15_000);
  it('starts unseen and cannot accept an arbitrary named profile', () => {
    const snapshot = emptySyntheticSnapshot();
    expect(getConceptState(snapshot, scope.conceptId)).toMatchObject({
      attained: 'Unseen',
      recentState: 'Unseen',
      limitedEvidence: true,
    });
    expect(() =>
      emptySyntheticSnapshot('SYNTHETIC-arbitrary' as 'SYNTHETIC-PLAYER-1'),
    ).toThrow('invalidSyntheticProfile');
    expect(emptySyntheticSnapshot('SYNTHETIC-PLAYER-2').profileId).toBe(
      'SYNTHETIC-PLAYER-2',
    );
  });

  it.each([
    [{}, 'independentSuccess', 'independent'],
    [{ mathematicalHintTier: 1 }, 'supportedSuccess', 'mathematicalSupport'],
    [{ meaningfulAttempts: 2 }, 'supportedSuccess', 'mathematicalSupport'],
    [{ correct: false }, 'unsuccessful', 'unsuccessful'],
    [{ solutionExposed: true }, 'excluded', 'solutionExposed'],
    [{ accessible: false }, 'excluded', 'inaccessibleScope'],
    [{ completion: 'skipped' }, 'excluded', 'notCompleted'],
    [{ completion: 'adapterFailed' }, 'excluded', 'notCompleted'],
    [{ completion: 'abandoned' }, 'excluded', 'notCompleted'],
  ] as const)(
    'classifies %j against explicit semantics',
    (overrides, outcome, reasonCode) => {
      const result = complete(
        emptySyntheticSnapshot(),
        observation(0, overrides),
      );
      expect(result.observation).toMatchObject({ outcome, reasonCode });
      expect(
        getConceptState(result.snapshot, scope.conceptId).observations,
      ).toHaveLength(outcome === 'excluded' ? 0 : 1);
    },
  );

  it('keeps every accessibility support neutral while mathematical help is separate', () => {
    const supports = [
      'screenReader',
      'speechReplay',
      'enlargedText',
      'alternateControls',
      'instructionClarification',
    ] as const;
    for (const support of supports) {
      expect(
        complete(
          emptySyntheticSnapshot(),
          observation(0, { accessibilitySupports: [support] }),
        ).observation.outcome,
      ).toBe('independentSuccess');
    }
    expect(
      complete(
        emptySyntheticSnapshot(),
        observation(0, {
          accessibilitySupports: ['screenReader'],
          mathematicalHintTier: 2,
        }),
      ).observation.outcome,
    ).toBe('supportedSuccess');
  });

  it('rejects unknown fields, timing/prose, invalid ranges and accessor payloads', () => {
    const input = observation(0);
    for (const raw of [
      { ...input, prose: 'not an allowed field' },
      { ...input, elapsedMs: 100 },
      { ...input, meaningfulAttempts: 0 },
      { ...input, coarseDay: -1 },
      { ...input, mathematicalHintTier: 4 },
      { ...input, sessionOrdinal: 1.1 },
      { ...input, synthetic: false },
    ]) {
      expect(
        applySyntheticObservation(emptySyntheticSnapshot(), raw, catalog),
      ).toEqual({ ok: false, error: { code: 'invalidObservation' } });
    }
    const accessor = { ...input };
    Object.defineProperty(accessor, 'correct', {
      get: () => {
        throw new Error('must not run');
      },
      enumerable: true,
    });
    expect(syntheticObservationFromInput(accessor)).toBeUndefined();
  });

  it('requires catalog evidence and rejects forged fingerprints, representation and versions', () => {
    for (const override of [
      { evidenceFingerprint: 'cosmetic-colour-blue' },
      { representation: 'representation.fake' },
      { generatorVersion: 'fake-v1' },
      { taskFingerprint: 'same-operands-new-instance' },
    ]) {
      expect(
        applySyntheticObservation(
          emptySyntheticSnapshot(),
          observation(0, override),
          catalog,
        ),
      ).toEqual({ ok: false, error: { code: 'unknownEvidence' } });
    }
    expect(
      applySyntheticObservation(
        emptySyntheticSnapshot(),
        observation(0, { policyVersion: 'accepted-policy-v1' }),
        catalog,
      ),
    ).toEqual({ ok: false, error: { code: 'unsupportedPolicy' } });
  });

  it('freezes classification before event insertion and handles exact retry independent of property order', () => {
    const input = observation(0);
    const first = complete(emptySyntheticSnapshot(), input);
    const reverseKeys = Object.fromEntries(Object.entries(input).reverse());
    const retry = applySyntheticObservation(
      first.snapshot,
      reverseKeys,
      catalog,
    );
    expect(retry).toMatchObject({ ok: true, exactRetry: true });
    if (!retry.ok) throw new Error('Retry rejected');
    expect(retry.snapshot).toBe(first.snapshot);
    expect(retry.observation.outcome).toBe('independentSuccess');
    expect(
      applySyntheticObservation(
        first.snapshot,
        { ...input, correct: false },
        catalog,
      ),
    ).toEqual({ ok: false, error: { code: 'conflictingRetry' } });
    expect(Object.isFrozen(first.snapshot)).toBe(true);
    expect(Object.isFrozen(first.observation.input)).toBe(true);
    expect(Object.isFrozen(first.observation.input.accessibilitySupports)).toBe(
      true,
    );
    expect(Object.isFrozen(first.snapshot.concepts)).toBe(true);
    expect(() =>
      Reflect.set(first.observation.input, 'correct', false),
    ).not.toThrow();
    expect(first.observation.input.correct).toBe(true);
  });

  it('allows a second same fingerprint only after two days and a different explicit session', () => {
    const initial = complete(emptySyntheticSnapshot(), observation(0)).snapshot;
    for (const overrides of [
      { coarseDay: 1, sessionOrdinal: 2 },
      { coarseDay: 2, sessionOrdinal: 1 },
    ]) {
      expect(
        complete(
          initial,
          observation(0, { id: 'SYNTHETIC-repeat', ...overrides }),
        ).observation,
      ).toMatchObject({
        outcome: 'excluded',
        reasonCode: 'immediateDuplicate',
      });
    }
    const delayed = complete(
      initial,
      observation(0, {
        id: 'SYNTHETIC-delayed',
        coarseDay: 2,
        sessionOrdinal: 2,
      }),
    );
    expect(delayed.observation.outcome).toBe('independentSuccess');
    expect(
      complete(
        delayed.snapshot,
        observation(0, {
          id: 'SYNTHETIC-third',
          coarseDay: 4,
          sessionOrdinal: 3,
        }),
      ).observation.reasonCode,
    ).toBe('retrievalLimit');
  });

  it('keeps declined diagnostic probes neutral and successful probes readiness-only', () => {
    const declined = complete(
      emptySyntheticSnapshot(),
      observation(0, { mode: 'diagnostic', completion: 'skipped' }),
    ).snapshot;
    expect(declined.diagnostics).toEqual([]);
    expect(getConceptState(declined, scope.conceptId).attained).toBe('Unseen');
    const diagnostic = complete(
      emptySyntheticSnapshot(),
      observation(0, { mode: 'diagnostic' }),
    );
    expect(diagnostic.observation.outcome).toBe('excluded');
    expect(diagnostic.snapshot.diagnostics).toEqual([
      {
        concept: scope.conceptId,
        representation: scope.representations[0],
        coarseDay: 0,
        clockCertain: true,
      },
    ]);
    expect(
      getConceptState(diagnostic.snapshot, scope.conceptId).observations,
    ).toEqual([]);
    expect(
      getConceptState(diagnostic.snapshot, 'counting.cardinality').attained,
    ).toBe('Unseen');
  });
});

describe('synthetic scoped attainment and bounded recent sufficiency', () => {
  it('requires all developing-window criteria, not merely three successes', () => {
    let snapshot = emptySyntheticSnapshot();
    for (let index = 0; index < 4; index += 1)
      snapshot = complete(snapshot, observation(index)).snapshot;
    expect(getConceptState(snapshot, scope.conceptId).attained).toBe(
      'Emerging',
    );
    snapshot = complete(snapshot, observation(4, { correct: false })).snapshot;
    expect(getConceptState(snapshot, scope.conceptId)).toMatchObject({
      attained: 'Developing',
      recentState: 'Developing',
      limitedEvidence: true,
    });
    let insufficient = emptySyntheticSnapshot();
    for (let index = 0; index < 5; index += 1)
      insufficient = complete(
        insufficient,
        observation(index, { correct: index < 2 }),
      ).snapshot;
    expect(getConceptState(insufficient, scope.conceptId).attained).toBe(
      'Emerging',
    );
  });

  it('crosses Secure only at the full ten/eight/two-session/two-variation boundary', () => {
    const secure = secureSnapshot();
    expect(getConceptState(secure, scope.conceptId)).toMatchObject({
      attained: 'Secure',
      recentState: 'Secure',
      limitedEvidence: false,
      attainment: {
        retainedCount: 10,
        independentCount: 10,
        coverageCandidate: 'singleRepresentationCandidate',
        educatorReview: 'required',
      },
    });
    for (const defect of [
      'nine',
      'sevenIndependent',
      'oneSession',
      'oneVariation',
    ] as const) {
      let snapshot = emptySyntheticSnapshot();
      for (let index = 0; index < (defect === 'nine' ? 9 : 10); index += 1) {
        // Ten distinct real evidence cases make the one-session boundary observable.
        snapshot = complete(
          snapshot,
          observation(index, {
            sessionOrdinal: defect === 'oneSession' || index < 5 ? 1 : 2,
            coarseDay: index < 5 ? 0 : 2,
            correct: defect !== 'sevenIndependent' || index < 7,
            variationCase: defect !== 'oneVariation' || index === 0,
          }),
        ).snapshot;
      }
      expect(getConceptState(snapshot, scope.conceptId).attained).not.toBe(
        'Secure',
      );
    }
  });

  it('records independent representation scope without transferring related/domain evidence', () => {
    const snapshot = secureSnapshot();
    expect(
      representationEvidence(
        snapshot,
        scope.conceptId,
        scope.representations[0] ?? '',
      ),
    ).toMatchObject({ retained: 10, independent: 10, supported: 0 });
    for (const concept of [
      'counting.cardinality',
      'geometry.quadrilateral.attributes',
      'measurement.length.unit-iteration',
      'powers.square-numbers',
      'roots.perfect-square',
    ])
      expect(getConceptState(snapshot, concept).attained).toBe('Unseen');
    const geometry = catalog.scopes.find(
      (item) => item.familyId === 'geometry.quadrilateral',
    );
    const measurement = catalog.scopes.find(
      (item) => item.familyId === 'measurement.unit-length',
    );
    if (!geometry || !measurement) throw new Error('Missing domains');
    let different = complete(
      snapshot,
      observation(
        0,
        {
          id: 'SYNTHETIC-geometry',
          mathematicalHintTier: 1,
          coarseDay: 2,
          sessionOrdinal: 2,
        },
        geometry,
      ),
    ).snapshot;
    different = complete(
      different,
      observation(
        0,
        {
          id: 'SYNTHETIC-measurement',
          correct: false,
          coarseDay: 2,
          sessionOrdinal: 2,
        },
        measurement,
      ),
    ).snapshot;
    expect(getConceptState(different, scope.conceptId).attained).toBe('Secure');
    expect(getConceptState(different, geometry.conceptId)).toMatchObject({
      attained: 'Emerging',
      representationEvidence: [{ supported: 1 }],
    });
    expect(getConceptState(different, measurement.conceptId)).toMatchObject({
      attained: 'Emerging',
      representationEvidence: [{ unsuccessful: 1 }],
    });
    expect(
      getConceptState(
        emptySyntheticSnapshot('SYNTHETIC-PLAYER-2'),
        scope.conceptId,
      ).attained,
    ).toBe('Unseen');
  });

  it('preserves attained accomplishment through failure and expiry with honest recent counts', () => {
    const secure = secureSnapshot();
    const difficulty = complete(
      secure,
      observation(6, { coarseDay: 3, sessionOrdinal: 3, correct: false }),
    ).snapshot;
    expect(getConceptState(difficulty, scope.conceptId).attained).toBe(
      'Secure',
    );
    const day60 = advanceSyntheticClock(secure, 60, true, catalog);
    expect(getConceptState(day60, scope.conceptId).observations).toHaveLength(
      10,
    );
    const day61 = advanceSyntheticClock(secure, 61, true, catalog);
    expect(getConceptState(day61, scope.conceptId).observations).toHaveLength(
      5,
    );
    const expired = advanceSyntheticClock(secure, 63, true, catalog);
    expect(getConceptState(expired, scope.conceptId)).toMatchObject({
      attained: 'Secure',
      recentState: 'Unseen',
      observations: [],
      limitedEvidence: true,
      attainment: { independentCount: 10, retainedCount: 10 },
    });
  });

  it('evicts oldest retained evidence while exact historical retries stay frozen', () => {
    let snapshot = emptySyntheticSnapshot();
    for (let index = 0; index < 15; index += 1)
      snapshot = complete(snapshot, observation(index)).snapshot;
    expect(
      getConceptState(snapshot, scope.conceptId).observations.map(
        (item) => item.input.id,
      ),
    ).toEqual(
      Array.from(
        { length: 10 },
        (_, index) => `SYNTHETIC-observation-${index + 5}`,
      ),
    );
    const retry = applySyntheticObservation(snapshot, observation(0), catalog);
    expect(retry).toMatchObject({
      ok: true,
      exactRetry: true,
      observation: { outcome: 'independentSuccess' },
    });
    if (!retry.ok) throw new Error('Retry rejected');
    expect(retry.snapshot).toBe(snapshot);
  });

  it('refuses impossible default coverage, finite universes and changed catalogs', () => {
    const impossible = createPhase2EvidenceCatalog([
      {
        familyId: 'measurement.unit-length',
        maximum: 4,
        coverage: 'singleRepresentationCandidate',
      },
    ]);
    const defaults = createPhase2EvidenceCatalog([
      { familyId: 'number.addition', maximum: 5, coverage: 'default' },
    ]);
    if (!impossible.ok || !defaults.ok) throw new Error('Malformed catalog');
    expect(
      applySyntheticObservation(
        emptySyntheticSnapshot(),
        observation(0),
        impossible.value,
      ),
    ).toEqual({ ok: false, error: { code: 'invalidCatalog' } });
    expect(
      applySyntheticObservation(
        emptySyntheticSnapshot(),
        observation(0),
        defaults.value,
      ),
    ).toEqual({ ok: false, error: { code: 'invalidCatalog' } });
    const snapshot = complete(
      emptySyntheticSnapshot(),
      observation(0),
    ).snapshot;
    const changed = createPhase2EvidenceCatalog([
      {
        familyId: 'number.addition',
        maximum: 4,
        coverage: 'singleRepresentationCandidate',
      },
    ]);
    if (!changed.ok) throw new Error('Malformed catalog');
    expect(
      applySyntheticObservation(snapshot, observation(1), changed.value),
    ).toEqual({ ok: false, error: { code: 'catalogChanged' } });
    expect(advanceSyntheticClock(snapshot, 61, true, changed.value)).toBe(
      snapshot,
    );
    expect(resolveSyntheticClock(snapshot, 61, impossible.value)).toBe(
      snapshot,
    );
    const reversed = { ...catalog, scopes: [...catalog.scopes].reverse() };
    expect(
      applySyntheticObservation(snapshot, observation(1), reversed),
    ).toMatchObject({ ok: true });
    const unsupported = { ...snapshot, policyVersion: 'future-policy-v9' };
    expect(advanceSyntheticClock(unsupported, 61, true, catalog)).toBe(
      unsupported,
    );
    expect(resolveSyntheticClock(unsupported, 61, catalog)).toBe(unsupported);
    expect(checkpointSyntheticSession(unsupported)).toBe(unsupported);
    expect(
      confirmSyntheticReadiness(
        unsupported,
        scope.conceptId,
        'SYNTHETIC-observation-0',
      ),
    ).toBe(unsupported);
    expect(
      settleSyntheticRevisit(
        unsupported,
        scope.conceptId,
        'SYNTHETIC-observation-0',
      ),
    ).toBe(unsupported);
  });
});

describe('synthetic support checkpoint hysteresis', () => {
  it('activates only a full five window with three non-independent completions across two sessions', () => {
    let snapshot = emptySyntheticSnapshot();
    for (let index = 0; index < 4; index += 1)
      snapshot = complete(
        snapshot,
        observation(index, {
          correct: index === 0,
          sessionOrdinal: index < 2 ? 1 : 2,
        }),
      ).snapshot;
    expect(
      getConceptState(checkpointSyntheticSession(snapshot), scope.conceptId)
        .needsSupport,
    ).toBe(false);
    snapshot = complete(
      snapshot,
      observation(4, { mathematicalHintTier: 1, sessionOrdinal: 2 }),
    ).snapshot;
    expect(getConceptState(snapshot, scope.conceptId).needsSupport).toBe(false);
    const checkpoint = checkpointSyntheticSession(snapshot);
    expect(getConceptState(checkpoint, scope.conceptId)).toMatchObject({
      needsSupport: true,
      supportActivatedAfter: 5,
      lastCheckpointOrdinal: 5,
    });
    expect(checkpointSyntheticSession(checkpoint)).toEqual(checkpoint);
    let oneSession = emptySyntheticSnapshot();
    for (let index = 0; index < 5; index += 1)
      oneSession = complete(
        oneSession,
        observation(index, { correct: index < 2 }),
      ).snapshot;
    expect(
      getConceptState(checkpointSyntheticSession(oneSession), scope.conceptId)
        .needsSupport,
    ).toBe(false);
  });

  it('cannot clear newly activated support with old pre-activation independent revisits', () => {
    let snapshot = emptySyntheticSnapshot();
    for (let index = 0; index < 3; index += 1)
      snapshot = complete(
        snapshot,
        observation(index, {
          revisit: true,
          sessionOrdinal: index < 2 ? 1 : 2,
        }),
      ).snapshot;
    for (let index = 3; index < 8; index += 1)
      snapshot = complete(
        snapshot,
        observation(index, {
          correct: false,
          sessionOrdinal: index < 5 ? 2 : 3,
        }),
      ).snapshot;
    snapshot = checkpointSyntheticSession(snapshot);
    expect(getConceptState(snapshot, scope.conceptId)).toMatchObject({
      needsSupport: true,
      supportActivatedAfter: 8,
    });
    expect(
      getConceptState(checkpointSyntheticSession(snapshot), scope.conceptId)
        .needsSupport,
    ).toBe(true);
    snapshot = complete(
      snapshot,
      observation(8, { correct: false, sessionOrdinal: 3 }),
    ).snapshot;
    expect(
      getConceptState(checkpointSyntheticSession(snapshot), scope.conceptId)
        .needsSupport,
    ).toBe(true);
    snapshot = complete(
      snapshot,
      observation(9, { revisit: true, sessionOrdinal: 4 }),
    ).snapshot;
    snapshot = complete(
      snapshot,
      observation(10, { revisit: true, sessionOrdinal: 4 }),
    ).snapshot;
    expect(
      getConceptState(checkpointSyntheticSession(snapshot), scope.conceptId)
        .needsSupport,
    ).toBe(true);
    snapshot = complete(
      snapshot,
      observation(11, { revisit: true, sessionOrdinal: 5 }),
    ).snapshot;
    const recovered = checkpointSyntheticSession(snapshot);
    expect(getConceptState(recovered, scope.conceptId).needsSupport).toBe(
      false,
    );
    expect(checkpointSyntheticSession(recovered)).toEqual(recovered);
  });

  it('offers immediate help on two completed difficulties without waiting for the full flag window', () => {
    let snapshot = complete(
      emptySyntheticSnapshot(),
      observation(0, { correct: false }),
    ).snapshot;
    expect(immediateSyntheticSupportChoices(snapshot, scope.conceptId)).toEqual(
      [],
    );
    snapshot = complete(
      snapshot,
      observation(1, { mathematicalHintTier: 3 }),
    ).snapshot;
    expect(immediateSyntheticSupportChoices(snapshot, scope.conceptId)).toEqual(
      ['easier', 'anotherRepresentation', 'workedExample', 'stop'],
    );
    expect(getConceptState(snapshot, scope.conceptId).needsSupport).toBe(false);
  });
});

describe('synthetic explicit coarse-clock revisit state', () => {
  it('suspends rollback/uncertain date advancement and delayed retrieval until explicit resolution', () => {
    const initial = complete(
      emptySyntheticSnapshot(),
      observation(0, { coarseDay: 10 }),
    ).snapshot;
    const scheduled = confirmSyntheticReadiness(
      initial,
      scope.conceptId,
      'SYNTHETIC-observation-0',
    );
    const rollback = advanceSyntheticClock(scheduled, 9, true, catalog);
    expect(rollback).toMatchObject({ clockCertain: false, lastTrustedDay: 10 });
    const later = advanceSyntheticClock(rollback, 100, true, catalog);
    expect(getConceptState(later, scope.conceptId)).toMatchObject({
      observations: [expect.anything()],
      reviewDue: false,
      limitedEvidence: true,
    });
    const uncertainRepeat = complete(
      later,
      observation(0, {
        id: 'SYNTHETIC-uncertain-repeat',
        coarseDay: 100,
        sessionOrdinal: 2,
      }),
    );
    expect(uncertainRepeat.observation).toMatchObject({
      outcome: 'excluded',
      reasonCode: 'clockUncertain',
    });
    expect(
      settleSyntheticRevisit(
        uncertainRepeat.snapshot,
        scope.conceptId,
        'SYNTHETIC-uncertain-repeat',
      ),
    ).toBe(uncertainRepeat.snapshot);
    const resolved = resolveSyntheticClock(rollback, 12, catalog);
    expect(resolved).toMatchObject({ clockCertain: true, lastTrustedDay: 12 });
    expect(getConceptState(resolved, scope.conceptId).reviewDue).toBe(true);
    expect(
      complete(
        resolved,
        observation(0, {
          id: 'SYNTHETIC-resolved-repeat',
          coarseDay: 12,
          sessionOrdinal: 2,
        }),
      ).observation.outcome,
    ).toBe('independentSuccess');
    expect(
      getConceptState(
        resolveSyntheticClock(later, 100, catalog),
        scope.conceptId,
      ).observations,
    ).toEqual([]);
  });

  it('advances staged due revisits once each and creates no overdue backlog', () => {
    let snapshot = complete(emptySyntheticSnapshot(), observation(0)).snapshot;
    snapshot = confirmSyntheticReadiness(
      snapshot,
      scope.conceptId,
      'SYNTHETIC-observation-0',
    );
    expect(getConceptState(snapshot, scope.conceptId)).toMatchObject({
      reviewStage: 0,
      nextReviewDay: 2,
    });
    for (const [index, day, stage, nextDay] of [
      [1, 2, 1, 9],
      [2, 9, 2, 30],
      [3, 30, 3, 60],
      [4, 60, 3, 90],
      [5, 200, 3, 230],
    ] as const) {
      snapshot = complete(
        snapshot,
        observation(index, {
          coarseDay: day,
          sessionOrdinal: index + 1,
          revisit: true,
        }),
      ).snapshot;
      snapshot = settleSyntheticRevisit(
        snapshot,
        scope.conceptId,
        `SYNTHETIC-observation-${index}`,
      );
      expect(getConceptState(snapshot, scope.conceptId)).toMatchObject({
        reviewStage: stage,
        nextReviewDay: nextDay,
        reviewDue: false,
      });
      expect(
        settleSyntheticRevisit(
          snapshot,
          scope.conceptId,
          `SYNTHETIC-observation-${index}`,
        ),
      ).toBe(snapshot);
    }
  });

  it('leaves schedule unchanged for early, supported, failed, skipped and unrelated practice', () => {
    const initial = complete(emptySyntheticSnapshot(), observation(0)).snapshot;
    const scheduled = confirmSyntheticReadiness(
      initial,
      scope.conceptId,
      'SYNTHETIC-observation-0',
    );
    for (const overrides of [
      { coarseDay: 1, revisit: true },
      { coarseDay: 2, revisit: true, mathematicalHintTier: 1 as const },
      { coarseDay: 2, revisit: true, correct: false },
      { coarseDay: 2, revisit: true, completion: 'skipped' as const },
      { coarseDay: 2, revisit: false },
    ]) {
      const next = complete(scheduled, observation(1, overrides)).snapshot;
      expect(
        getConceptState(
          settleSyntheticRevisit(
            next,
            scope.conceptId,
            'SYNTHETIC-observation-1',
          ),
          scope.conceptId,
        ),
      ).toMatchObject({ reviewStage: 0, nextReviewDay: 2 });
    }
  });
});

describe('synthetic exploration neutrality and refusal bounds', () => {
  it.each(['numberLab', 'exploration'] as const)(
    'keeps %s outside all mastery bytes even after elapsed/uncertain time',
    (mode) => {
      const snapshot = secureSnapshot();
      for (const correct of [true, false]) {
        const result = complete(
          snapshot,
          observation(0, {
            id: 'SYNTHETIC-exposure',
            sessionOrdinal: 3,
            mode,
            correct,
            coarseDay: 200,
            clockCertain: false,
          }),
        );
        expect(result.snapshot).toBe(snapshot);
        expect(result.observation).toMatchObject({
          outcome: 'excluded',
          reasonCode: 'nonPractice',
        });
        expect(JSON.stringify(result.snapshot)).toBe(JSON.stringify(snapshot));
      }
      const initial = emptySyntheticSnapshot();
      let exposures = initial;
      for (let index = 0; index < 30; index += 1)
        exposures = complete(exposures, observation(index, { mode })).snapshot;
      expect(exposures).toBe(initial);
      expect(getConceptState(exposures, scope.conceptId).attained).toBe(
        'Unseen',
      );
      const confirmation = complete(
        exposures,
        observation(0, {
          id: 'SYNTHETIC-new-normal-confirmation',
          mode: 'practice',
        }),
      ).snapshot;
      expect(getConceptState(confirmation, scope.conceptId).attained).toBe(
        'Emerging',
      );
      expect(confirmation.receipts).toHaveLength(1);
    },
  );

  it('refuses new operations at bounded receipt capacity and preserves exact retries', () => {
    let snapshot = emptySyntheticSnapshot();
    for (let index = 0; index < SYNTHETIC_ENGINE_LIMITS.receipts; index += 1) {
      snapshot = complete(
        snapshot,
        observation(0, { id: `SYNTHETIC-capacity-${index}` }),
      ).snapshot;
    }
    expect(snapshot.receipts).toHaveLength(1024);
    expect(
      getConceptState(snapshot, scope.conceptId).observations,
    ).toHaveLength(1);
    expect(
      applySyntheticObservation(
        snapshot,
        observation(1, { id: 'SYNTHETIC-overflow' }),
        catalog,
      ),
    ).toEqual({ ok: false, error: { code: 'receiptCapacityReached' } });
    expect(
      applySyntheticObservation(
        snapshot,
        observation(0, { id: 'SYNTHETIC-capacity-0' }),
        catalog,
      ),
    ).toMatchObject({ ok: true, exactRetry: true });
  });
});
