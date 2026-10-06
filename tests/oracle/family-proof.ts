// Independent, test-only bounded models. No production import, generator,
// validator, exact-value helper or rendering data is used to establish truth.

export interface OraclePoint {
  readonly x: number;
  readonly y: number;
}

export type OracleShapeClass = 'parallelogram' | 'rectangle' | 'square';

export interface AdditionCase {
  readonly left: number;
  readonly right: number;
  readonly expected: number;
}

export interface QuadrilateralState {
  readonly width: number;
  readonly height: number;
  readonly shear: 0 | 1;
  readonly quarterTurn: 0 | 1 | 2 | 3;
  readonly scale: 1 | 2;
  readonly cyclicStart: 0 | 1 | 2 | 3;
  readonly winding: 0 | 1;
}

export interface QuadrilateralCase {
  readonly state: QuadrilateralState;
  readonly vertices: readonly OraclePoint[];
  readonly expectedClasses: readonly OracleShapeClass[];
}

export interface UnitSegmentCase {
  readonly length: number;
  readonly quarterTurn: 0 | 1 | 2 | 3;
  readonly start: OraclePoint;
  readonly end: OraclePoint;
  readonly expected: number;
}

export const ORACLE_CASE_COUNTS = Object.freeze({
  addition: 36,
  quadrilateral: 1152,
  unitSegment: 32,
});

/** Addition as the cardinality of a disjoint union, not operand arithmetic. */
export function countCombinedTokens(left: number, right: number): number {
  if (
    !Number.isInteger(left) ||
    !Number.isInteger(right) ||
    left < 0 ||
    right < 0 ||
    left > 5 ||
    right > 5
  ) {
    throw new RangeError('The independent addition model supports 0..5.');
  }
  const first: string[] = [];
  const second: string[] = [];
  for (let index = 0; index < left; index += 1) first.push(`left-${index}`);
  for (let index = 0; index < right; index += 1) second.push(`right-${index}`);
  return [...first, ...second].reduce((count) => count + 1, 0);
}

export function enumerateAdditionPairs(): readonly AdditionCase[] {
  const cases: AdditionCase[] = [];
  for (let left = 0; left <= 5; left += 1) {
    for (let right = 0; right <= 5; right += 1) {
      cases.push({ left, right, expected: countCombinedTokens(left, right) });
    }
  }
  return cases;
}

function boundedPoint(point: OraclePoint): boolean {
  return (
    Number.isSafeInteger(point.x) &&
    Number.isSafeInteger(point.y) &&
    point.x >= -64 &&
    point.x <= 64 &&
    point.y >= -64 &&
    point.y <= 64
  );
}

/**
 * A nondegenerate quadrilateral is a parallelogram exactly when its diagonals
 * bisect each other. Within parallelograms, equal diagonal lengths characterize
 * rectangles; additionally perpendicular diagonals characterize squares.
 * These diagonal theorems are independent of consecutive-edge dot products.
 */
export function quadrilateralClasses(
  vertices: readonly OraclePoint[],
): readonly OracleShapeClass[] {
  if (vertices.length !== 4 || !vertices.every(boundedPoint)) return [];
  const [a, b, c, d] = vertices.map((point) => ({
    x: BigInt(point.x),
    y: BigInt(point.y),
  }));
  if (!a || !b || !c || !d) return [];

  const doubleArea =
    a.x * b.y -
    b.x * a.y +
    b.x * c.y -
    c.x * b.y +
    c.x * d.y -
    d.x * c.y +
    d.x * a.y -
    a.x * d.y;
  if (doubleArea === 0n || a.x + c.x !== b.x + d.x || a.y + c.y !== b.y + d.y)
    return [];

  const classes: OracleShapeClass[] = ['parallelogram'];
  const firstDiagonal = { x: c.x - a.x, y: c.y - a.y };
  const secondDiagonal = { x: d.x - b.x, y: d.y - b.y };
  const firstDiagonalSquare =
    firstDiagonal.x * firstDiagonal.x + firstDiagonal.y * firstDiagonal.y;
  const secondDiagonalSquare =
    secondDiagonal.x * secondDiagonal.x + secondDiagonal.y * secondDiagonal.y;
  if (firstDiagonalSquare !== secondDiagonalSquare) return classes;

  classes.push('rectangle');
  if (
    firstDiagonal.x * secondDiagonal.x + firstDiagonal.y * secondDiagonal.y ===
    0n
  )
    classes.push('square');
  return classes;
}

function rotatedPoint(point: OraclePoint, turn: 0 | 1 | 2 | 3): OraclePoint {
  const candidates = [
    { x: point.x, y: point.y },
    { x: -point.y, y: point.x },
    { x: -point.x, y: -point.y },
    { x: point.y, y: -point.x },
  ];
  const result = candidates[turn];
  if (!result) throw new RangeError('Unknown quarter turn.');
  // Keep exact integer zero's spelling stable for fixture comparisons.
  return { x: result.x === 0 ? 0 : result.x, y: result.y === 0 ? 0 : result.y };
}

