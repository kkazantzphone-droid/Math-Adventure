import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { type DomainResult } from '../../../src/domain/core/result';
import { canonicalize } from '../../../src/domain/replay/canonical';
import {
  integerFromDto,
  integerToDto,
} from '../../../src/domain/math/integer-dto';
import {
  EXACT_LIMITS,
  MAX_INTEGER_MAGNITUDE,
  parseExactInteger,
} from '../../../src/domain/math/bounds';
import {
  compareDecimals,
  decimal,
  decimalFromDto,
  decimalToDto,
  decimalToRational,
  equalDecimals,
  rationalToDecimal,
} from '../../../src/domain/math/decimal';
import {
  addIntegers,
  multiplyIntegers,
  naturalSafeInteger,
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
  integerToRational,
  multiplyRationals,
  rational,
  rationalFromDto,
  rationalToDto,
  rationalToSafeInteger,
  subtractRationals,
} from '../../../src/domain/math/rational';
import {
  enumeratedSquareRoot,
  fractionMatches,
  repeatedPower,
} from '../../oracle/math';

function value<T>(result: DomainResult<T>): T {
  if (!result.ok)
    throw new Error(`Unexpected domain error: ${result.error.code}`);
  return result.value;
}

const error = (code: string): unknown => ({ ok: false, error: { code } });

describe('exact-value nominal type boundary', () => {
  function diagnostics(code: string): readonly ts.Diagnostic[] {
    const file = 'src/domain/math/nominal-probe.ts';
    const config = ts.readConfigFile('tsconfig.domain.json', (path) =>
      ts.sys.readFile(path),
    );
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
    const host = ts.createCompilerHost(parsed.options);
    const readSource = host.getSourceFile.bind(host);
    host.getSourceFile = (
      name,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) =>
      name.replaceAll('\\', '/').endsWith(file)
        ? ts.createSourceFile(name, code, languageVersion, true)
        : readSource(name, languageVersion, onError, shouldCreateNewSourceFile);
    return ts.getPreEmitDiagnostics(
      ts.createProgram([file], parsed.options, host),
    );
  }

  it('allows checked factories and DTO rebuilding without exposing constructors', () => {
    expect(
      diagnostics(`
      import { rational, rationalFromDto, rationalToDto, type Rational } from './rational';
      import { decimal, decimalFromDto, decimalToDto, type ExactDecimal } from './decimal';
      const rationalResult = rational(1n, 2n);
      if (rationalResult.ok) {
        const checked: Rational = rationalResult.value;
        void rationalFromDto(rationalToDto(checked));
      }
      const decimalResult = decimal(5n, 1);
      if (decimalResult.ok) {
        const checked: ExactDecimal = decimalResult.value;
        void decimalFromDto(decimalToDto(checked));
      }
    `),
    ).toEqual([]);
  });

  it('rejects spread copies that forge denominator, canonical form or decimal scale', () => {
    const errors = diagnostics(`
      import { rational, type Rational } from './rational';
      import { decimal, type ExactDecimal } from './decimal';
      const rationalResult = rational(1n, 2n);
      if (rationalResult.ok) {
        const zeroDenominator: Rational = { ...rationalResult.value, denominator: 0n };
        const unreduced: Rational = { ...rationalResult.value, numerator: 2n, denominator: 4n };
        void zeroDenominator;
        void unreduced;
      }
      const decimalResult = decimal(5n, 1);
      if (decimalResult.ok) {
        const unboundedScale: ExactDecimal = { ...decimalResult.value, scale: 65 };
        void unboundedScale;
      }
    `);
    expect(errors).toHaveLength(3);
    expect(
      errors.every(
        (diagnostic) => diagnostic.code === 2739 || diagnostic.code === 2741,
      ),
    ).toBe(true);
    for (const diagnostic of errors) {
      expect(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
      ).toContain('#parts');
    }
  });
});

