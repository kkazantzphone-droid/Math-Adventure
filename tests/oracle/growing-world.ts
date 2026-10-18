// Independent finite model: no production truth, DTO, generator or fingerprint import.
// Cardinality, finite equation search and cell enumeration establish exact answers.
import {
  referenceBounded,
  referenceNext,
  referenceSeed,
  referenceStateText,
} from './xoshiro-reference';

export const ORACLE_CHAPTER_FAMILIES = [
  'number.make-ten',
  'number.part-whole',
  'groups.equal',
  'groups.missing',
  'measurement.array-area',
  'powers.square-side',
] as const;
export type OracleChapterFamily = (typeof ORACLE_CHAPTER_FAMILIES)[number];
export type OracleRepresentation = 'concrete' | 'relational';

export interface OracleChapterCase {
  readonly family: OracleChapterFamily;
  /** make-ten: first, second; missing-part: known, total, unknown-position(0/1);
   * groups/area: group-or-row count, group-size-or-column count; square-side: side.
   */
  readonly parameters: readonly number[];
  readonly representation: OracleRepresentation;
  readonly task: Readonly<Record<string, string | number>>;
  readonly answer: number;
  readonly fingerprint: string;
}

function tokens(count: number): readonly number[] {
  if (!Number.isSafeInteger(count) || count < 0 || count > 37)
    throw new Error('Independent cardinality outside finite domain');
  return Array.from({ length: count }, (_, index) => index);
}

function cells(rows: number, columns: number): readonly string[] {
  return tokens(rows).flatMap((row) =>
    tokens(columns).map((column) => `${row},${column}`),
  );
}

function uniqueSolution(predicate: (candidate: number) => boolean): number {
  const solutions = tokens(37).filter(predicate);
  if (solutions.length !== 1 || solutions[0] === undefined)
    throw new Error('Independent equation must have one nonnegative solution');
  return solutions[0];
}

export function oracleChapterCase(
  family: OracleChapterFamily,
  parameters: readonly number[],
  representation: OracleRepresentation,
): OracleChapterCase {
  if (representation !== 'concrete' && representation !== 'relational')
    throw new Error('Unsupported independent representation');
  const first = parameters[0];
  const second = parameters[1];
  const allIntegral = parameters.every(Number.isSafeInteger);
  if (!allIntegral || first === undefined)
    throw new Error('Malformed independent parameter tuple');
  let task: Record<string, string | number>;
  let answer: number;
  let fingerprint: string;
  if (family === 'number.make-ten') {
    if (
      parameters.length !== 2 ||
      first < 6 ||
      first > 9 ||
      second === undefined ||
      second < 1 ||
      second > 9 ||
      [...tokens(first), ...tokens(second)].length <= 10
    )
      throw new Error('Outside crossing-ten domain');
    answer = uniqueSolution(
      (candidate) => [...tokens(first), ...tokens(candidate)].length === 10,
    );
    task = { kind: 'makeTen', first, second, target: 10 };
    // The filler question is unchanged by how much remains after ten.
    fingerprint = `make-ten:${first}`;
  } else if (family === 'number.part-whole') {
    const position = parameters[2];
    if (
      parameters.length !== 3 ||
      second === undefined ||
      second < 11 ||
      second > 20 ||
      first < 1 ||
      first >= second ||
      (position !== 0 && position !== 1)
    )
      throw new Error('Outside missing-part domain');
    answer = uniqueSolution(
      (candidate) =>
        [...tokens(first), ...tokens(candidate)].length ===
        tokens(second).length,
    );
    task = {
      kind: 'missingPart',
      known: first,
      total: second,
      unknownPosition: position === 0 ? 'first' : 'second',
    };
    fingerprint = `missing-part:${first}:${second}`;
  } else if (family === 'powers.square-side') {
    if (parameters.length !== 1 || first < 1 || first > 6)
      throw new Error('Outside positive square-side domain');
    const total = cells(first, first).length;
    answer = uniqueSolution(
      (candidate) => cells(candidate, candidate).length === total,
    );
    task = { kind: 'squareSide', total };
    fingerprint = `square-side:${total}`;
  } else {
    if (
      parameters.length !== 2 ||
      second === undefined ||
      first < 2 ||
      first > 5 ||
      second < 2 ||
      second > 5
    )
      throw new Error('Outside equal-unit domain');
    const total = cells(first, second).length;
    if (family === 'groups.missing') {
      // Distribute one token per bucket in rounds, then inspect equal sizes.
      const buckets = tokens(first).map(() => [] as number[]);
      let bucketIndex = 0;
      for (const token of tokens(total)) {
        buckets[bucketIndex]?.push(token);
        bucketIndex = (bucketIndex + 1) % buckets.length;
      }
      answer = buckets[0]?.length ?? -1;
      if (!buckets.every((bucket) => bucket.length === answer))
        throw new Error('Nonexact sharing is excluded');
      task = { kind: 'missingGroup', groups: first, total };
      fingerprint = `missing-group:${first}:${total}`;
    } else {
      answer = total;
      const dimensions = [first, second].sort((a, b) => a - b);
      if (family === 'groups.equal') {
        task = { kind: 'equalGroups', groups: first, each: second };
        fingerprint = `equal-groups:${dimensions.join(':')}`;
      } else {
        task = {
          kind: 'arrayArea',
          rows: first,
          columns: second,
          unitId: 'unit.square-step',
          dimension: 'area',
        };
        fingerprint = `array-area:${dimensions.join(':')}`;
      }
    }
  }
  return { family, parameters, representation, task, answer, fingerprint };
}

