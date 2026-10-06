import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  createProofReplay,
  generateProof,
  LENGTH_UNIT_ID,
  PROOF_FAMILIES,
  validateProof,
} from '../../../src/domain/families/proofs';
import type { ProofFamilyId } from '../../../src/domain/families/proofs';
import type { DomainResult } from '../../../src/domain/core/result';
import type { PuzzleInstance } from '../../../src/domain/puzzles/contracts';
import type { RationalDto } from '../../../src/domain/math/rational';
import {
  canonicalize,
  parseCanonicalData,
} from '../../../src/domain/replay/canonical';
import {
  countCombinedTokens,
  countUnitIntervals,
  enumerateQuadrilaterals,
  quadrilateralClasses,
} from '../../oracle/family-proof';
import {
  referenceBounded,
  referenceSeed,
} from '../../oracle/xoshiro-reference';

const propertyRuns = 1000;
// Every case performs bounded independent truth and repeated replay/validation.
// Permit that finite workload under the aggregate gate's parallel file execution.
const propertyTimeout = 15000;
const arbitrarySeed = fc
  .tuple(
    ...Array.from({ length: 4 }, () => fc.integer({ min: 0, max: 0xffffffff })),
  )
  .filter((words) => words.some((word) => word !== 0))
  .map((words) =>
    words.map((word) => word.toString(16).padStart(8, '0')).join(''),
  );
const quadrilateralsByState = new Map(
  enumerateQuadrilaterals().map((fixture) => {
    const state = fixture.state;
    return [
      [
        state.width,
        state.height,
        state.shear,
        state.quarterTurn,
        state.scale,
        state.cyclicStart,
        state.winding,
      ].join(','),
      fixture,
    ] as const;
  }),
);

function value<T>(result: DomainResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok)
    throw new Error(`Unexpected family property error: ${result.error.code}`);
  return result.value;
}

function rational(numerator: number): RationalDto {
  return {
    schema: 'rational-v1',
    numerator: String(numerator),
    denominator: '1',
  };
}

function coordinate(input: RationalDto): number {
  expect(input.denominator).toBe('1');
  const number = Number(input.numerator);
  expect(Number.isSafeInteger(number)).toBe(true);
  expect(Math.abs(number)).toBeLessThanOrEqual(8);
  return number;
}

function draws(seed: string, bounds: readonly number[]): readonly number[] {
  let state = referenceSeed(seed);
  return bounds.map((bound) => {
    const next = referenceBounded(state, bound);
    expect(next.ok).toBe(true);
    if (!next.ok) throw new Error('Independent bounded reference exhausted.');
    state = next.state;
    return next.value;
  });
}

function generated(
  familyId: ProofFamilyId,
  seed: string,
  maximum: number,
): PuzzleInstance {
  const replay = value(createProofReplay(familyId, seed, maximum));
  const first = value(generateProof(replay));
  expect(value(generateProof(replay))).toEqual(first);
  expect(
    value(
      generateProof(value(parseCanonicalData(value(canonicalize(replay))))),
    ),
  ).toEqual(first);
  expect(first.replay.spec).toEqual({ maximum });
  expect(first.replay).toMatchObject({
    schema: 'replay-v1',
    canonicalization: 'canonical-json-v1',
    semanticVersion: 'semantic-v1',
    contentVersion: 'phase2-content-v1',
    rngAlgorithm: 'xoshiro128ss-v1',
    seedHex: seed,
  });
  expect(first.evidenceScope.scopes).toHaveLength(1);
  const family = PROOF_FAMILIES.find(
    (entry) => entry.metadata.familyId === familyId,
  );
  if (!family) throw new Error('Missing static family.');
  expect(value(family.deriveHint(first.task, 0))).toEqual(first.hintPlan[0]);
  expect(value(family.deriveHint(first.task, 1))).toEqual(first.hintPlan[1]);
  const forged = { ...first, hintPlan: [] };
  expect(validateProof(forged, {}).ok).toBe(false);
  return first;
}