describe('exact safe integers', () => {
  it('accepts signed boundaries and zero, canonicalising negative zero', () => {
    expect(value(signedSafeInteger(Number.MAX_SAFE_INTEGER))).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    expect(value(signedSafeInteger(Number.MIN_SAFE_INTEGER))).toBe(
      Number.MIN_SAFE_INTEGER,
    );
    expect(Object.is(value(signedSafeInteger(-0)), 0)).toBe(true);
    expect(value(naturalSafeInteger(0))).toBe(0);
    expect(naturalSafeInteger(-1)).toEqual(error('invalid_input'));
  });

  it('rejects nonfinite, fractional, unsafe and coerced inputs', () => {
    for (const invalid of [
      NaN,
      Infinity,
      -Infinity,
      1.5,
      '1',
      '1e3',
      null,
      undefined,
      {},
      1n,
    ]) {
      expect(signedSafeInteger(invalid)).toEqual(error('invalid_input'));
    }
    expect(signedSafeInteger(Number.MAX_SAFE_INTEGER + 1)).toEqual(
      error('range_exceeded'),
    );
  });

  it('checks exact boundary results before converting a BigInt to number', () => {
    const maximum = value(signedSafeInteger(Number.MAX_SAFE_INTEGER));
    const minimum = value(signedSafeInteger(Number.MIN_SAFE_INTEGER));
    const one = value(signedSafeInteger(1));
    const two = value(signedSafeInteger(2));
    expect(addIntegers(maximum, one)).toEqual(error('range_exceeded'));
    expect(subtractIntegers(minimum, one)).toEqual(error('range_exceeded'));
    expect(multiplyIntegers(maximum, two)).toEqual(error('range_exceeded'));
    expect(value(subtractIntegers(maximum, one))).toBe(
      Number.MAX_SAFE_INTEGER - 1,
    );
    expect(value(multiplyIntegers(maximum, value(signedSafeInteger(0))))).toBe(
      0,
    );
  });

  it('exhaustively agrees with an independent BigInt oracle for 1,681 input pairs', () => {
    let cases = 0;
    for (let a = -20; a <= 20; a += 1) {
      for (let b = -20; b <= 20; b += 1) {
        const left = value(signedSafeInteger(a));
        const right = value(signedSafeInteger(b));
        expect(BigInt(value(addIntegers(left, right)))).toBe(
          BigInt(a) + BigInt(b),
        );
        expect(BigInt(value(subtractIntegers(left, right)))).toBe(
          BigInt(a) - BigInt(b),
        );
        expect(BigInt(value(multiplyIntegers(left, right)))).toBe(
          BigInt(a) * BigInt(b),
        );
        cases += 1;
      }
    }
    expect(cases).toBe(1681);
  });
});

describe('bounded canonical integer strings', () => {
  it('round-trips exact BigInt results through versioned canonical JSON DTOs', () => {
    for (const original of [
      0n,
      -1n,
      1n,
      -MAX_INTEGER_MAGNITUDE,
      MAX_INTEGER_MAGNITUDE,
    ]) {
      const dto = value(integerToDto(original));
      const decoded: unknown = JSON.parse(value(canonicalize(dto)));
      expect(value(integerFromDto(decoded))).toBe(original);
      expect(Object.isFrozen(dto)).toBe(true);
    }
    expect(integerToDto(MAX_INTEGER_MAGNITUDE + 1n)).toEqual(
      error('range_exceeded'),
    );
    expect(integerFromDto({ schema: 'integer-v2', value: '1' })).toEqual(
      error('unsupported_version'),
    );
    for (const invalid of [
      null,
      { schema: 'integer-v1', value: '01' },
      { schema: 'integer-v1', value: '1', extra: 0 },
      { schema: 'integer-v1', value: 1n },
    ]) {
      expect(integerFromDto(invalid)).toEqual(error('invalid_input'));
    }
  });

  it('accepts exact boundary values and rejects oversized text before BigInt parsing', () => {
    expect(value(parseExactInteger(MAX_INTEGER_MAGNITUDE.toString()))).toBe(
      MAX_INTEGER_MAGNITUDE,
    );
    expect(value(parseExactInteger((-MAX_INTEGER_MAGNITUDE).toString()))).toBe(
      -MAX_INTEGER_MAGNITUDE,
    );
    expect(parseExactInteger((MAX_INTEGER_MAGNITUDE + 1n).toString())).toEqual(
      error('range_exceeded'),
    );
    expect(
      parseExactInteger('1'.repeat(EXACT_LIMITS.inputDecimalDigits + 1)),
    ).toEqual(error('range_exceeded'));
  });

  it('rejects every ambiguous or malformed spelling in hand fixtures', () => {
    for (const invalid of [
      '',
      ' ',
      ' 1',
      '1 ',
      '+1',
      '-0',
      '01',
      '-01',
      '1e2',
      '1.0',
      '--1',
      '0x10',
      '１２',
      '\n1',
      1,
    ]) {
      expect(parseExactInteger(invalid)).toEqual(error('invalid_input'));
    }
  });
});

