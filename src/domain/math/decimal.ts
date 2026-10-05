import { dataRecord, hasKeys } from '../core/data';
import { failure, success, type DomainResult } from '../core/result';
import { EXACT_LIMITS, parseExactInteger, withinIntegerBound } from './bounds';
import { rational, type Rational } from './rational';

// Module-local nominal value with no exported unchecked constructor. A spread
// copy cannot carry the private field that establishes the validated type.
class DecimalValue {
  readonly #parts: readonly [bigint, number];

  constructor(coefficient: bigint, scale: number) {
    this.#parts = Object.freeze([coefficient, scale] as const);
    Object.freeze(this);
  }

  get coefficient(): bigint {
    return this.#parts[0];
  }

  get scale(): number {
    return this.#parts[1];
  }
}

export type ExactDecimal = DecimalValue;

export interface DecimalDto {
  readonly schema: 'decimal-v1';
  readonly coefficient: string;
  readonly scale: number;
}

export function decimal(
  coefficient: unknown,
  scale: unknown,
): DomainResult<ExactDecimal> {
  if (
    typeof coefficient !== 'bigint' ||
    typeof scale !== 'number' ||
    !Number.isSafeInteger(scale) ||
    scale < 0
  ) {
    return failure('invalid_input');
  }
  if (!withinIntegerBound(coefficient) || scale > EXACT_LIMITS.decimalScale) {
    return failure('range_exceeded');
  }
  // Mathematical canonicalisation. Requested/displayed trailing zeros belong
  // to a future pedagogical representation contract, outside mathematical truth.
  let coefficientValue = coefficient;
  let decimalScale = scale;
  if (coefficientValue === 0n) decimalScale = 0;
  while (decimalScale > 0 && coefficientValue % 10n === 0n) {
    coefficientValue /= 10n;
    decimalScale -= 1;
  }
  return success(
    new DecimalValue(coefficientValue, decimalScale === 0 ? 0 : decimalScale),
  );
}

export function decimalToDto(value: ExactDecimal): DecimalDto {
  return Object.freeze({
    schema: 'decimal-v1',
    coefficient: value.coefficient.toString(),
    scale: value.scale,
  });
}

export function decimalFromDto(input: unknown): DomainResult<ExactDecimal> {
  const data = dataRecord(input);
  if (!data || !hasKeys(data, ['schema', 'coefficient', 'scale']))
    return failure('invalid_input');
  if (data.schema !== 'decimal-v1') return failure('unsupported_version');
  const coefficient = parseExactInteger(data.coefficient);
  if (!coefficient.ok) return coefficient;
  if (Object.is(data.scale, -0)) return failure('invalid_input');
  const result = decimal(coefficient.value, data.scale);
  if (!result.ok) return result;
  if (
    result.value.coefficient !== coefficient.value ||
    result.value.scale !== data.scale
  ) {
    return failure('invalid_input');
  }
  return result;
}

export function equalDecimals(
  left: ExactDecimal,
  right: ExactDecimal,
): boolean {
  return left.coefficient === right.coefficient && left.scale === right.scale;
}

export function compareDecimals(
  left: ExactDecimal,
  right: ExactDecimal,
): -1 | 0 | 1 {
  const difference =
    left.coefficient * 10n ** BigInt(right.scale) -
    right.coefficient * 10n ** BigInt(left.scale);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

export function decimalToRational(value: ExactDecimal): DomainResult<Rational> {
  return rational(value.coefficient, 10n ** BigInt(value.scale));
}

export function rationalToDecimal(value: Rational): DomainResult<ExactDecimal> {
  let denominator = value.denominator;
  let twos = 0;
  let fives = 0;
  while (denominator % 2n === 0n) {
    denominator /= 2n;
    twos += 1;
  }
  while (denominator % 5n === 0n) {
    denominator /= 5n;
    fives += 1;
  }
  if (denominator !== 1n) return failure('unsupported_operation');
  const scale = Math.max(twos, fives);
  if (scale > EXACT_LIMITS.decimalScale) return failure('range_exceeded');
  // At most 256 + 213 bits before decimal() validates the canonical coefficient.
  return decimal(
    value.numerator * 2n ** BigInt(scale - twos) * 5n ** BigInt(scale - fives),
    scale,
  );
}
