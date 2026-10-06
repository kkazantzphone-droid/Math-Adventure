import { describe, expect, it } from 'vitest';
import {
  buildPhase2EvidenceScope,
  certifyEvidenceCatalog,
  certifyEvidenceScope,
  createPhase2EvidenceCatalog,
  findEvidenceCase,
  phase2EvidenceFingerprint,
} from '../../src/domain/adaptation/catalog';
import type {
  ConceptEvidenceScope,
  SecurePolicyRequirements,
} from '../../src/domain/adaptation/catalog';
import { ADAPTATION_POLICY } from '../../src/domain/adaptation/policy';
import {
  applySyntheticObservation,
  emptySyntheticSnapshot,
  getConceptState,
} from '../../src/domain/adaptation/state';
import type { SyntheticObservationInput } from '../../src/domain/adaptation/types';
import type { DomainResult } from '../../src/domain/core/result';
import { generateProof } from '../../src/domain/families/proofs';
import type { ProofFamilyId } from '../../src/domain/families/proofs';
import {
  enumerateAdditionPairs,
  enumerateQuadrilaterals,
  enumerateUnitSegments,
} from '../oracle/family-proof';
import type { OraclePoint } from '../oracle/family-proof';
import { referenceBounded, referenceSeed } from '../oracle/xoshiro-reference';

const policy: SecurePolicyRequirements = {
  secureWindow: 10,
  secureIndependent: 8,
  secureSessions: 2,
  secureVariation: 2,
  representationIndependent: 2,
  fingerprintLimit: 2,
  retrievalGapDays: 2,
};

function value<T>(result: DomainResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok)
    throw new Error(`Unexpected domain failure: ${result.error.code}`);
  return result.value;
}

function scope(familyId: ProofFamilyId, maximum: number): ConceptEvidenceScope {
  return value(
    buildPhase2EvidenceScope(
      familyId,
      maximum,
      'singleRepresentationCandidate',
    ),
  );
}

// Independent shape oracle uses all six pairwise squared distances, rather than
// production adjacent edges/dot products. Normalized integer ratios remove size;
// sorted distances remove starting vertex, winding and rigid transformations.
function oracleShape(points: readonly OraclePoint[]): string {
  const distances: bigint[] = [];
  for (let first = 0; first < points.length; first += 1)
    for (let second = first + 1; second < points.length; second += 1) {
      const a = points[first],
        b = points[second];
      if (!a || !b) throw new Error('Missing independently enumerated point');
      distances.push(BigInt(a.x - b.x) ** 2n + BigInt(a.y - b.y) ** 2n);
    }
  function divisor(first: bigint, second: bigint): bigint {
    let a = first,
      b = second;
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
  }
  const factor = distances.reduce(divisor);
  return distances
    .map((distance) => distance / factor)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .join(':');
}

interface SeedWitness {
  readonly seed: string;
  readonly dimensions: readonly number[];
}

function generatedWitnesses(
  familyId: ProofFamilyId,
  maximum: number,
): readonly SeedWitness[] {
  const bounds =
    familyId === 'number.addition'
      ? [maximum + 1, maximum + 1]
      : familyId === 'geometry.quadrilateral'
        ? [maximum, maximum, 2, 4, 2, 4, 2]
        : [maximum, 4];
  const count = bounds.reduce((product, bound) => product * bound, 1);
  const witnesses = new Map<string, SeedWitness>();
  let inventory = 0x20261006n;
  for (
    let candidate = 0;
    candidate < 32768 && witnesses.size < count;
    candidate += 1
  ) {
    const words: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      inventory = (1664525n * inventory + 1013904223n) % 2n ** 32n;
      words.push(inventory.toString(16).padStart(8, '0'));
    }
    const seed = words.join('');
    let state = referenceSeed(seed);
    const dimensions: number[] = [];
    for (const bound of bounds) {
      const draw = referenceBounded(state, bound);
      if (!draw.ok) throw new Error('Independent seed inventory exhausted');
      dimensions.push(draw.value);
      state = draw.state;
    }
    witnesses.set(dimensions.join(','), { seed, dimensions });
  }
  expect(witnesses.size).toBe(count);
  return [...witnesses.values()];
}

