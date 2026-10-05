import { describe, expect, it } from 'vitest';
import golden from '../../fixtures/golden/xoshiro128ss-v1.json';
import {
  boundedChoice,
  nextRandom,
  parseSeed,
  seedHex,
} from '../../../src/domain/random/xoshiro';
import { createXoshiroGoldenFixture } from '../../oracle/xoshiro-reference';

describe('xoshiro128ss-v1 independent author-reference vectors', () => {
  it('matches all 48 outputs and next states and regenerates the fixture independently', () => {
    expect(createXoshiroGoldenFixture()).toEqual(golden);
    for (const sequence of golden.sequences) {
      const parsed = parseSeed(sequence.seed);
      if (!parsed.ok) throw new Error('invalid fixture seed');
      let state = parsed.value;
      expect(state).toEqual(sequence.initialState);
      for (const expected of sequence.draws) {
        const actual = nextRandom(state);
        if (!actual.ok) throw new Error('invalid vector state');
        expect(actual.value).toEqual({
          value: expected.value,
          state: expected.nextState,
        });
        state = actual.value.state;
      }
    }
  });
  it('matches nine bounded vectors including forced rejection/consumed-state exhaustion', () => {
    for (const fixture of golden.bounded) {
      const seed = parseSeed(fixture.seed);
      if (!seed.ok) throw new Error('invalid fixture');
      const result = boundedChoice(
        seed.value,
        fixture.bound,
        fixture.maxAttempts,
      );
      expect(result.ok).toBe(fixture.ok);
      expect(result.draws).toBe(fixture.attempts);
      expect(result.state).toEqual(fixture.nextState);
      if (result.ok) expect(result.value).toBe(fixture.value);
      else expect(result.error.code).toBe('draw_unavailable');
    }
  });
  it('defines textual word mapping, case handling and all-zero/malformed policy', () => {
    for (const fixture of golden.invalidSeeds)
      expect(parseSeed(fixture.seed).ok).toBe(false);
    const parsed = parseSeed('0123456789ABCDEFFEDCBA9876543210');
    expect(parsed).toEqual({
      ok: true,
      value: [0x01234567, 0x89abcdef, 0xfedcba98, 0x76543210],
    });
    if (!parsed.ok) throw new Error('invalid seed');
    expect(seedHex(parsed.value)).toEqual({
      ok: true,
      value: '0123456789abcdeffedcba9876543210',
    });
    for (const bad of [
      '',
      '0'.repeat(32),
      'g'.repeat(32),
      'f'.repeat(31),
      'f'.repeat(33),
      ' f'.repeat(16),
      12,
      null,
    ])
      expect(parseSeed(bad).ok).toBe(false);
    for (const bad of [
      [0, 0, 0, 0],
      [1, -1, 0, 0],
      [1, 0x1_0000_0000, 0, 0],
      [1, NaN, 0, 0],
      Object.assign(Array(4), { 0: 1, 2: 2, 3: 3 }),
    ]) {
      expect(nextRandom(bad).ok).toBe(false);
      expect(seedHex(bad).ok).toBe(false);
    }
  });
  it('bounds inputs/work and does not mutate state', () => {
    const state = Object.freeze([1, 2, 3, 4]);
    for (const bound of [0, -1, 0x1_0000_0001, 1.5, NaN, '2'])
      expect(boundedChoice(state, bound).ok).toBe(false);
    for (const attempts of [0, -1, 129, 1.5, '2'])
      expect(boundedChoice(state, 3, attempts).ok).toBe(false);
    expect(boundedChoice(state, 1)).toMatchObject({
      ok: true,
      value: 0,
      draws: 1,
    });
    nextRandom(state);
    expect(state).toEqual([1, 2, 3, 4]);
  });
  it('exhaustively proves accepted residue counts for an analogous 8-bit sample space (32 bounds, 8192 words)', () => {
    for (let bound = 1; bound <= 32; bound += 1) {
      const limit = Math.floor(256 / bound) * bound;
      const counts = Array.from({ length: bound }, () => 0);
      for (let word = 0; word < 256; word += 1)
        if (word < limit) {
          const residue = word % bound;
          counts[residue] = (counts[residue] ?? 0) + 1;
        }
      expect(counts).toEqual(
        Array.from({ length: bound }, () => Math.floor(256 / bound)),
      );
    }
  });
});
