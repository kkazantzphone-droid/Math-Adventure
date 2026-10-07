import { describe, expect, it } from 'vitest';
import { buildPhase2EvidenceScope } from '../../../src/domain/adaptation/catalog';
import type { DomainResult } from '../../../src/domain/core/result';
import { proofEvidence } from '../../../src/domain/families/proof-evidence';
import {
  createProofReplay,
  generateProof,
} from '../../../src/domain/families/proofs';
import type { ProofFamilyId } from '../../../src/domain/families/proofs';
import type { RationalDto } from '../../../src/domain/math/rational';
import {
  referenceBounded,
  referenceSeed,
} from '../../oracle/xoshiro-reference';

function value<T>(result: DomainResult<T>): T {
  if (!result.ok)
    throw new Error(`Independent evidence probe: ${result.error.code}`);
  return result.value;
}

function integer(dto: RationalDto): bigint {
  expect(dto.denominator).toBe('1');
  return BigInt(dto.numerator);
}

/** Independent seed inventory proves Cartesian tuple coverage, not all seeds. */
function witnesses(bounds: readonly number[]): ReadonlyMap<string, string> {
  const expected = bounds.reduce((count, bound) => count * bound, 1);
  const seen = new Map<string, string>();
  let inventory = 0x20261006n;
  for (
    let candidate = 0;
    candidate < 32768 && seen.size < expected;
    candidate += 1
  ) {
    const words: string[] = [];
    for (let word = 0; word < 4; word += 1) {
      inventory = (1664525n * inventory + 1013904223n) % 2n ** 32n;
      words.push(inventory.toString(16).padStart(8, '0'));
    }
    const seed = words.join('');
    let state = referenceSeed(seed);
    const dimensions: number[] = [];
    for (const bound of bounds) {
      const draw = referenceBounded(state, bound);
      if (!draw.ok) throw new Error('Independent bounded witness exhausted');
      dimensions.push(draw.value);
      state = draw.state;
    }
    seen.set(dimensions.join(','), seed);
  }
  expect(seen.size).toBe(expected);
  return seen;
}

