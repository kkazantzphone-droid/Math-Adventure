import { describe, expect, it } from 'vitest';
import {
  buildPhase2EvidenceScope,
  createPhase2EvidenceCatalog,
  phase2EvidenceFingerprint,
} from '../../src/domain/adaptation/catalog';
import type { ConceptEvidenceScope } from '../../src/domain/adaptation/catalog';
import { ADAPTATION_POLICY } from '../../src/domain/adaptation/policy';
import {
  applySyntheticObservation,
  checkpointSyntheticSession,
  emptySyntheticSnapshot,
  getConceptState,
} from '../../src/domain/adaptation/state';
import {
  emptySelectionMemory,
  recommendSynthetic,
} from '../../src/domain/adaptation/selection';
import type {
  AccessibilitySupport,
  SyntheticObservationInput,
  SyntheticSnapshot,
} from '../../src/domain/adaptation/types';

const created = createPhase2EvidenceCatalog([
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
if (!created.ok) throw new Error('Synthetic containment catalog unavailable');
const catalog = created.value;
const supports: readonly AccessibilitySupport[] = [
  'screenReader',
  'speechReplay',
  'enlargedText',
  'alternateControls',
  'instructionClarification',
];

function history(
  scope: ConceptEvidenceScope,
  accessibilitySupports: readonly AccessibilitySupport[],
  mathematicalHintTier: 0 | 1,
): SyntheticSnapshot {
  let snapshot = emptySyntheticSnapshot();
  for (let ordinal = 0; ordinal < 10; ordinal += 1) {
    const evidence = scope.cases[ordinal % 5];
    if (!evidence)
      throw new Error('Synthetic containment evidence unavailable');
    const input: SyntheticObservationInput = {
      synthetic: true,
      id: `SYNTHETIC-containment-${ordinal}`,
      concept: scope.conceptId,
      representation: evidence.representationId,
      taskFingerprint: evidence.fingerprint,
      evidenceFingerprint: evidence.fingerprint,
      sessionOrdinal: ordinal < 5 ? 1 : ordinal < 8 ? 2 : 3,
      coarseDay: ordinal < 5 ? 0 : 2,
      clockCertain: true,
      mathematicalHintTier,
      solutionExposed: false,
      meaningfulAttempts: 1,
      mode: 'practice',
      completion: 'completed',
      accessible: true,
      correct: true,
      accessibilitySupports,
      variationCase: true,
      revisit: ordinal >= 5,
      policyVersion: ADAPTATION_POLICY.version,
      generatorVersion: evidence.generatorVersion,
    };
    const result = applySyntheticObservation(snapshot, input, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.code);
    snapshot = result.snapshot;
  }
  return checkpointSyntheticSession(snapshot);
}

function evidenceProjection(snapshot: SyntheticSnapshot, concept: string) {
  const state = getConceptState(snapshot, concept);
  return {
    attained: state.attained,
    attainment: state.attainment,
    recentState: state.recentState,
    outcomes: state.observations.map((item) => [item.outcome, item.reasonCode]),
    representations: state.representationEvidence,
    needsSupport: state.needsSupport,
    reviewDue: state.reviewDue,
    limitedEvidence: state.limitedEvidence,
  };
}

function recommendationProjection(snapshot: SyntheticSnapshot) {
  const result = recommendSynthetic({
    snapshot,
    evidenceCatalog: catalog,
    catalog: catalog.scopes.map((scope) => ({
      concept: scope.conceptId,
      prerequisiteReady: true,
      generationAvailable: true,
    })),
    intent: { kind: 'automatic' },
    policyVersion: ADAPTATION_POLICY.version,
    coarseDay: 2,
    clockCertain: true,
    sessionOrdinal: 3,
    seed: '00000001000000020000000300000004',
    memory: emptySelectionMemory(snapshot),
  });
  return {
    concept: result.concept,
    reason: result.reasonCode,
    reasons: result.evidenceReasons,
    independent: result.independentCount,
    retained: result.retainedCount,
    revisit: result.revisit,
    alternatives: result.alternatives,
    memory: result.memory,
  };
}

type Point = readonly [bigint, bigint];
const permutations: readonly (readonly number[])[] = Array.from(
  { length: 4 },
  (_, a) =>
    Array.from({ length: 4 }, (_, b) =>
      Array.from({ length: 4 }, (_, c) =>
        Array.from({ length: 4 }, (_, d) => [a, b, c, d]),
      ).flat(),
    ).flat(),
)
  .flat()
  .filter((order) => new Set(order).size === 4);

// A complete four-point metric under all 24 relabelings, independently of the
// production edge/dot-product quotient and the pre-existing sorted multiset.
function metricShape(points: readonly Point[]): string {
  const distances = permutations.map((order) => {
    const row: bigint[] = [];
    for (let first = 0; first < 4; first += 1)
      for (let second = first + 1; second < 4; second += 1) {
        const a = points[order[first] ?? -1];
        const b = points[order[second] ?? -1];
        if (!a || !b) throw new Error('Synthetic metric point unavailable');
        row.push((a[0] - b[0]) ** 2n + (a[1] - b[1]) ** 2n);
      }
    const factor = row.reduce((first, second) => {
      let a = first;
      let b = second;
      while (b !== 0n) [a, b] = [b, a % b];
      return a;
    });
    return row.map((distance) => distance / factor).join(':');
  });
  return distances.sort()[0] ?? '';
}

describe('fresh synthetic privacy and accessibility evidence-scope review', () => {
  // Separate case budgets retain the complete 192-subset workload under the
  // canonical gate's concurrent compiler/worker load.
  it.each(
    catalog.scopes.flatMap((scope) =>
      ([0, 1] as const).map((hint) => ({
        familyId: scope.familyId,
        scope,
        hint,
      })),
    ),
  )(
    'all 32 accessibility support combinations stay neutral for $familyId with mathematical tier $hint',
    ({ scope, hint: mathematicalHintTier }) => {
      const baseline = history(scope, [], mathematicalHintTier);
      expect(getConceptState(baseline, scope.conceptId).attained).toBe(
        mathematicalHintTier === 0 ? 'Secure' : 'Emerging',
      );
      expect(getConceptState(baseline, scope.conceptId).needsSupport).toBe(
        mathematicalHintTier !== 0,
      );
      for (let mask = 0; mask < 32; mask += 1) {
        const supported = history(
          scope,
          supports.filter((_, index) => (mask & (1 << index)) !== 0),
          mathematicalHintTier,
        );
        expect(evidenceProjection(supported, scope.conceptId)).toEqual(
          evidenceProjection(baseline, scope.conceptId),
        );
        expect(recommendationProjection(supported)).toEqual(
          recommendationProjection(baseline),
        );
      }
    },
  );

  it.each([
    [1, 2],
    [2, 5],
    [3, 12],
  ])(
    'geometry maximum %i has %i complete-metric similarity classes',
    (maximum, expected) => {
      expect(permutations).toHaveLength(24);
      const metrics = new Map<string, string>();
      const fingerprints = new Map<string, string>();
      for (let width = 1; width <= maximum; width += 1)
        for (let height = 1; height <= maximum; height += 1)
          for (const shear of [0, 1]) {
            const points: readonly Point[] = [
              [0n, 0n],
              [BigInt(width), 0n],
              [BigInt(width + shear), BigInt(height)],
              [BigInt(shear), BigInt(height)],
            ];
            const metric = metricShape(points);
            const fingerprint = phase2EvidenceFingerprint(
              'geometry.quadrilateral',
              [width, height, shear],
            );
            expect(fingerprint.ok).toBe(true);
            if (!fingerprint.ok) throw new Error(fingerprint.error.code);
            if (metrics.has(metric))
              expect(metrics.get(metric)).toBe(fingerprint.value);
            if (fingerprints.has(fingerprint.value))
              expect(fingerprints.get(fingerprint.value)).toBe(metric);
            metrics.set(metric, fingerprint.value);
            fingerprints.set(fingerprint.value, metric);
            // Reflection, integer scale and translation are cosmetic here.
            expect(
              metricShape(points.map(([x, y]) => [17n - 3n * y, 5n - 3n * x])),
            ).toBe(metric);
          }
      expect(metrics.size).toBe(expected);
      expect(fingerprints.size).toBe(expected);
      const scope = buildPhase2EvidenceScope(
        'geometry.quadrilateral',
        maximum,
        'singleRepresentationCandidate',
      );
      expect(scope.ok).toBe(true);
      if (!scope.ok) throw new Error(scope.error.code);
      expect(
        new Set(scope.value.cases.map((item) => item.fingerprint)),
      ).toEqual(new Set(fingerprints.keys()));
    },
  );
});
