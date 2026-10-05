// Test-only independent model of Blackman/Vigna xoshiro128** 1.1.
// Unlike production JS number bitwise operations, this uses unbounded BigInt
// xor and arithmetic modulo 2^32; rotation uses quotient/remainder arithmetic.
// Reference: https://prng.di.unimi.it/xoshiro128starstar.c, 2026-10-05.
// This file imports no production module and must never enter the UI bundle.

export type ReferenceWords = readonly [bigint, bigint, bigint, bigint];

export interface ReferenceStep {
  readonly value: number;
  readonly state: ReferenceWords;
}

export interface ReferenceDraw {
  readonly value: number;
  readonly nextState: readonly [number, number, number, number];
}

export type ReferenceBoundedResult =
  | {
      readonly ok: true;
      readonly value: number;
      readonly state: ReferenceWords;
      readonly attempts: number;
      readonly threshold: number;
      readonly draws: readonly ReferenceDraw[];
    }
  | {
      readonly ok: false;
      readonly state: ReferenceWords;
      readonly attempts: number;
      readonly threshold: number;
      readonly draws: readonly ReferenceDraw[];
    };

const modulus = 2n ** 32n;

function rotateArithmetic(word: bigint, distance: bigint): bigint {
  const lowerWidth = 2n ** (32n - distance);
  return ((word % lowerWidth) * 2n ** distance + word / lowerWidth) % modulus;
}

export function referenceSeed(text: string): ReferenceWords {
  if (!/^[0-9a-fA-F]{32}$/.test(text)) {
    throw new Error(
      'Reference fixture requires exactly 32 hexadecimal digits.',
    );
  }
  const state = [
    BigInt(`0x${text.slice(0, 8)}`),
    BigInt(`0x${text.slice(8, 16)}`),
    BigInt(`0x${text.slice(16, 24)}`),
    BigInt(`0x${text.slice(24, 32)}`),
  ] as const;
  if (state.every((word) => word === 0n)) {
    throw new Error('Reference fixture requires nonzero state.');
  }
  return state;
}

export function referenceStateNumbers(
  state: ReferenceWords,
): readonly [number, number, number, number] {
  return [
    Number(state[0]),
    Number(state[1]),
    Number(state[2]),
    Number(state[3]),
  ];
}

export function referenceStateText(state: ReferenceWords): string {
  return state.map((word) => word.toString(16).padStart(8, '0')).join('');
}

export function referenceNext(state: ReferenceWords): ReferenceStep {
  const [a, b, c, d] = state;
  const scrambled = (rotateArithmetic((b * 5n) % modulus, 7n) * 9n) % modulus;

  // Algebraically simultaneous form of the reference's ordered assignments.
  const cXorA = c ^ a;
  const dXorB = d ^ b;
  return {
    value: Number(scrambled),
    state: [
      a ^ dXorB,
      b ^ cXorA,
      cXorA ^ ((b * 512n) % modulus),
      rotateArithmetic(dXorB, 11n),
    ],
  };
}

export function referenceBounded(
  initialState: ReferenceWords,
  bound: number,
  maxAttempts = 128,
): ReferenceBoundedResult {
  if (!Number.isInteger(bound) || bound < 1 || bound > Number(modulus)) {
    throw new Error('Reference bound must be an integer from 1 through 2^32.');
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 128) {
    throw new Error(
      'Reference attempts must be an integer from 1 through 128.',
    );
  }
  const exactBound = BigInt(bound);
  const threshold = (modulus / exactBound) * exactBound;
  const draws: ReferenceDraw[] = [];
  let state = initialState;
  for (let attempts = 1; attempts <= maxAttempts; attempts += 1) {
    const step = referenceNext(state);
    state = step.state;
    draws.push({ value: step.value, nextState: referenceStateNumbers(state) });
    if (BigInt(step.value) < threshold) {
      return {
        ok: true,
        value: Number(BigInt(step.value) % exactBound),
        state,
        attempts,
        threshold: Number(threshold),
        draws,
      };
    }
  }
  return {
    ok: false,
    state,
    attempts: maxAttempts,
    threshold: Number(threshold),
    draws,
  };
}