type Point = readonly [bigint, bigint];
const orders: readonly (readonly number[])[] = Array.from(
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

/** Complete metric under all relabelings, independent of adjacent Gram data. */
function shapeMetric(points: readonly Point[]): string {
  return (
    orders
      .map((order) => {
        const distances: bigint[] = [];
        for (let first = 0; first < 4; first += 1)
          for (let second = first + 1; second < 4; second += 1) {
            const a = points[order[first] ?? -1],
              b = points[order[second] ?? -1];
            if (!a || !b) throw new Error('Missing independent metric corner');
            distances.push((a[0] - b[0]) ** 2n + (a[1] - b[1]) ** 2n);
          }
        const factor = distances.reduce((first, second) => {
          let a = first,
            b = second;
          while (b !== 0n) [a, b] = [b, a % b];
          return a;
        });
        if (factor === 0n) throw new Error('Degenerate independent shape');
        return distances.map((distance) => distance / factor).join(':');
      })
      .sort()[0] ?? ''
  );
}

function generated(family: ProofFamilyId, maximum: number, seed: string) {
  const replay = value(createProofReplay(family, seed, maximum));
  return { replay, instance: value(generateProof(replay)) };
}

describe('independent regenerated task to adaptation evidence bridge', () => {
  it.each([1, 2, 3])(
    'all generated geometry tuples at maximum %i map exactly to the independently equivalent catalog class',
    (maximum) => {
      expect(orders).toHaveLength(24);
      const scope = value(
        buildPhase2EvidenceScope('geometry.quadrilateral', maximum),
      );
      const metricToKey = new Map<string, string>();
      const keyToMetric = new Map<string, string>();
      for (const declared of scope.cases) {
        const [width, height, shear] = declared.parameters.map(BigInt);
        if (width === undefined || height === undefined || shear === undefined)
          throw new Error('Incomplete catalog semantic parameters');
        const points: readonly Point[] = [
          [0n, 0n],
          [width, 0n],
          [width + shear, height],
          [shear, height],
        ];
        const metric = shapeMetric(points);
        if (metricToKey.has(metric))
          expect(metricToKey.get(metric)).toBe(declared.fingerprint);
        if (keyToMetric.has(declared.fingerprint))
          expect(keyToMetric.get(declared.fingerprint)).toBe(metric);
        metricToKey.set(metric, declared.fingerprint);
        keyToMetric.set(declared.fingerprint, metric);
        // Translation, reflection and integral similarity preserve the complete metric.
        expect(
          shapeMetric(points.map(([x, y]) => [17n - 3n * y, 5n - 3n * x])),
        ).toBe(metric);
      }
      expect(metricToKey.size).toBe([2, 5, 12][maximum - 1]);
      const seen = new Set<string>();
      const seeds = witnesses([maximum, maximum, 2, 4, 2, 4, 2]);
      expect(seeds.size).toBe(maximum ** 2 * 128);
      for (const seed of seeds.values()) {
        const { replay, instance } = generated(
          'geometry.quadrilateral',
          maximum,
          seed,
        );
        if (instance.task.kind !== 'classifyGeometry')
          throw new Error('Wrong geometry task');
        const polygon = instance.task.scene.objects[0];
        if (!polygon || polygon.kind !== 'polygon')
          throw new Error('Wrong semantic shape');
        const points: readonly Point[] = polygon.vertices.map((point) => [
          integer(point.x),
          integer(point.y),
        ]);
        const metric = shapeMetric(points);
        const expected = metricToKey.get(metric);
        expect(expected).toBeDefined();
        const evidence = value(proofEvidence(replay));
        expect(evidence).toEqual({
          concept: 'geometry.quadrilateral.attributes',
          representation: 'representation.geometry-attributes',
          generatorVersion: 'quadrilateral-bounded-v1',
          fingerprint: expected,
        });
        expect(keyToMetric.get(evidence.fingerprint)).toBe(metric);
        seen.add(evidence.fingerprint);
      }
      expect(seen).toEqual(
        new Set(scope.cases.map((declared) => declared.fingerprint)),
      );
    },
    15000,
  );

  it('all 91 addition parameter tuples map operand exchange to one declared concept key', () => {
    let checked = 0;
    for (let maximum = 0; maximum <= 5; maximum += 1) {
      const scope = value(buildPhase2EvidenceScope('number.addition', maximum));
      const seen = new Set<string>();
      for (const [tuple, seed] of witnesses([maximum + 1, maximum + 1])) {
        const independent = tuple
          .split(',')
          .map(BigInt)
          .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        const { replay, instance } = generated(
          'number.addition',
          maximum,
          seed,
        );
        if (instance.task.kind !== 'evaluateExpression')
          throw new Error('Wrong addition task');
        const root = instance.task.expression.root;
        if (
          root.kind !== 'add' ||
          root.left.kind !== 'literal' ||
          root.right.kind !== 'literal'
        )
          throw new Error('Wrong operand structure');
        const operands = [
          integer(root.left.value),
          integer(root.right.value),
        ].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        expect(operands).toEqual(independent);
        const fingerprint = `add:${independent.join(':')}`;
        expect(value(proofEvidence(replay))).toEqual({
          concept: 'addition.part-whole',
          representation: 'representation.addition-groups',
          generatorVersion: 'addition-bounded-v1',
          fingerprint,
        });
        expect(
          scope.cases.some((declared) => declared.fingerprint === fingerprint),
        ).toBe(true);
        seen.add(fingerprint);
        checked += 1;
      }
      expect(seen.size).toBe(((maximum + 1) * (maximum + 2)) / 2);
    }
    expect(checked).toBe(91);
  });

  it('all 144 unit-length tuples map exact logical steps independently of orientation', () => {
    let checked = 0;
    for (let maximum = 1; maximum <= 8; maximum += 1) {
      const scope = value(
        buildPhase2EvidenceScope('measurement.unit-length', maximum),
      );
      const seen = new Set<string>();
      for (const [tuple, seed] of witnesses([maximum, 4])) {
        const { replay, instance } = generated(
          'measurement.unit-length',
          maximum,
          seed,
        );
        if (instance.task.kind !== 'measureGeometry')
          throw new Error('Wrong length task');
        const segment = instance.task.scene.objects[0];
        if (!segment || segment.kind !== 'segment')
          throw new Error('Wrong logical segment');
        let x = integer(segment.start.x),
          y = integer(segment.start.y);
        const endX = integer(segment.end.x),
          endY = integer(segment.end.y);
        expect(x === endX || y === endY).toBe(true);
        const dx = endX === x ? 0n : endX > x ? 1n : -1n;
        const dy = endY === y ? 0n : endY > y ? 1n : -1n;
        const steps = new Set<string>();
        while (x !== endX || y !== endY) {
          x += dx;
          y += dy;
          steps.add(`${x}:${y}`);
          if (steps.size > 8)
            throw new Error('Independent bounded traversal exceeded');
        }
        expect(steps.size).toBe(Number(tuple.split(',')[0]) + 1);
        const fingerprint = `length:${steps.size}`;
        expect(value(proofEvidence(replay))).toEqual({
          concept: 'measurement.length.unit-iteration',
          representation: 'representation.unit-iteration',
          generatorVersion: 'unit-length-bounded-v1',
          fingerprint,
        });
        expect(
          scope.cases.some((declared) => declared.fingerprint === fingerprint),
        ).toBe(true);
        seen.add(fingerprint);
        checked += 1;
      }
      expect(seen.size).toBe(maximum);
    }
    expect(checked).toBe(144);
  });

  it('rejects unsupported and forged replay rather than accepting caller-supplied evidence', () => {
    const replay = value(
      createProofReplay(
        'geometry.quadrilateral',
        '0123456789abcdefdeadbeeffedcba98',
      ),
    );
    for (const input of [
      null,
      {},
      { ...replay, evidenceFingerprint: 'shape:1:1:0' },
      { ...replay, contentVersion: 'other-content-v1' },
      { ...replay, generatorVersion: 'addition-bounded-v1' },
      { ...replay, familyId: 'number.counting' },
      { ...replay, spec: { maximum: 4 } },
    ])
      expect(proofEvidence(input).ok).toBe(false);
  });
});