describe('exact rationals', () => {
  it('reduces, canonicalises sign and zero, and freezes the mathematical value', () => {
    expect(rationalToDto(value(rational(2n, 4n)))).toEqual({
      schema: 'rational-v1',
      numerator: '1',
      denominator: '2',
    });
    expect(rationalToDto(value(rational(3n, -9n)))).toEqual({
      schema: 'rational-v1',
      numerator: '-1',
      denominator: '3',
    });
    expect(rationalToDto(value(rational(-3n, -9n)))).toEqual({
      schema: 'rational-v1',
      numerator: '1',
      denominator: '3',
    });
    expect(rationalToDto(value(rational(0n, -42n)))).toEqual({
      schema: 'rational-v1',
      numerator: '0',
      denominator: '1',
    });
    expect(Object.isFrozen(value(rational(1n, 2n)))).toBe(true);
    expect(rational(1n, 0n)).toEqual(error('division_by_zero'));
    expect(rational(1, 2)).toEqual(error('invalid_input'));
  });

  it('compares exact values and keeps requested form outside equality', () => {
    const half = value(rational(1n, 2n));
    expect(equalRationals(half, value(rational(2n, 4n)))).toBe(true);
    expect(compareRationals(value(rational(-1n, 2n)), half)).toBe(-1);
    expect(compareRationals(value(rational(2n, 3n)), half)).toBe(1);
    expect(compareRationals(half, half)).toBe(0);
  });

  it('checks arithmetic with manually derived fractions and exact cross-products', () => {
    const a = value(rational(-2n, 3n));
    const b = value(rational(3n, 4n));
    expect(
      fractionMatches(value(addRationals(a, b)), {
        numerator: 1n,
        denominator: 12n,
      }),
    ).toBe(true);
    expect(
      fractionMatches(value(subtractRationals(a, b)), {
        numerator: -17n,
        denominator: 12n,
      }),
    ).toBe(true);
    expect(
      fractionMatches(value(multiplyRationals(a, b)), {
        numerator: -1n,
        denominator: 2n,
      }),
    ).toBe(true);
    expect(
      fractionMatches(value(divideRationals(a, b)), {
        numerator: -8n,
        denominator: 9n,
      }),
    ).toBe(true);
    expect(divideRationals(a, value(rational(0n, 1n)))).toEqual(
      error('division_by_zero'),
    );
  });

  it('permits bounded cancellation while rejecting out-of-range inputs and final values', () => {
    const large = value(rational(MAX_INTEGER_MAGNITUDE, 1n));
    const inverse = value(rational(1n, MAX_INTEGER_MAGNITUDE));
    expect(rationalToDto(value(multiplyRationals(large, inverse)))).toEqual({
      schema: 'rational-v1',
      numerator: '1',
      denominator: '1',
    });
    expect(addRationals(large, value(rational(1n, 1n)))).toEqual(
      error('range_exceeded'),
    );
    expect(multiplyRationals(large, large)).toEqual(error('range_exceeded'));
    expect(
      rational(MAX_INTEGER_MAGNITUDE + 1n, MAX_INTEGER_MAGNITUDE + 1n),
    ).toEqual(error('range_exceeded'));
  });

  it('round-trips explicit JSON DTOs without exposing BigInt in the replay data', () => {
    const original = value(rational(-12345678901234567890n, 17n));
    const dto = rationalToDto(original);
    const decoded: unknown = JSON.parse(value(canonicalize(dto)));
    expect(equalRationals(value(rationalFromDto(decoded)), original)).toBe(
      true,
    );
    expect(Object.isFrozen(dto)).toBe(true);
  });

  it('requires a canonical versioned plain-data DTO and never invokes accessors', () => {
    const dto = { schema: 'rational-v1', numerator: '1', denominator: '2' };
    expect(rationalFromDto({ ...dto, schema: 'rational-v2' })).toEqual(
      error('unsupported_version'),
    );
    for (const invalid of [
      null,
      [],
      { ...dto, extra: 1 },
      { ...dto, numerator: '2', denominator: '4' },
      { ...dto, numerator: '0', denominator: '2' },
      { ...dto, denominator: '-2' },
      { ...dto, numerator: '-0' },
      { ...dto, numerator: 1n },
    ]) {
      expect(rationalFromDto(invalid)).toEqual(error('invalid_input'));
    }
    let reads = 0;
    const accessor = {
      ...dto,
      get numerator() {
        reads += 1;
        return '1';
      },
    };
    expect(rationalFromDto(accessor)).toEqual(error('invalid_input'));
    expect(reads).toBe(0);
    expect(rationalFromDto({ ...dto, denominator: '0' })).toEqual(
      error('division_by_zero'),
    );
  });

  it('converts safe integers exactly and rejects fractions or unsafe integer conversion', () => {
    const integer = value(signedSafeInteger(-42));
    expect(
      value(rationalToSafeInteger(value(integerToRational(integer)))),
    ).toBe(-42);
    expect(rationalToSafeInteger(value(rational(1n, 2n)))).toEqual(
      error('unsupported_operation'),
    );
    expect(
      rationalToSafeInteger(value(rational(MAX_INTEGER_MAGNITUDE, 1n))),
    ).toEqual(error('range_exceeded'));
  });
});

