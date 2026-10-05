import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import { dataArray } from '../core/data';

export const RNG_ALGORITHM_ID = 'xoshiro128ss-v1';
export type RandomState = readonly [number, number, number, number];
export interface RandomDraw {
  readonly value: number;
  readonly state: RandomState;
}

export function validState(input: unknown): input is RandomState {
  const words = dataArray(input, 4);
  return (
    words !== undefined &&
    words.length === 4 &&
    words.every(
      (word) =>
        typeof word === 'number' &&
        Number.isInteger(word) &&
        word >= 0 &&
        word <= 0xffff_ffff,
    ) &&
    words.some((word) => word !== 0)
  );
}

export function parseSeed(input: unknown): DomainResult<RandomState> {
  if (
    typeof input !== 'string' ||
    input.length !== 32 ||
    !/^[0-9a-fA-F]{32}$/.test(input)
  )
    return failure('invalid_seed');
  const state: RandomState = [
    Number.parseInt(input.slice(0, 8), 16),
    Number.parseInt(input.slice(8, 16), 16),
    Number.parseInt(input.slice(16, 24), 16),
    Number.parseInt(input.slice(24, 32), 16),
  ];
  return validState(state) ? success(state) : failure('invalid_seed');
}

export function seedHex(input: unknown): DomainResult<string> {
  return validState(input)
    ? success(input.map((word) => word.toString(16).padStart(8, '0')).join(''))
    : failure('invalid_seed');
}

function rotateLeft(word: number, bits: number): number {
  return ((word << bits) | (word >>> (32 - bits))) >>> 0;
}

/** Original authors' xoshiro128** transition, unsigned mod 2^32 throughout. */
export function nextRandom(input: unknown): DomainResult<RandomDraw> {
  if (!validState(input)) return failure('invalid_seed');
  let [s0, s1, s2, s3] = input;
  const value = Math.imul(rotateLeft(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
  const t = (s1 << 9) >>> 0;
  s2 = (s2 ^ s0) >>> 0;
  s3 = (s3 ^ s1) >>> 0;
  s1 = (s1 ^ s2) >>> 0;
  s0 = (s0 ^ s3) >>> 0;
  s2 = (s2 ^ t) >>> 0;
  s3 = rotateLeft(s3, 11);
  return success({ value, state: [s0, s1, s2, s3] });
}

export type BoundedDrawResult =
  | {
      readonly ok: true;
      readonly value: number;
      readonly state: RandomState;
      readonly draws: number;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: 'invalid_input' | 'invalid_seed' | 'draw_unavailable';
      };
      readonly state?: RandomState;
      readonly draws: number;
    };

/** Each residue has exactly floor(2^32 / bound) accepted preimages.
 * bound is exclusive, 1..2^32. Rejected words consume state. At most 128 draws.
 */
export function boundedChoice(
  input: unknown,
  bound: unknown,
  attempts: unknown = 128,
): BoundedDrawResult {
  if (!validState(input))
    return { ok: false, error: { code: 'invalid_seed' }, draws: 0 };
  if (
    typeof bound !== 'number' ||
    !Number.isInteger(bound) ||
    bound < 1 ||
    bound > 0x1_0000_0000 ||
    typeof attempts !== 'number' ||
    !Number.isInteger(attempts) ||
    attempts < 1 ||
    attempts > 128
  )
    return { ok: false, error: { code: 'invalid_input' }, draws: 0 };
  let state: RandomState = [...input];
  const limit = Math.floor(0x1_0000_0000 / bound) * bound;
  for (let draws = 1; draws <= attempts; draws += 1) {
    const draw = nextRandom(state);
    if (!draw.ok)
      return { ok: false, error: { code: 'invalid_seed' }, draws: draws - 1 };
    state = draw.value.state;
    if (draw.value.value < limit)
      return { ok: true, value: draw.value.value % bound, state, draws };
  }
  return {
    ok: false,
    error: { code: 'draw_unavailable' },
    state,
    draws: attempts,
  };
}
