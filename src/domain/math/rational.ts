import { dataRecord, hasKeys } from '../core/data';
import { failure, success, type DomainResult } from '../core/result';
import { magnitude, parseExactInteger, withinIntegerBound } from './bounds';
import { signedSafeInteger, type SignedSafeInteger } from './integer';

// The module-local nominal class prevents structurally forged spread copies
// from retaining the validated type. Its unchecked constructor is not exported.
class RationalValue {
  readonly #parts: readonly [bigint, bigint];

  constructor(numerator: bigint, denominator: bigint) {
    this.#parts = Object.freeze([numerator, denominator] as const);
    Object.freeze(this);
  }

  get numerator(): bigint {
    return this.#parts[0];
  }

  get denominator(): bigint {
    return this.#parts[1];
  }
}

export type Rational = RationalValue;

export interface RationalDto {
  readonly schema: 'rational-v1';
  readonly numerator: string;
  readonly denominator: string;
}

function reduced(
  numerator: bigint,
  denominator: bigint,
): DomainResult<Rational> {
  if (denominator === 0n) return failure('division_by_zero');
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  let a = magnitude(numerator);
  let b = denominator;
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  const n = numerator / a;
  const d = denominator / a;
  if (!withinIntegerBound(n) || !withinIntegerBound(d))
    return failure('range_exceeded');
  return success(new RationalValue(n, d));
}

export function rational(
  numerator: unknown,
  denominator: unknown,
): DomainResult<Rational> {
  if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint') {
    return failure('invalid_input');
  }
  if (!withinIntegerBound(numerator) || !withinIntegerBound(denominator)) {
    return failure('range_exceeded');
  }
  return reduced(numerator, denominator);
}

export function rationalToDto(value: Rational): RationalDto {
  return Object.freeze({
    schema: 'rational-v1',
    numerator: value.numerator.toString(),
    denominator: value.denominator.toString(),
  });
}

export function rationalFromDto(input: unknown): DomainResult<Rational> {
  const data = dataRecord(input);
  if (!data || !hasKeys(data, ['schema', 'numerator', 'denominator'])) {
    return failure('invalid_input');
  }
  if (data.schema !== 'rational-v1') return failure('unsupported_version');
  const n = parseExactInteger(data.numerator);
  const d = parseExactInteger(data.denominator);
  if (!n.ok) return n;
  if (!d.ok) return d;
  if (d.value === 0n) return failure('division_by_zero');
  if (d.value < 0n) return failure('invalid_input');
  const result = reduced(n.value, d.value);
  if (!result.ok) return result;
  // DTOs have one spelling, including reduced form and canonical zero 0/1.
  if (
    result.value.numerator !== n.value ||
    result.value.denominator !== d.value
  ) {
    return failure('invalid_input');
  }
  return result;
}

export function equalRationals(left: Rational, right: Rational): boolean {
  return (
    left.numerator === right.numerator && left.denominator === right.denominator
  );
}

export function compareRationals(left: Rational, right: Rational): -1 | 0 | 1 {
  const difference =
    left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

// Constructor inputs are bounded to 256 bits/component. These intermediates are
// therefore at most 513 bits, before reduction and output-bound validation.
export function addRationals(
  left: Rational,
  right: Rational,
): DomainResult<Rational> {
  return reduced(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function subtractRationals(
  left: Rational,
  right: Rational,
): DomainResult<Rational> {
  return reduced(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function multiplyRationals(
  left: Rational,
  right: Rational,
): DomainResult<Rational> {
  return reduced(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

export function divideRationals(
  left: Rational,
  right: Rational,
): DomainResult<Rational> {
  return reduced(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

export function integerToRational(
  value: SignedSafeInteger,
): DomainResult<Rational> {
  const integer = signedSafeInteger(value);
  return integer.ok ? rational(BigInt(integer.value), 1n) : integer;
}

export function rationalToSafeInteger(
  value: Rational,
): DomainResult<SignedSafeInteger> {
  if (value.denominator !== 1n) return failure('unsupported_operation');
  if (
    value.numerator < BigInt(Number.MIN_SAFE_INTEGER) ||
    value.numerator > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    return failure('range_exceeded');
  }
  return signedSafeInteger(Number(value.numerator));
}
