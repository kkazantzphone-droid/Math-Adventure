import { describe, expect, it } from 'vitest';
import {
  generateProof,
  inspectQuadrilateral,
  validateProof,
} from '../../../src/domain/families/proofs';
import type { DomainResult } from '../../../src/domain/core/result';
import type { RationalDto } from '../../../src/domain/math/rational';
import type { ProofFamilyId } from '../../../src/domain/families/proofs';
import {
  referenceBounded,
  referenceSeed,
} from '../../oracle/xoshiro-reference';

// This review exercises actual generated instances for every dimension tuple,
// complementing the existing exhaustive direct calls to truth predicates.
// Seed selection uses only the independently reviewed BigInt RNG reference.
// The LCG below is a finite synthetic seed inventory, not an application RNG.
const maximumSeedCandidates = 32768;
const finiteProofTimeout = 15000;

function value<T>(result: DomainResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Unexpected result: ${result.error.code}`);
  return result.value;
}

function rational(value: bigint): RationalDto {
  return {
    schema: 'rational-v1',
    numerator: String(value),
    denominator: '1',
  };
}

type Point = readonly [bigint, bigint];

function exactPoint([x, y]: Point) {
  return { x: rational(x), y: rational(y) };
}

function polygon(vertices: readonly Point[]) {
  return {
    schema: 'geometry-scene-v1',
    objects: [
      { kind: 'polygon', id: 'outline', vertices: vertices.map(exactPoint) },
    ],
  };
}

/** Diagonal bisection, equal diagonals and perpendicular diagonals. */
function diagonalClasses(vertices: readonly Point[]): readonly string[] {
  const [a, b, c, d] = vertices;
  if (!a || !b || !c || !d || vertices.length !== 4)
    throw new Error('Independent model needs four points.');
  const first: Point = [c[0] - a[0], c[1] - a[1]];
  const second: Point = [d[0] - b[0], d[1] - b[1]];
  if (
    a[0] + c[0] !== b[0] + d[0] ||
    a[1] + c[1] !== b[1] + d[1] ||
    first[0] * second[1] === first[1] * second[0]
  )
    return [];
  const classes = ['geometry.parallelogram'];
  if (first[0] ** 2n + first[1] ** 2n === second[0] ** 2n + second[1] ** 2n) {
    classes.push('geometry.rectangle');
    if (first[0] * second[0] + first[1] * second[1] === 0n)
      classes.push('geometry.square');
  }
  return classes;
}

function rotate(point: Point, turns: number): Point {
  let [x, y] = point;
  for (let turn = 0; turn < turns; turn += 1) [x, y] = [-y, x];
  return [x, y];
}

function squareDistance(a: Point, b: Point): bigint {
  return (a[0] - b[0]) ** 2n + (a[1] - b[1]) ** 2n;
}

interface Witness {
  readonly seed: string;
  readonly choices: readonly number[];
}

function witnesses(
  bounds: readonly number[],
  expectedCount: number,
): readonly Witness[] {
  const observed = new Map<string, Witness>();
  let inventory = 0x20261006n;
  for (
    let candidate = 0;
    candidate < maximumSeedCandidates && observed.size < expectedCount;
    candidate += 1
  ) {
    const words: string[] = [];
    for (let word = 0; word < 4; word += 1) {
      inventory = (1664525n * inventory + 1013904223n) % 2n ** 32n;
      words.push(inventory.toString(16).padStart(8, '0'));
    }
    const seed = words.join('');
    let state = referenceSeed(seed);
    const choices: number[] = [];
    for (const bound of bounds) {
      const draw = referenceBounded(state, bound);
      if (!draw.ok) throw new Error('Independent bounded draw exhausted.');
      choices.push(draw.value);
      state = draw.state;
    }
    observed.set(choices.join(','), { seed, choices });
  }
  // A passing count proves that the finite seed inventory covers the entire
  // Cartesian product; it makes no uniformity or all-2^128-seeds claim.
  expect(observed.size).toBe(expectedCount);
  return [...observed.values()];
}

function generated(familyId: ProofFamilyId, maximum: number, seed: string) {
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

describe('fresh independent mathematical red-team enumeration', () => {
  it(
    'checks actual generated tasks and answers for all 91 addition tuples across maxima 0..5',
    () => {
      let checked = 0;
      for (let maximum = 0; maximum <= 5; maximum += 1) {
        for (const witness of witnesses(
          [maximum + 1, maximum + 1],
          (maximum + 1) ** 2,
        )) {
          const [left, right] = witness.choices;
          if (left === undefined || right === undefined)
            throw new Error('Missing addition dimensions.');
          const tokens = new Set<string>();
          for (let i = 0; i < left; i += 1) tokens.add(`left.${i}`);
          for (let i = 0; i < right; i += 1) tokens.add(`right.${i}`);
          const expected = rational(BigInt(tokens.size));
          const actual = generated('number.addition', maximum, witness.seed);
          expect(actual.task).toEqual({
            kind: 'evaluateExpression',
            expression: {
              schema: 'expression-v1',
              root: {
                kind: 'add',
                left: { kind: 'literal', value: rational(BigInt(left)) },
                right: { kind: 'literal', value: rational(BigInt(right)) },
              },
            },
          });
          expect(actual.answerContract).toEqual({
            kind: 'exactValue',
            expected,
          });
          expect(
            validateProof(actual, { kind: 'exactValue', value: expected }),
          ).toEqual({ ok: true, value: { correct: true } });
          checked += 1;
        }
      }
      expect(checked).toBe(91);
    },
    finiteProofTimeout,
  );

  it(
    'checks actual generated tasks and inclusive classes for all 1792 geometry tuples across maxima 1..3',
    () => {
      let checked = 0;
      for (let maximum = 1; maximum <= 3; maximum += 1) {
        for (const witness of witnesses(
          [maximum, maximum, 2, 4, 2, 4, 2],
          maximum ** 2 * 128,
        )) {
          const [w, h, shear, turns, scaleIndex, start, winding] =
            witness.choices;
          if (
            w === undefined ||
            h === undefined ||
            shear === undefined ||
            turns === undefined ||
            scaleIndex === undefined ||
            start === undefined ||
            winding === undefined
          )
            throw new Error('Missing quadrilateral dimensions.');
          const width = BigInt(w + 1);
          const height = BigInt(h + 1);
          const slant = BigInt(shear);
          const scale = BigInt(scaleIndex + 1);
          const corners: readonly Point[] = [
            [0n, 0n],
            [width, 0n],
            [width + slant, height],
            [slant, height],
          ];
          const vertices: Point[] = [];
          for (let position = 0; position < 4; position += 1) {
            const index = (start + (winding === 0 ? 1 : 3) * position) % 4;
            const corner = corners[index];
            if (!corner) throw new Error('Missing independent corner.');
            vertices.push(
              rotate([corner[0] * scale, corner[1] * scale], turns),
            );
          }
          const classIds = diagonalClasses(vertices);
          const actual = generated(
            'geometry.quadrilateral',
            maximum,
            witness.seed,
          );
          expect(actual.task).toEqual({
            kind: 'classifyGeometry',
            scene: polygon(vertices),
            objectId: 'outline',
            classIds: [
              'geometry.parallelogram',
              'geometry.rectangle',
              'geometry.square',
            ],
          });
          expect(actual.answerContract).toEqual({
            kind: 'classification',
            expectedClassIds: classIds,
            selection: 'allApplicable',
          });
          if (actual.task.kind !== 'classifyGeometry')
            throw new Error('Unexpected geometry task.');
          const attributes = value(inspectQuadrilateral(actual.task.scene));
          const sideSquares: number[] = [];
          const rightAngles: boolean[] = [];
          for (let index = 0; index < 4; index += 1) {
            const a = vertices[index];
            const b = vertices[(index + 1) % 4];
            const c = vertices[(index + 2) % 4];
            if (!a || !b || !c) throw new Error('Missing metric points.');
            sideSquares.push(Number(squareDistance(a, b)));
            // The angle at b is right iff triangle abc is Pythagorean.
            rightAngles.push(
              squareDistance(a, b) + squareDistance(b, c) ===
                squareDistance(a, c),
            );
          }
          expect(attributes.sideLengthSquares).toEqual(sideSquares);
          expect(attributes.rightAngles).toEqual(rightAngles);
          expect(
            validateProof(actual, {
              kind: 'classification',
              classIds: [...classIds].reverse(),
            }),
          ).toEqual({ ok: true, value: { correct: true } });
          checked += 1;
        }
      }
      expect(checked).toBe(1792);
    },
    finiteProofTimeout,
  );

  it(
    'checks actual generated length tasks and exact quantities for all 144 tuples across maxima 1..8',
    () => {
      let checked = 0;
      for (let maximum = 1; maximum <= 8; maximum += 1) {
        for (const witness of witnesses([maximum, 4], maximum * 4)) {
          const [lengthIndex, turns] = witness.choices;
          if (lengthIndex === undefined || turns === undefined)
            throw new Error('Missing measurement dimensions.');
          const units: Point[] = [];
          for (let endpoint = 0; endpoint <= lengthIndex + 1; endpoint += 1)
            units.push(rotate([BigInt(endpoint), 0n], turns));
          const start = units[0];
          const end = units.at(-1);
          if (!start || !end) throw new Error('Missing unit endpoints.');
          const quantity = {
            schema: 'quantity-v1',
            kind: 'exact',
            magnitude: rational(BigInt(units.length - 1)),
            unitId: 'unit.length-step',
            dimension: 'length',
          };
          const actual = generated(
            'measurement.unit-length',
            maximum,
            witness.seed,
          );
          expect(actual.task).toEqual({
            kind: 'measureGeometry',
            scene: {
              schema: 'geometry-scene-v1',
              objects: [
                {
                  kind: 'segment',
                  id: 'length',
                  start: exactPoint(start),
                  end: exactPoint(end),
                },
              ],
            },
            objectId: 'length',
            attribute: 'length',
          });
          expect(actual.answerContract).toEqual({
            kind: 'quantity',
            expected: quantity,
            unitPolicy: 'requiredExact',
          });
          expect(validateProof(actual, { kind: 'quantity', quantity })).toEqual(
            {
              ok: true,
              value: { correct: true },
            },
          );
          checked += 1;
        }
      }
      expect(checked).toBe(144);
    },
    finiteProofTimeout,
  );

  it('checks all 6561 ordered four-vertex inputs on the 3x3 grid, including degeneracy and crossings', () => {
    const points: Point[] = [];
    for (const x of [-1n, 0n, 1n])
      for (const y of [-1n, 0n, 1n]) points.push([x, y]);
    let checked = 0;
    for (const a of points)
      for (const b of points)
        for (const c of points)
          for (const d of points) {
            const vertices = [a, b, c, d];
            const expected = diagonalClasses(vertices);
            const actual = inspectQuadrilateral(polygon(vertices));
            if (expected.length === 0)
              expect(actual).toEqual({
                ok: false,
                error: { code: 'invalid_input' },
              });
            else expect(value(actual).classIds).toEqual(expected);
            checked += 1;
          }
    expect(checked).toBe(6561);
  });
});
