import { failure, success, type DomainResult } from '../core/result';

declare const signedIntegerBrand: unique symbol;
declare const naturalIntegerBrand: unique symbol;

export type SignedSafeInteger = number & {
  readonly [signedIntegerBrand]: true;
};
export type NaturalSafeInteger = SignedSafeInteger & {
  readonly [naturalIntegerBrand]: true;
};

export function signedSafeInteger(
  input: unknown,
): DomainResult<SignedSafeInteger> {
  if (
    typeof input !== 'number' ||
    !Number.isFinite(input) ||
    !Number.isInteger(input)
  ) {
    return failure('invalid_input');
  }
  if (!Number.isSafeInteger(input)) return failure('range_exceeded');
  return success((input === 0 ? 0 : input) as SignedSafeInteger);
}

export function naturalSafeInteger(
  input: unknown,
): DomainResult<NaturalSafeInteger> {
  const integer = signedSafeInteger(input);
  if (!integer.ok) return integer;
  if (integer.value < 0) return failure('invalid_input');
  return success(integer.value as NaturalSafeInteger);
}

function integerOperation(
  left: SignedSafeInteger,
  right: SignedSafeInteger,
  operation: 'add' | 'subtract' | 'multiply',
): DomainResult<SignedSafeInteger> {
  const a = signedSafeInteger(left);
  const b = signedSafeInteger(right);
  if (!a.ok) return a;
  if (!b.ok) return b;
  const x = BigInt(a.value);
  const y = BigInt(b.value);
  const exact =
    operation === 'add' ? x + y : operation === 'subtract' ? x - y : x * y;
  if (
    exact < BigInt(Number.MIN_SAFE_INTEGER) ||
    exact > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    return failure('range_exceeded');
  }
  return success(Number(exact) as SignedSafeInteger);
}

export function addIntegers(
  left: SignedSafeInteger,
  right: SignedSafeInteger,
): DomainResult<SignedSafeInteger> {
  return integerOperation(left, right, 'add');
}

export function subtractIntegers(
  left: SignedSafeInteger,
  right: SignedSafeInteger,
): DomainResult<SignedSafeInteger> {
  return integerOperation(left, right, 'subtract');
}

export function multiplyIntegers(
  left: SignedSafeInteger,
  right: SignedSafeInteger,
): DomainResult<SignedSafeInteger> {
  return integerOperation(left, right, 'multiply');
}