/** All 3×3×2×4×2×4×2 bounded transform states; no random sampling. */
export function enumerateQuadrilaterals(): readonly QuadrilateralCase[] {
  const cases: QuadrilateralCase[] = [];
  for (let width = 1; width <= 3; width += 1) {
    for (let height = 1; height <= 3; height += 1) {
      for (const shear of [0, 1] as const) {
        for (const quarterTurn of [0, 1, 2, 3] as const) {
          for (const scale of [1, 2] as const) {
            for (const cyclicStart of [0, 1, 2, 3] as const) {
              for (const winding of [0, 1] as const) {
                const canonical: readonly OraclePoint[] = [
                  { x: 0, y: 0 },
                  { x: width * scale, y: 0 },
                  { x: (width + shear) * scale, y: height * scale },
                  { x: shear * scale, y: height * scale },
                ];
                const transformed = canonical.map((point) =>
                  rotatedPoint(point, quarterTurn),
                );
                const vertices: OraclePoint[] = [];
                for (let position = 0; position < 4; position += 1) {
                  const index =
                    (cyclicStart + (winding === 0 ? position : -position) + 4) %
                    4;
                  const vertex = transformed[index];
                  if (!vertex) throw new RangeError('Missing fixture vertex.');
                  vertices.push(vertex);
                }
                // Construction proof supplies a second truth anchor: shear
                // zero gives right angles, and equal dimensions give a square.
                const expectedClasses: OracleShapeClass[] = ['parallelogram'];
                if (shear === 0) {
                  expectedClasses.push('rectangle');
                  if (width === height) expectedClasses.push('square');
                }
                cases.push({
                  state: {
                    width,
                    height,
                    shear,
                    quarterTurn,
                    scale,
                    cyclicStart,
                    winding,
                  },
                  vertices,
                  expectedClasses,
                });
              }
            }
          }
        }
      }
    }
  }
  return cases;
}

/** Length is the count of walked contiguous unit intervals, never pixels. */
export function countUnitIntervals(
  start: OraclePoint,
  end: OraclePoint,
): number | undefined {
  if (
    !boundedPoint(start) ||
    !boundedPoint(end) ||
    (start.x !== end.x && start.y !== end.y)
  )
    return undefined;
  let x = start.x;
  let y = start.y;
  const intervals: string[] = [];
  // Explicit finite work bound; the selected content needs at most eight.
  for (let step = 0; step <= 128; step += 1) {
    if (x === end.x && y === end.y) return intervals.length;
    const previous = { x, y };
    if (x !== end.x) x += x < end.x ? 1 : -1;
    else y += y < end.y ? 1 : -1;
    intervals.push(`${previous.x},${previous.y}:${x},${y}`);
  }
  return undefined;
}

export function enumerateUnitSegments(): readonly UnitSegmentCase[] {
  const cases: UnitSegmentCase[] = [];
  for (let length = 1; length <= 8; length += 1) {
    for (const quarterTurn of [0, 1, 2, 3] as const) {
      cases.push({
        length,
        quarterTurn,
        start: { x: 0, y: 0 },
        end: rotatedPoint({ x: length, y: 0 }, quarterTurn),
        expected: length,
      });
    }
  }
  return cases;
}

export const QUADRILATERAL_HAND_FIXTURES: readonly {
  readonly name: string;
  readonly vertices: readonly OraclePoint[];
  readonly expectedClasses: readonly OracleShapeClass[];
}[] = [
  {
    name: 'axis square belongs to all three inclusive classes',
    vertices: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ],
    expectedClasses: ['parallelogram', 'rectangle', 'square'],
  },
  {
    name: 'diamond square remains a rectangle',
    vertices: [
      { x: 0, y: 2 },
      { x: 2, y: 0 },
      { x: 4, y: 2 },
      { x: 2, y: 4 },
    ],
    expectedClasses: ['parallelogram', 'rectangle', 'square'],
  },
  {
    name: 'oblique rectangle has unequal side lengths',
    vertices: [
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 1, y: 3 },
      { x: -1, y: 1 },
    ],
    expectedClasses: ['parallelogram', 'rectangle'],
  },
  {
    name: 'oblique parallelogram is not a rectangle',
    vertices: [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 2 },
      { x: 1, y: 2 },
    ],
    expectedClasses: ['parallelogram'],
  },
  {
    name: 'rhombus need not be a rectangle or square',
    vertices: [
      { x: 0, y: 0 },
      { x: 2, y: 1 },
      { x: 4, y: 0 },
      { x: 2, y: -1 },
    ],
    expectedClasses: ['parallelogram'],
  },
  {
    name: 'trapezoid is not a parallelogram',
    vertices: [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ],
    expectedClasses: [],
  },
  {
    name: 'self-crossing bow tie has no supported class',
    vertices: [
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
      { x: 2, y: 0 },
    ],
    expectedClasses: [],
  },
  {
    name: 'collinear vertices are degenerate',
    vertices: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 3, y: 0 },
      { x: 2, y: 0 },
    ],
    expectedClasses: [],
  },
  {
    name: 'duplicate vertices are degenerate',
    vertices: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 2, y: 2 },
    ],
    expectedClasses: [],
  },
];
