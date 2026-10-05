import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type DomainResult } from '../../../src/domain/core/result';
import { canonicalize } from '../../../src/domain/replay/canonical';
import {
  integerFromDto,
  integerToDto,
} from '../../../src/domain/math/integer-dto';
import {
  compareDecimals,
  decimal,
  decimalFromDto,
  decimalToDto,
  decimalToRational,
  rationalToDecimal,
} from '../../../src/domain/math/decimal';
import {
  addIntegers,
  multiplyIntegers,
  signedSafeInteger,
  subtractIntegers,
} from '../../../src/domain/math/integer';
import {
  integerPower,
  perfectSquareRoot,
} from '../../../src/domain/math/powers';
import {
  addRationals,
  compareRationals,
  divideRationals,
  equalRationals,
  multiplyRationals,
  rational,
  rationalFromDto,
  rationalToDto,
  subtractRationals,
} from '../../../src/domain/math/rational';
import {
  fractionMatches,
  fractionOrder,
  repeatedPower,
  smallFractionIsReduced,
} from '../../oracle/math';

const parameters = { seed: 20261005, numRuns: 1000 };
const numerator = fc.bigInt({ min: -1000000n, max: 1000000n });
const denominator = fc.bigInt({ min: 1n, max: 1000n });

function value<T>(result: DomainResult<T>): T {
  if (!result.ok)
    throw new Error(`Unexpected domain error: ${result.error.code}`);
  return result.value;
}