// Reproducible fixture authoring entry point; never reads the production PRNG.
export function createXoshiroGoldenFixture() {
  const lowWords = '00000001000000020000000300000004';
  const mixedWords = '0123456789abcdefdeadbeeffedcba98';
  const allOnes = 'ffffffffffffffffffffffffffffffff';
  const sequenceInputs = [
    { label: 'synthetic-low-words', seed: lowWords },
    { label: 'synthetic-mixed-high-words', seed: mixedWords },
    { label: 'synthetic-all-ones', seed: allOnes },
  ];
  const boundedInputs = [
    { label: 'bound-one', seed: lowWords, bound: 1, maxAttempts: 128 },
    { label: 'power-two-small', seed: lowWords, bound: 2, maxAttempts: 128 },
    {
      label: 'power-two-sixteen',
      seed: mixedWords,
      bound: 16,
      maxAttempts: 128,
    },
    { label: 'nonpower-three', seed: lowWords, bound: 3, maxAttempts: 128 },
    { label: 'nonpower-ten', seed: mixedWords, bound: 10, maxAttempts: 128 },
    {
      label: 'maximum-bound',
      seed: mixedWords,
      bound: 4294967296,
      maxAttempts: 128,
    },
    {
      label: 'near-maximum-bound',
      seed: mixedWords,
      bound: 4294967295,
      maxAttempts: 128,
    },
    {
      label: 'forced-rejection',
      seed: allOnes,
      bound: 2147483649,
      maxAttempts: 128,
    },
    {
      label: 'forced-exhaustion',
      seed: allOnes,
      bound: 2147483649,
      maxAttempts: 1,
    },
  ];
  return {
    schema: 'math-adventure.xoshiro-golden-v1',
    algorithmId: 'xoshiro128ss-v1',
    syntheticOnly: true,
    provenance: {
      authors: ['David Blackman', 'Sebastiano Vigna'],
      referenceUrl: 'https://prng.di.unimi.it/xoshiro128starstar.c',
      referenceVersion: 'xoshiro128** 1.1',
      accessed: '2026-10-05',
      method:
        'Independent BigInt modulo/arithmetic-rotation reference model; no production import.',
      manualCrossCheck:
        'Seed words [1,2,3,4]: first output 11520, next state [7,0,1026,12288].',
      license:
        'Author public-domain dedication with unrestricted permission and warranty disclaimer; source does not name CC0.',
    },
    sequences: sequenceInputs.map(({ label, seed }) => {
      let state = referenceSeed(seed);
      const initialState = referenceStateNumbers(state);
      const draws: ReferenceDraw[] = [];
      for (let index = 0; index < 16; index += 1) {
        const step = referenceNext(state);
        state = step.state;
        draws.push({
          value: step.value,
          nextState: referenceStateNumbers(state),
        });
      }
      return { label, seed, initialState, draws };
    }),
    bounded: boundedInputs.map(({ label, seed, bound, maxAttempts }) => {
      const draw = referenceBounded(referenceSeed(seed), bound, maxAttempts);
      return {
        label,
        seed,
        bound,
        maxAttempts,
        threshold: draw.threshold,
        ok: draw.ok,
        value: draw.ok ? draw.value : null,
        attempts: draw.attempts,
        nextState: referenceStateNumbers(draw.state),
        draws: draw.draws,
      };
    }),
    invalidSeeds: [
      { label: 'all-zero', seed: '00000000000000000000000000000000' },
      { label: 'empty', seed: '' },
      { label: 'short', seed: '0000000100000002000000030000000' },
      { label: 'long', seed: '000000010000000200000003000000040' },
      { label: 'prefix', seed: '0x00000001000000020000000300000004' },
      { label: 'nonhex', seed: '0000000100000002000000030000000g' },
      { label: 'leading-space', seed: ' 00000001000000020000000300000004' },
      { label: 'trailing-space', seed: '00000001000000020000000300000004 ' },
    ],
  };
}
