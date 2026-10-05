// Test-only mathematical models. No production import or canonicaliser is used.
export interface FractionModel {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

export function fractionMatches(
  value: FractionModel,
  expected: FractionModel,
): boolean {
  return (
    value.numerator * expected.denominator ===
    expected.numerator * value.denominator
  );
}

export function fractionOrder(
  left: FractionModel,
  right: FractionModel,
): -1 | 0 | 1 {
  const a = left.numerator * right.denominator;
  const b = right.numerator * left.denominator;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function repeatedPower(base: bigint, exponent: number): bigint {
  let product = 1n;
  for (let factor = 0; factor < exponent; factor += 1) product *= base;
  return product;
}

export function enumeratedSquareRoot(radicand: bigint): bigint | undefined {
  // Squares are successive sums of positive odd integers, independent of the
  // production binary search. This oracle is intentionally only for small n.
  let square = 0n;
  let root = 0n;
  let nextOdd = 1n;
  while (square < radicand) {
    square += nextOdd;
    nextOdd += 2n;
    root += 1n;
  }
  return square === radicand ? root : undefined;
}

export function smallFractionIsReduced(value: FractionModel): boolean {
  if (value.denominator <= 0n) return false;
  if (value.numerator === 0n) return value.denominator === 1n;
  const numerator = value.numerator < 0n ? -value.numerator : value.numerator;
  // Trial division is independent of production Euclid, for small denominators.
  for (
    let divisor = 2n;
    divisor <= value.denominator && divisor <= numerator;
    divisor += 1n
  ) {
    if (numerator % divisor === 0n && value.denominator % divisor === 0n)
      return false;
  }
  return true;
}