describe('independent exact-value properties — 1,000 reproducible cases each', () => {
  it('integer result DTO canonical JSON round-trips every bounded exact integer', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: -(1n << 256n) + 1n, max: (1n << 256n) - 1n }),
        (original) => {
          const dto = value(integerToDto(original));
          const decoded: unknown = JSON.parse(value(canonicalize(dto)));
          expect(value(integerFromDto(decoded))).toBe(original);
        },
      ),
      parameters,
    );
  });

  it('rational canonicalisation preserves cross-product truth and has no common factor', () => {
    fc.assert(
      fc.property(numerator, denominator, fc.boolean(), (n, d, negative) => {
        const signed = negative ? -d : d;
        const actual = value(rational(n, signed));
        expect(
          fractionMatches(actual, { numerator: n, denominator: signed }),
        ).toBe(true);
        expect(smallFractionIsReduced(actual)).toBe(true);
        expect(actual.denominator > 0n).toBe(true);
      }),
      parameters,
    );
  });

  it('rational DTO JSON round-trips reconstruct the original mathematical value', () => {
    fc.assert(
      fc.property(numerator, denominator, (n, d) => {
        const original = value(rational(n, d));
        const decoded: unknown = JSON.parse(
          value(canonicalize(rationalToDto(original))),
        );
        const rebuilt = value(rationalFromDto(decoded));
        expect(fractionMatches(rebuilt, { numerator: n, denominator: d })).toBe(
          true,
        );
        expect(equalRationals(original, rebuilt)).toBe(true);
      }),
      parameters,
    );
  });

  it('rational equality and order agree with independent cross-products', () => {
    fc.assert(
      fc.property(
        numerator,
        denominator,
        numerator,
        denominator,
        (an, ad, bn, bd) => {
          const a = value(rational(an, ad));
          const b = value(rational(bn, bd));
          const expected = fractionOrder(
            { numerator: an, denominator: ad },
            { numerator: bn, denominator: bd },
          );
          expect(compareRationals(a, b)).toBe(expected);
          expect(equalRationals(a, b)).toBe(expected === 0);
          expect(equalRationals(a, value(rational(an * 7n, ad * 7n)))).toBe(
            true,
          );
        },
      ),
      parameters,
    );
  });

  it('rational arithmetic agrees with independently stated fraction identities', () => {
    fc.assert(
      fc.property(
        numerator,
        denominator,
        numerator,
        denominator,
        (an, ad, bn, bd) => {
          const a = value(rational(an, ad));
          const b = value(rational(bn, bd));
          expect(
            fractionMatches(value(addRationals(a, b)), {
              numerator: an * bd + bn * ad,
              denominator: ad * bd,
            }),
          ).toBe(true);
          expect(
            fractionMatches(value(subtractRationals(a, b)), {
              numerator: an * bd - bn * ad,
              denominator: ad * bd,
            }),
          ).toBe(true);
          expect(
            fractionMatches(value(multiplyRationals(a, b)), {
              numerator: an * bn,
              denominator: ad * bd,
            }),
          ).toBe(true);
          if (bn !== 0n)
            expect(
              fractionMatches(value(divideRationals(a, b)), {
                numerator: an * bd,
                denominator: ad * bn,
              }),
            ).toBe(true);
          else
            expect(divideRationals(a, b)).toEqual({
              ok: false,
              error: { code: 'division_by_zero' },
            });
        },
      ),
      parameters,
    );
  });

  it('decimal to rational conversion matches the independent coefficient/10^scale model', () => {
    fc.assert(
      fc.property(
        numerator,
        fc.integer({ min: 0, max: 12 }),
        (coefficient, scale) => {
          const original = value(decimal(coefficient, scale));
          const converted = value(decimalToRational(original));
          expect(
            fractionMatches(converted, {
              numerator: coefficient,
              denominator: repeatedPower(10n, scale),
            }),
          ).toBe(true);
          const rebuilt = value(rationalToDecimal(converted));
          expect(rebuilt.coefficient).toBe(original.coefficient);
          expect(rebuilt.scale).toBe(original.scale);
          const decoded: unknown = JSON.parse(
            value(canonicalize(decimalToDto(original))),
          );
          expect(decimalToDto(value(decimalFromDto(decoded)))).toEqual(
            decimalToDto(original),
          );
        },
      ),
      parameters,
    );
  });

  it('decimal order agrees with independent exact fraction comparison', () => {
    fc.assert(
      fc.property(
        numerator,
        fc.integer({ min: 0, max: 12 }),
        numerator,
        fc.integer({ min: 0, max: 12 }),
        (a, sa, b, sb) => {
          expect(
            compareDecimals(value(decimal(a, sa)), value(decimal(b, sb))),
          ).toBe(
            fractionOrder(
              { numerator: a, denominator: repeatedPower(10n, sa) },
              { numerator: b, denominator: repeatedPower(10n, sb) },
            ),
          );
        },
      ),
      parameters,
    );
  });

  it('finite fractions with only factors two and five convert exactly to decimals', () => {
    fc.assert(
      fc.property(
        numerator,
        fc.integer({ min: 0, max: 16 }),
        fc.integer({ min: 0, max: 16 }),
        (n, twos, fives) => {
          const d = repeatedPower(2n, twos) * repeatedPower(5n, fives);
          const converted = value(rationalToDecimal(value(rational(n, d))));
          expect(
            fractionMatches(
              {
                numerator: converted.coefficient,
                denominator: repeatedPower(10n, converted.scale),
              },
              { numerator: n, denominator: d },
            ),
          ).toBe(true);
        },
      ),
      parameters,
    );
  });

  it('safe-integer arithmetic success and overflow agree with an independent BigInt oracle', () => {
    const safe = fc.bigInt({
      min: BigInt(Number.MIN_SAFE_INTEGER),
      max: BigInt(Number.MAX_SAFE_INTEGER),
    });
    fc.assert(
      fc.property(safe, safe, (a, b) => {
        const left = value(signedSafeInteger(Number(a)));
        const right = value(signedSafeInteger(Number(b)));
        const pairs = [
          [addIntegers(left, right), a + b],
          [subtractIntegers(left, right), a - b],
          [multiplyIntegers(left, right), a * b],
        ] as const;
        for (const [result, exact] of pairs) {
          if (
            exact < BigInt(Number.MIN_SAFE_INTEGER) ||
            exact > BigInt(Number.MAX_SAFE_INTEGER)
          )
            expect(result).toEqual({
              ok: false,
              error: { code: 'range_exceeded' },
            });
          else expect(BigInt(value(result))).toBe(exact);
        }
      }),
      parameters,
    );
  });

  it('bounded powers match repeated multiplication, including signs and exponent zero', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: -1000n, max: 1000n }),
        fc.integer({ min: 0, max: 16 }),
        (base, exponent) => {
          if (base === 0n && exponent === 0)
            expect(integerPower(base, exponent)).toEqual({
              ok: false,
              error: { code: 'unsupported_operation' },
            });
          else
            expect(value(integerPower(base, exponent))).toBe(
              repeatedPower(base, exponent),
            );
        },
      ),
      parameters,
    );
  });

  it('principal roots satisfy independent multiplication and exclude adjacent nonsquares', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: (1n << 128n) - 1n }), (root) => {
        const square = root * root;
        expect(value(perfectSquareRoot(square))).toBe(root);
        expect(perfectSquareRoot(square + 1n)).toEqual({
          ok: false,
          error: { code: 'unsupported_operation' },
        });
        if (root > 1n)
          expect(perfectSquareRoot(square - 1n)).toEqual({
            ok: false,
            error: { code: 'unsupported_operation' },
          });
      }),
      parameters,
    );
  });
});