function fingerprintDimensions(
  familyId: ProofFamilyId,
  dimensions: readonly number[],
): readonly number[] {
  const [a, b, shear] = dimensions;
  if (a === undefined) throw new Error('Missing finite dimension');
  return familyId === 'number.addition'
    ? [a, b ?? 0]
    : familyId === 'geometry.quadrilateral'
      ? [a + 1, (b ?? 0) + 1, shear ?? 0]
      : [a + 1];
}

function actualGenerated(
  familyId: ProofFamilyId,
  maximum: number,
  seed: string,
) {
  return value(
    generateProof({
      schema: 'replay-v1',
      canonicalization: 'canonical-json-v1',
      semanticVersion: 'semantic-v1',
      familyId,
      generatorVersion:
        familyId === 'number.addition'
          ? 'addition-bounded-v1'
          : familyId === 'geometry.quadrilateral'
            ? 'quadrilateral-bounded-v1'
            : 'unit-length-bounded-v1',
      contentVersion: 'phase2-content-v1',
      rngAlgorithm: 'xoshiro128ss-v1',
      seedHex: seed,
      spec: { maximum },
    }),
  );
}

describe('Phase 3B finite evidence universes with independent semantic quotients', () => {
  it('counts unordered actual addition cases, without granting commutative duplicates', () => {
    const independent = new Set(
      enumerateAdditionPairs().map(({ left, right }) =>
        [left, right].sort((a, b) => a - b).join(':'),
      ),
    );
    expect(independent.size).toBe(21);
    expect(scope('number.addition', 5).cases).toHaveLength(21);
    expect(value(phase2EvidenceFingerprint('number.addition', [1, 4]))).toBe(
      value(phase2EvidenceFingerprint('number.addition', [4, 1])),
    );
  });

  it.each([
    [1, 2],
    [2, 5],
    [3, 12],
  ])(
    'enumerates geometry maximum %i into %i shapes independent of scale and order',
    (maximum, expected) => {
      const cases = enumerateQuadrilaterals().filter(
        (item) => item.state.width <= maximum && item.state.height <= maximum,
      );
      const oracleToProduction = new Map<string, string>();
      const productionToOracle = new Map<string, string>();
      for (const item of cases) {
        const oracle = oracleShape(item.vertices);
        const fingerprint = value(
          phase2EvidenceFingerprint('geometry.quadrilateral', [
            item.state.width,
            item.state.height,
            item.state.shear,
          ]),
        );
        if (oracleToProduction.has(oracle))
          expect(oracleToProduction.get(oracle)).toBe(fingerprint);
        if (productionToOracle.has(fingerprint))
          expect(productionToOracle.get(fingerprint)).toBe(oracle);
        oracleToProduction.set(oracle, fingerprint);
        productionToOracle.set(fingerprint, oracle);
      }
      expect(cases).toHaveLength(maximum * maximum * 128);
      expect(oracleToProduction.size).toBe(expected);
      expect(productionToOracle.size).toBe(expected);
      expect(scope('geometry.quadrilateral', maximum).cases).toHaveLength(
        expected,
      );
    },
  );

  it('collapses size-only squares and a rotated/scaled oblique parameter collision', () => {
    expect(
      value(phase2EvidenceFingerprint('geometry.quadrilateral', [1, 1, 0])),
    ).toBe(
      value(phase2EvidenceFingerprint('geometry.quadrilateral', [3, 3, 0])),
    );
    expect(
      value(phase2EvidenceFingerprint('geometry.quadrilateral', [1, 1, 1])),
    ).toBe(
      value(phase2EvidenceFingerprint('geometry.quadrilateral', [2, 1, 1])),
    );
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    'enumerates unit-length maximum %i as logical interval counts only',
    (maximum) => {
      const independent = enumerateUnitSegments().filter(
        (item) => item.length <= maximum,
      );
      expect(independent).toHaveLength(maximum * 4);
      expect(new Set(independent.map((item) => item.expected)).size).toBe(
        maximum,
      );
      expect(scope('measurement.unit-length', maximum).cases).toHaveLength(
        maximum,
      );
    },
  );

  it.each([
    ['number.addition', 5, 21],
    ['geometry.quadrilateral', 1, 2],
    ['geometry.quadrilateral', 2, 5],
    ['geometry.quadrilateral', 3, 12],
    ...[1, 2, 3, 4, 5, 6, 7, 8].map(
      (maximum) => ['measurement.unit-length', maximum, maximum] as const,
    ),
  ] satisfies readonly (readonly [ProofFamilyId, number, number])[])(
    'every semantic %s maximum %i case has an actual immutable generator witness',
    (familyId, maximum, expected) => {
      const seen = new Set<string>();
      const catalog = value(
        createPhase2EvidenceCatalog([
          { familyId, maximum, coverage: 'singleRepresentationCandidate' },
        ]),
      );
      for (const witness of generatedWitnesses(familyId, maximum)) {
        const generated = actualGenerated(familyId, maximum, witness.seed);
        const fingerprint = value(
          phase2EvidenceFingerprint(
            familyId,
            fingerprintDimensions(familyId, witness.dimensions),
          ),
        );
        const declared = catalog.scopes[0];
        if (!declared) throw new Error('Missing declared semantic scope');
        expect(generated.evidenceScope).toEqual({
          kind: 'assessment',
          mode: 'practice',
          eligibleForMastery: true,
          scopes: [
            {
              conceptId: declared.conceptId,
              representationId: declared.representations[0],
            },
          ],
        });
        expect(
          findEvidenceCase(catalog, {
            concept: declared.conceptId,
            representation: declared.representations[0] ?? '',
            evidenceFingerprint: fingerprint,
            taskFingerprint: fingerprint,
            generatorVersion: generated.replay.generatorVersion,
          }),
        ).toBeDefined();
        if (generated.task.kind === 'classifyGeometry') {
          const polygon = generated.task.scene.objects[0];
          if (!polygon || polygon.kind !== 'polygon')
            throw new Error('Missing generated polygon');
          const points = polygon.vertices.map((point) => ({
            x: Number(point.x.numerator),
            y: Number(point.y.numerator),
          }));
          expect(oracleShape(points)).toBe(
            oracleShape(
              enumerateQuadrilaterals().find(
                (item) =>
                  item.state.width === (witness.dimensions[0] ?? 0) + 1 &&
                  item.state.height === (witness.dimensions[1] ?? 0) + 1 &&
                  item.state.shear === witness.dimensions[2],
              )?.vertices ?? [],
            ),
          );
        }
        seen.add(fingerprint);
      }
      expect(seen.size).toBe(expected);
    },
    15000,
  );
});

describe('Secure policy attainability certification', () => {
  it.each([
    'number.addition',
    'geometry.quadrilateral',
    'measurement.unit-length',
  ] as const)(
    'rejects default two-representation coverage for actual one-representation %s',
    (familyId) => {
      const maximum =
        familyId === 'number.addition'
          ? 5
          : familyId === 'geometry.quadrilateral'
            ? 3
            : 8;
      const candidate = value(buildPhase2EvidenceScope(familyId, maximum));
      expect(certifyEvidenceScope(candidate, policy)).toMatchObject({
        ok: false,
        reason: 'unattainableRepresentation',
      });
    },
  );

  it.each([1, 2, 3, 4])(
    'rejects unit maximum %i because eligible delayed repeats cannot fill a ten-entry window',
    (maximum) => {
      expect(
        certifyEvidenceScope(scope('measurement.unit-length', maximum), policy),
      ).toMatchObject({ ok: false, reason: 'unattainableWindow' });
    },
  );

  it('rejects maximum-one geometry despite its 128 transformed tuples', () => {
    expect(
      certifyEvidenceScope(scope('geometry.quadrilateral', 1), policy),
    ).toMatchObject({ ok: false, reason: 'unattainableWindow' });
  });

  it.each([
    ['number.addition', 5, 42],
    ['geometry.quadrilateral', 2, 10],
    ['geometry.quadrilateral', 3, 24],
    ['measurement.unit-length', 5, 10],
    ['measurement.unit-length', 6, 12],
    ['measurement.unit-length', 7, 14],
    ['measurement.unit-length', 8, 16],
  ] as const)(
    'certifies explicit experimental single-representation %s maximum %i capacity %i with educator review',
    (familyId, maximum, capacity) => {
      expect(certifyEvidenceScope(scope(familyId, maximum), policy)).toEqual({
        ok: true,
        value: {
          conceptId: scope(familyId, maximum).conceptId,
          meaningfulCases: capacity / 2,
          maximumWindowEntries: capacity,
          requiredWindow: 10,
          representations: 1,
          educatorReview: 'required',
        },
      });
    },
  );

  it('rejects fabricated cosmetic fingerprints, duplicate representations and removed educator review', () => {
    const original = scope('number.addition', 5);
    expect(
      certifyEvidenceScope(
        {
          ...original,
          cases: [
            ...original.cases,
            { ...original.cases[0], fingerprint: 'locale:en-GB' },
          ],
        } as ConceptEvidenceScope,
        policy,
      ),
    ).toMatchObject({ ok: false, reason: 'invalidCatalog' });
    expect(
      certifyEvidenceScope(
        {
          ...original,
          coverage: 'default',
          representations: [
            ...original.representations,
            ...original.representations,
          ],
        },
        policy,
      ),
    ).toMatchObject({ ok: false, reason: 'invalidCatalog' });
    expect(
      certifyEvidenceScope(
        {
          ...original,
          educatorReview: 'approved',
        } as unknown as ConceptEvidenceScope,
        policy,
      ),
    ).toMatchObject({ ok: false, reason: 'invalidCatalog' });
  });

  it('rejects impossible independent, session, variation and representation requirements', () => {
    const original = scope('measurement.unit-length', 5);
    expect(
      certifyEvidenceScope(original, { ...policy, secureIndependent: 11 }),
    ).toMatchObject({ ok: false, reason: 'invalidPolicy' });
    expect(
      certifyEvidenceScope(original, { ...policy, secureSessions: 11 }),
    ).toMatchObject({ ok: false, reason: 'invalidPolicy' });
    expect(
      certifyEvidenceScope(original, { ...policy, secureVariation: 6 }),
    ).toMatchObject({ ok: false, reason: 'unattainableVariation' });
    expect(
      certifyEvidenceScope(original, {
        ...policy,
        representationIndependent: 11,
      }),
    ).toMatchObject({ ok: false, reason: 'unattainableRepresentation' });
    expect(
      certifyEvidenceScope(original, { ...policy, secureIndependent: 1 }),
    ).toMatchObject({ ok: true });
  });

  it('rejects windows exceeding retention capacity and repeats too old to coexist', () => {
    const original = scope('measurement.unit-length', 5);
    expect(
      certifyEvidenceScope(original, { ...policy, secureWindow: 11 }),
    ).toMatchObject({ ok: false, reason: 'invalidPolicy' });
    expect(
      certifyEvidenceScope(original, { ...policy, learnerLimit: 9 }),
    ).toMatchObject({ ok: false, reason: 'invalidPolicy' });
    expect(
      certifyEvidenceScope(original, { ...policy, ageLimitDays: 1 }),
    ).toMatchObject({ ok: false, reason: 'unattainableWindow' });
    expect(
      certifyEvidenceScope(original, { ...policy, ageLimitDays: 2 }).ok,
    ).toBe(true);
  });

  it('certifies every scope together and rejects duplicate concept aliases', () => {
    const catalog = value(
      createPhase2EvidenceCatalog([
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
      ]),
    );
    expect(certifyEvidenceCatalog(catalog, policy).ok).toBe(true);
    expect(
      certifyEvidenceCatalog(
        {
          ...catalog,
          scopes: [catalog.scopes[0], catalog.scopes[0]],
        } as typeof catalog,
        policy,
      ),
    ).toMatchObject({ ok: false, reason: 'invalidCatalog' });
    expect(
      createPhase2EvidenceCatalog([
        {
          familyId: 'geometry.quadrilateral',
          maximum: 2,
          coverage: 'singleRepresentationCandidate',
        },
        {
          familyId: 'geometry.quadrilateral',
          maximum: 3,
          coverage: 'singleRepresentationCandidate',
        },
      ]).ok,
    ).toBe(false);
  });
});

describe('actual realizable normal-practice and delayed retrieval attainment witnesses', () => {
  it.each([
    ['number.addition', 5],
    ['geometry.quadrilateral', 2],
    ['geometry.quadrilateral', 3],
    ['measurement.unit-length', 5],
    ['measurement.unit-length', 6],
    ['measurement.unit-length', 7],
    ['measurement.unit-length', 8],
  ] as const)(
    'attains Secure for %s maximum %i using five actual generated cases and qualifying delayed practice',
    (familyId, maximum) => {
      const catalog = value(
        createPhase2EvidenceCatalog([
          { familyId, maximum, coverage: 'singleRepresentationCandidate' },
        ]),
      );
      expect(certifyEvidenceCatalog(catalog, ADAPTATION_POLICY).ok).toBe(true);
      const declared = catalog.scopes[0];
      if (!declared) throw new Error('Missing reviewed scope');
      const witnesses = new Map<string, SeedWitness>();
      for (const witness of generatedWitnesses(familyId, maximum)) {
        const fingerprint = value(
          phase2EvidenceFingerprint(
            familyId,
            fingerprintDimensions(familyId, witness.dimensions),
          ),
        );
        if (!witnesses.has(fingerprint)) witnesses.set(fingerprint, witness);
        if (witnesses.size === 5) break;
      }
      expect(witnesses.size).toBe(5);
      let snapshot = emptySyntheticSnapshot();
      let accepted = 0;
      for (const sessionOrdinal of [0, 1])
        for (const [fingerprint, witness] of witnesses) {
          const generated = actualGenerated(familyId, maximum, witness.seed);
          const input: SyntheticObservationInput = {
            synthetic: true,
            id: `SYNTHETIC-CATALOG-${familyId}-${maximum}-${accepted}`,
            concept: declared.conceptId,
            representation: declared.representations[0] ?? '',
            taskFingerprint: fingerprint,
            evidenceFingerprint: fingerprint,
            sessionOrdinal,
            coarseDay: sessionOrdinal * 2,
            clockCertain: true,
            mathematicalHintTier: 0,
            solutionExposed: false,
            meaningfulAttempts: 1,
            mode: 'practice',
            completion: 'completed',
            accessible: true,
            correct: true,
            accessibilitySupports: [
              'screenReader',
              'speechReplay',
              'enlargedText',
              'alternateControls',
            ],
            variationCase: true,
            revisit: sessionOrdinal === 1,
            policyVersion: ADAPTATION_POLICY.version,
            generatorVersion: generated.replay.generatorVersion,
          };
          const result = applySyntheticObservation(snapshot, input, catalog);
          expect(result.ok).toBe(true);
          if (!result.ok)
            throw new Error(
              `Realizable witness rejected: ${result.error.code}`,
            );
          expect(result.observation.outcome).toBe('independentSuccess');
          snapshot = result.snapshot;
          accepted += 1;
          if (accepted === 9)
            expect(getConceptState(snapshot, declared.conceptId).attained).toBe(
              'Developing',
            );
        }
      const final = getConceptState(snapshot, declared.conceptId);
      expect(final.observations).toHaveLength(10);
      expect(final.attained).toBe('Secure');
      expect(final.recentState).toBe('Secure');
      expect(final.attainment).toMatchObject({
        coverageCandidate: 'singleRepresentationCandidate',
        educatorReview: 'required',
        independentCount: 10,
        retainedCount: 10,
      });
      expect(
        new Set(
          final.observations.map((item) => item.input.evidenceFingerprint),
        ).size,
      ).toBe(5);
    },
    15000,
  );
});