describe('exact decimals', () => {
  it('removes mathematical trailing zeros and uses canonical zero', () => {
    const a = value(decimal(100n, 2));
    const b = value(decimal(1000n, 3));
    expect(decimalToDto(a)).toEqual({
      schema: 'decimal-v1',
      coefficient: '1',
      scale: 0,
    });
    expect(equalDecimals(a, b)).toBe(true);
    expect(decimalToDto(value(decimal(0n, 64)))).toEqual({
      schema: 'decimal-v1',
      coefficient: '0',
      scale: 0,
    });
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.is(value(decimal(1n, -0)).scale, 0)).toBe(true);
  });

  it('compares and converts using exact arithmetic, including finite and recurring fractions', () => {
    const tenth = value(decimal(1n, 1));
    expect(compareDecimals(tenth, value(decimal(3n, 1)))).toBe(-1);
    expect(compareDecimals(value(decimal(-1n, 1)), tenth)).toBe(-1);
    expect(compareDecimals(tenth, value(decimal(10n, 2)))).toBe(0);
    expect(rationalToDto(value(decimalToRational(tenth)))).toEqual({
      schema: 'rational-v1',
      numerator: '1',
      denominator: '10',
    });
    expect(
      decimalToDto(value(rationalToDecimal(value(rational(-7n, 40n))))),
    ).toEqual({ schema: 'decimal-v1', coefficient: '-175', scale: 3 });
    expect(rationalToDecimal(value(rational(1n, 3n)))).toEqual(
      error('unsupported_operation'),
    );
  });

  it('round-trips canonical versioned decimal DTOs and rejects alternate spellings', () => {
    const original = value(decimal(-125n, 3));
    const dto = decimalToDto(original);
    const decoded: unknown = JSON.parse(value(canonicalize(dto)));
    expect(equalDecimals(value(decimalFromDto(decoded)), original)).toBe(true);
    expect(decimalFromDto({ ...dto, schema: 'decimal-v2' })).toEqual(
      error('unsupported_version'),
    );
    for (const invalid of [
      { ...dto, coefficient: '1250' },
      { ...dto, coefficient: '0', scale: 3 },
      { ...dto, scale: -0 },
      { ...dto, scale: '3' },
      { ...dto, coefficient: '+125' },
      { ...dto, extra: 1 },
    ]) {
      expect(decimalFromDto(invalid)).toEqual(error('invalid_input'));
    }
  });

  it('bounds coefficient, scale and exact conversions, never approximating a fraction', () => {
    expect(decimal(MAX_INTEGER_MAGNITUDE + 1n, 0)).toEqual(
      error('range_exceeded'),
    );
    expect(decimal(1n, EXACT_LIMITS.decimalScale + 1)).toEqual(
      error('range_exceeded'),
    );
    for (const scale of [-1, 1.5, NaN, Infinity, '2', undefined]) {
      expect(decimal(1n, scale)).toEqual(error('invalid_input'));
    }
    expect(rationalToDecimal(value(rational(1n, 2n ** 65n)))).toEqual(
      error('range_exceeded'),
    );
    expect(
      rationalToDecimal(value(rational(MAX_INTEGER_MAGNITUDE, 2n))),
    ).toEqual(error('range_exceeded'));
    const tiny = value(decimal(1n, EXACT_LIMITS.decimalScale));
    expect(
      equalDecimals(
        value(rationalToDecimal(value(decimalToRational(tiny)))),
        tiny,
      ),
    ).toBe(true);
  });
});