describe('independent deterministic family properties with fixed regression seeds', () => {
  it(
    'checks 1000 generated addition cases against token counts and independent RNG dimensions',
    () => {
      fc.assert(
        fc.property(
          arbitrarySeed,
          fc.integer({ min: 0, max: 5 }),
          (seed, maximum) => {
            const task = generated('number.addition', seed, maximum);
            if (
              task.task.kind !== 'evaluateExpression' ||
              task.task.expression.root.kind !== 'add'
            )
              throw new Error('Expected genuine addition AST.');
            const root = task.task.expression.root;
            if (root.left.kind !== 'literal' || root.right.kind !== 'literal')
              throw new Error('Expected bounded operands.');
            const a = coordinate(root.left.value),
              b = coordinate(root.right.value);
            expect([a, b]).toEqual(draws(seed, [maximum + 1, maximum + 1]));
            expect(a).toBeGreaterThanOrEqual(0);
            expect(a).toBeLessThanOrEqual(maximum);
            expect(b).toBeGreaterThanOrEqual(0);
            expect(b).toBeLessThanOrEqual(maximum);
            const expected = countCombinedTokens(a, b);
            expect(expected).toBeLessThanOrEqual(2 * maximum);
            expect(task.answerContract).toEqual({
              kind: 'exactValue',
              expected: rational(expected),
            });
            expect(
              validateProof(task, {
                kind: 'exactValue',
                value: rational(expected),
              }),
            ).toEqual({ ok: true, value: { correct: true } });
            expect(
              validateProof(task, {
                kind: 'exactValue',
                value: rational(expected + 1),
              }),
            ).toEqual({ ok: true, value: { correct: false } });
            expect(
              generateProof({
                ...task.replay,
                spec: { maximum: maximum + 0.5 },
              }).ok,
            ).toBe(false);
          },
        ),
        { seed: 20261021, numRuns: propertyRuns },
      );
    },
    propertyTimeout,
  );

  it(
    'checks 1000 generated quadrilaterals against independent diagonals and all transform dimensions',
    () => {
      fc.assert(
        fc.property(
          arbitrarySeed,
          fc.integer({ min: 1, max: 3 }),
          (seed, maximum) => {
            const task = generated('geometry.quadrilateral', seed, maximum);
            if (task.task.kind !== 'classifyGeometry')
              throw new Error('Expected semantic geometry task.');
            const object = task.task.scene.objects[0];
            if (!object || object.kind !== 'polygon')
              throw new Error('Expected bounded polygon.');
            const actualPoints = object.vertices.map((p) => ({
              x: coordinate(p.x),
              y: coordinate(p.y),
            }));
            const dimensions = draws(seed, [maximum, maximum, 2, 4, 2, 4, 2]);
            const fixture = quadrilateralsByState.get(
              [
                (dimensions[0] ?? -2) + 1,
                (dimensions[1] ?? -2) + 1,
                dimensions[2],
                dimensions[3],
                (dimensions[4] ?? -2) + 1,
                dimensions[5],
                dimensions[6],
              ].join(','),
            );
            expect(fixture).toBeDefined();
            expect(actualPoints).toEqual(fixture?.vertices);
            const expected = quadrilateralClasses(actualPoints).map(
              (id) => `geometry.${id}`,
            );
            expect(task.answerContract).toEqual({
              kind: 'classification',
              expectedClassIds: expected,
              selection: 'allApplicable',
            });
            expect(expected.length).toBeGreaterThanOrEqual(1);
            expect(
              validateProof(task, {
                kind: 'classification',
                classIds: [...expected].reverse(),
              }),
            ).toEqual({ ok: true, value: { correct: true } });
            const incorrect =
              expected.length === 1
                ? [...expected, 'geometry.rectangle']
                : expected.slice(0, -1);
            expect(
              validateProof(task, {
                kind: 'classification',
                classIds: incorrect,
              }),
            ).toEqual({ ok: true, value: { correct: false } });
            expect(
              validateProof(task, {
                kind: 'classification',
                classIds: [...expected, expected[0]],
              }).ok,
            ).toBe(false);
            expect(
              generateProof({ ...task.replay, spec: { maximum: 4 } }).ok,
            ).toBe(false);
          },
        ),
        { seed: 20261022, numRuns: propertyRuns },
      );
    },
    propertyTimeout,
  );

  it(
    'checks 1000 generated exact lengths against interval walking, orientation and strict units',
    () => {
      fc.assert(
        fc.property(
          arbitrarySeed,
          fc.integer({ min: 1, max: 8 }),
          (seed, maximum) => {
            const task = generated('measurement.unit-length', seed, maximum);
            if (task.task.kind !== 'measureGeometry')
              throw new Error('Expected semantic length task.');
            const object = task.task.scene.objects[0];
            if (!object || object.kind !== 'segment')
              throw new Error('Expected exact segment.');
            const start = {
              x: coordinate(object.start.x),
              y: coordinate(object.start.y),
            };
            const end = {
              x: coordinate(object.end.x),
              y: coordinate(object.end.y),
            };
            const dimensions = draws(seed, [maximum, 4]);
            const length = (dimensions[0] ?? -2) + 1;
            const endpoints = [
              { x: length, y: 0 },
              { x: 0, y: length },
              { x: -length, y: 0 },
              { x: 0, y: -length },
            ];
            expect(start).toEqual({ x: 0, y: 0 });
            expect(end).toEqual(endpoints[dimensions[1] ?? -1]);
            const expected = countUnitIntervals(start, end);
            expect(expected).toBe(length);
            expect(length).toBeGreaterThanOrEqual(1);
            expect(length).toBeLessThanOrEqual(maximum);
            const quantity = {
              schema: 'quantity-v1',
              kind: 'exact',
              magnitude: rational(length),
              unitId: LENGTH_UNIT_ID,
              dimension: 'length',
            };
            expect(task.answerContract).toEqual({
              kind: 'quantity',
              expected: quantity,
              unitPolicy: 'requiredExact',
            });
            expect(validateProof(task, { kind: 'quantity', quantity })).toEqual(
              {
                ok: true,
                value: { correct: true },
              },
            );
            expect(
              validateProof(task, {
                kind: 'quantity',
                quantity: { ...quantity, magnitude: rational(length + 1) },
              }),
            ).toEqual({ ok: true, value: { correct: false } });
            expect(
              validateProof(task, {
                kind: 'quantity',
                quantity: { ...quantity, dimension: 'area' },
              }).ok,
            ).toBe(false);
            expect(
              validateProof(task, {
                kind: 'quantity',
                quantity: { ...quantity, unitId: 'unit.other' },
              }).ok,
            ).toBe(false);
            expect(
              generateProof({ ...task.replay, spec: { maximum: 9 } }).ok,
            ).toBe(false);
          },
        ),
        { seed: 20261023, numRuns: propertyRuns },
      );
    },
    propertyTimeout,
  );
});
