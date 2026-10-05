import { failure, success, type DomainResult } from '../core/result';
import { boundedMultiply, EXACT_LIMITS, withinIntegerBound } from './bounds';

export function integerPower(
  base: unknown,
  exponent: unknown,
): DomainResult<bigint> {
  if (
    typeof base !== 'bigint' ||
    typeof exponent !== 'number' ||
    !Number.isSafeInteger(exponent)
  ) {
    return failure('invalid_input');
  }
  if (exponent < 0) return failure('unsupported_operation');
  if (!withinIntegerBound(base) || exponent > EXACT_LIMITS.powerExponent) {
    return failure('range_exceeded');
  }
  if (base === 0n && exponent === 0) return failure('unsupported_operation');
  let result = 1n;
  let factor = base;
  let remaining = exponent;
  // At most 9 exponent bits under the explicit exponent limit. Each multiply
  // checks growth before allocating, including squaring intermediate factors.
  while (remaining > 0) {
    if (remaining % 2 === 1) {
      const next = boundedMultiply(result, factor);
      if (!next.ok) return next;
      result = next.value;
    }
    remaining = Math.floor(remaining / 2);
    if (remaining > 0) {
      const squared = boundedMultiply(factor, factor);
      if (!squared.ok) return squared;
      factor = squared.value;
    }
  }
  return success(result);
}

export function perfectSquareRoot(radicand: unknown): DomainResult<bigint> {
  if (typeof radicand !== 'bigint') return failure('invalid_input');
  if (radicand < 0n) return failure('unsupported_operation');
  if (!withinIntegerBound(radicand)) return failure('range_exceeded');
  if (radicand < 2n) return success(radicand);
  const bits = radicand.toString(2).length;
  let low = 0n;
  let high = 1n << BigInt(Math.ceil(bits / 2));
  // Binary search an exclusive upper bound of at most 2^128. Thus no more
  // than 128 interval halvings, and each squared midpoint is at most 256 bits.
  for (
    let step = 0;
    step < EXACT_LIMITS.rootIterations && high - low > 1n;
    step += 1
  ) {
    const middle = (low + high) / 2n;
    if (middle * middle <= radicand) low = middle;
    else high = middle;
  }
  if (high - low > 1n) return failure('range_exceeded');
  return low * low === radicand
    ? success(low)
    : failure('unsupported_operation');
}