describe('exact bounded powers and principal roots', () => {
  it('defines zero, signs, exponent zero and supported operation domains explicitly', () => {
    expect(value(integerPower(7n, 0))).toBe(1n);
    expect(integerPower(0n, 0)).toEqual(error('unsupported_operation'));
    expect(value(integerPower(0n, 1))).toBe(0n);
    expect(value(integerPower(-3n, 3))).toBe(-27n);
    expect(value(integerPower(-3n, 4))).toBe(81n);
    expect(integerPower(2n, -1)).toEqual(error('unsupported_operation'));
    for (const exponent of [0.5, NaN, Infinity, '2', 2n]) {
      expect(integerPower(2n, exponent)).toEqual(error('invalid_input'));
    }
    expect(integerPower(2, 2)).toEqual(error('invalid_input'));
  });

  it('enforces input, exponent and output limits, including before large products', () => {
    expect(value(integerPower(2n, 255))).toBe(1n << 255n);
    expect(integerPower(2n, 256)).toEqual(error('range_exceeded'));
    expect(value(integerPower(-1n, 256))).toBe(1n);
    expect(integerPower(1n, 257)).toEqual(error('range_exceeded'));
    expect(integerPower(MAX_INTEGER_MAGNITUDE + 1n, 0)).toEqual(
      error('range_exceeded'),
    );
    expect(integerPower(MAX_INTEGER_MAGNITUDE, 2)).toEqual(
      error('range_exceeded'),
    );
  });

  it('exhaustively agrees with repeated multiplication for 188 supported base/exponent pairs', () => {
    let cases = 0;
    for (let base = -10; base <= 10; base += 1) {
      for (let exponent = 0; exponent <= 8; exponent += 1) {
        if (base === 0 && exponent === 0) continue;
        expect(value(integerPower(BigInt(base), exponent))).toBe(
          repeatedPower(BigInt(base), exponent),
        );
        cases += 1;
      }
    }
    expect(cases).toBe(188);
  });

  it('returns principal roots, keeping equation solutions and nonperfect roots distinct', () => {
    expect(value(perfectSquareRoot(16n))).toBe(4n);
    expect(value(perfectSquareRoot(0n))).toBe(0n);
    expect(value(perfectSquareRoot(1n))).toBe(1n);
    expect(perfectSquareRoot(2n)).toEqual(error('unsupported_operation'));
    expect(perfectSquareRoot(-16n)).toEqual(error('unsupported_operation'));
    expect(perfectSquareRoot(16)).toEqual(error('invalid_input'));
    const maximumRoot = (1n << 128n) - 1n;
    expect(value(perfectSquareRoot(maximumRoot * maximumRoot))).toBe(
      maximumRoot,
    );
    expect(perfectSquareRoot(MAX_INTEGER_MAGNITUDE)).toEqual(
      error('unsupported_operation'),
    );
    expect(perfectSquareRoot(MAX_INTEGER_MAGNITUDE + 1n)).toEqual(
      error('range_exceeded'),
    );
  });

  it('exhaustively compares all 4,097 radicands with independent odd-number accumulation', () => {
    let cases = 0;
    for (let radicand = 0n; radicand <= 4096n; radicand += 1n) {
      const expected = enumeratedSquareRoot(radicand);
      const actual = perfectSquareRoot(radicand);
      if (expected === undefined)
        expect(actual).toEqual(error('unsupported_operation'));
      else expect(value(actual)).toBe(expected);
      cases += 1;
    }
    expect(cases).toBe(4097);
  });
});
