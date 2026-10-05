import { failure, success, type DomainResult } from '../core/result';

// Engine protection, independent of learner age or pedagogical difficulty.
export const EXACT_LIMITS = Object.freeze({
  integerBits: 256,
  inputDecimalDigits: 78,
  decimalScale: 64,
  powerExponent: 256,
  rootIterations: 128,
});

export const MAX_INTEGER_MAGNITUDE =
  (1n << BigInt(EXACT_LIMITS.integerBits)) - 1n;

export function magnitude(value: bigint): bigint {
  return value < 0n ? -value : value;
}

export function withinIntegerBound(value: bigint): boolean {
  return magnitude(value) <= MAX_INTEGER_MAGNITUDE;
}

// Canonical base-ten integers: no whitespace, plus, exponent, leading zero or -0.
export function parseExactInteger(input: unknown): DomainResult<bigint> {
  if (typeof input !== 'string') return failure('invalid_input');
  const digits = input.startsWith('-') ? input.length - 1 : input.length;
  if (digits > EXACT_LIMITS.inputDecimalDigits)
    return failure('range_exceeded');
  if (!/^(?:0|-[1-9][0-9]*|[1-9][0-9]*)$/.test(input))
    return failure('invalid_input');
  const value = BigInt(input);
  return withinIntegerBound(value) ? success(value) : failure('range_exceeded');
}

export function boundedMultiply(
  left: bigint,
  right: bigint,
): DomainResult<bigint> {
  const a = magnitude(left);
  const b = magnitude(right);
  // Division is exact; reject before a potentially oversized product is allocated.
  if (a !== 0n && b > MAX_INTEGER_MAGNITUDE / a)
    return failure('range_exceeded');
  return success(left * right);
}