export function chapterCaseKey(row: OracleChapterCase): string {
  return `${row.parameters.join(',')}:${row.representation}`;
}

export function enumerateChapterCases(
  family: OracleChapterFamily,
): readonly OracleChapterCase[] {
  const tuples: number[][] = [];
  if (family === 'number.make-ten') {
    for (let first = 6; first <= 9; first += 1)
      for (let second = 1; second <= 9; second += 1)
        if ([...tokens(first), ...tokens(second)].length > 10)
          tuples.push([first, second]);
  } else if (family === 'number.part-whole') {
    for (let total = 11; total <= 20; total += 1)
      for (let known = 1; known < total; known += 1)
        for (const position of [0, 1]) tuples.push([known, total, position]);
  } else if (family === 'powers.square-side') {
    for (let side = 1; side <= 6; side += 1) tuples.push([side]);
  } else {
    for (let first = 2; first <= 5; first += 1)
      for (let second = 2; second <= 5; second += 1)
        tuples.push([first, second]);
  }
  return tuples.flatMap((tuple) =>
    (['concrete', 'relational'] as const).map((representation) =>
      oracleChapterCase(family, tuple, representation),
    ),
  );
}

/** A separate BigInt xoshiro reference maps explicit replay seeds to tuples.
 * Mathematical answers are derived by the finite model above, never by the draws.
 */
export function referenceChapterCase(
  family: OracleChapterFamily,
  seed: string,
): OracleChapterCase {
  let state = referenceSeed(seed);
  const draw = (bound: number): number => {
    const result = referenceBounded(state, bound);
    if (!result.ok) throw new Error('Independent chapter draw exhausted');
    state = result.state;
    return result.value;
  };
  let parameters: number[];
  if (family === 'number.make-ten') {
    const first = 6 + draw(4);
    const candidates = tokens(9)
      .map((index) => index + 1)
      .filter((second) => [...tokens(first), ...tokens(second)].length > 10);
    const second = candidates[draw(candidates.length)];
    if (second === undefined)
      throw new Error('Missing independent crossing candidate');
    parameters = [first, second];
  } else if (family === 'number.part-whole') {
    const total = 11 + draw(10);
    parameters = [1 + draw(total - 1), total, draw(2)];
  } else if (family === 'powers.square-side') {
    parameters = [1 + draw(6)];
  } else {
    parameters = [2 + draw(4), 2 + draw(4)];
  }
  return oracleChapterCase(
    family,
    parameters,
    draw(2) === 0 ? 'concrete' : 'relational',
  );
}

/** Exhaustive tuple witnesses, not exhaustive 128-bit seed coverage. */
export function chapterSeedWitnesses(
  family: OracleChapterFamily,
): ReadonlyMap<
  string,
  { readonly seed: string; readonly expected: OracleChapterCase }
> {
  const cases = enumerateChapterCases(family);
  const witnesses = new Map<
    string,
    { seed: string; expected: OracleChapterCase }
  >();
  let state = referenceSeed('0123456789abcdefdeadbeeffedcba98');
  for (
    let attempt = 0;
    attempt < 32768 && witnesses.size < cases.length;
    attempt += 1
  ) {
    const seed = referenceStateText(state);
    const expected = referenceChapterCase(family, seed);
    witnesses.set(chapterCaseKey(expected), { seed, expected });
    state = referenceNext(state).state;
  }
  if (witnesses.size !== cases.length)
    throw new Error('Incomplete independent chapter witnesses');
  return witnesses;
}
