// Independent finite model. No production generator, validator, DTO or truth import.
// Arithmetic truth uses token concatenation/removal and exhaustive equation search.
import { referenceBounded, referenceSeed } from './xoshiro-reference';

export type OracleSliceFamily =
  | 'number.numeral'
  | 'number.counting'
  | 'number.comparison'
  | 'number.subtraction'
  | 'number.missing';

export interface OracleSliceCase {
  readonly parameters: readonly number[];
  readonly answer:
    number | 'comparison.less' | 'comparison.equal' | 'comparison.greater';
}

function tokens(count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => `token-${index}`);
}

export function oracleSliceCase(
  family: OracleSliceFamily,
  parameters: readonly number[],
): OracleSliceCase {
  const first = parameters[0];
  if (first === undefined || first < 0 || first > 5 || !Number.isInteger(first))
    throw new Error('Invalid independent finite input');
  if (family === 'number.numeral' || family === 'number.counting')
    return { parameters, answer: tokens(first).length };
  const second = parameters[1];
  if (
    second === undefined ||
    second < 0 ||
    second > 5 ||
    !Number.isInteger(second)
  )
    throw new Error('Invalid independent second input');
  if (family === 'number.comparison') {
    // Pair tokens one-to-one, then inspect which group has unmatched items.
    const left = [...tokens(first)],
      right = [...tokens(second)];
    while (left.length && right.length) {
      left.pop();
      right.pop();
    }
    return {
      parameters,
      answer: left.length
        ? 'comparison.greater'
        : right.length
          ? 'comparison.less'
          : 'comparison.equal',
    };
  }
  if (family === 'number.subtraction') {
    if (second > first) throw new Error('Removal exceeds whole');
    const remaining = [...tokens(first)];
    for (const ignored of tokens(second)) {
      void ignored;
      remaining.pop();
    }
    return { parameters, answer: remaining.length };
  }
  const position = parameters[2];
  if (position !== 0 && position !== 1 && position !== 2)
    throw new Error('Invalid independent missing position');
  const total = [...tokens(first), ...tokens(second)].length;
  const solutions: number[] = [];
  for (let candidate = 0; candidate <= 10; candidate += 1) {
    const left = position === 0 ? candidate : first;
    const right = position === 1 ? candidate : second;
    const target = position === 2 ? candidate : total;
    if ([...tokens(left), ...tokens(right)].length === tokens(target).length)
      solutions.push(candidate);
  }
  if (solutions.length !== 1 || solutions[0] === undefined)
    throw new Error('Expected unique finite equation solution');
  return { parameters, answer: solutions[0] };
}

export function enumerateSliceCases(
  family: OracleSliceFamily,
): readonly OracleSliceCase[] {
  const cases: OracleSliceCase[] = [];
  for (let first = 0; first <= 5; first += 1) {
    if (family === 'number.numeral')
      cases.push(oracleSliceCase(family, [first]));
    else if (family === 'number.counting')
      for (const layout of [0, 1])
        cases.push(oracleSliceCase(family, [first, layout]));
    else
      for (
        let second = 0;
        second <= (family === 'number.subtraction' ? first : 5);
        second += 1
      ) {
        if (family === 'number.missing')
          for (const position of [0, 1, 2])
            cases.push(oracleSliceCase(family, [first, second, position]));
        else cases.push(oracleSliceCase(family, [first, second]));
      }
  }
  return cases;
}

export function referenceSliceDimensions(
  family: OracleSliceFamily,
  seed: string,
): readonly number[] {
  let state = referenceSeed(seed);
  const parameters: number[] = [];
  const first = referenceBounded(state, 6);
  if (!first.ok) throw new Error('Independent first draw exhausted');
  parameters.push(first.value);
  state = first.state;
  const laterBounds =
    family === 'number.numeral'
      ? []
      : family === 'number.counting'
        ? [2]
        : family === 'number.subtraction'
          ? [first.value + 1]
          : family === 'number.missing'
            ? [6, 3]
            : [6];
  for (const bound of laterBounds) {
    const draw = referenceBounded(state, bound);
    if (!draw.ok) throw new Error('Independent later draw exhausted');
    parameters.push(draw.value);
    state = draw.state;
  }
  return parameters;
}

/** Seed witnesses certify generated parameter coverage, not educational variation. */
export function sliceSeedWitnesses(
  family: OracleSliceFamily,
): ReadonlyMap<string, string> {
  const expected = enumerateSliceCases(family).length;
  const witnesses = new Map<string, string>();
  let state = 0x20261006n;
  for (
    let attempt = 0;
    attempt < 32768 && witnesses.size < expected;
    attempt += 1
  ) {
    const words: string[] = [];
    for (let word = 0; word < 4; word += 1) {
      state = (1664525n * state + 1013904223n) % 2n ** 32n;
      words.push(state.toString(16).padStart(8, '0'));
    }
    const seed = words.join('');
    witnesses.set(referenceSliceDimensions(family, seed).join(','), seed);
  }
  if (witnesses.size !== expected)
    throw new Error('Incomplete independent seed witness inventory');
  return witnesses;
}
