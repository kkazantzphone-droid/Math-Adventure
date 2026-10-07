import { describe, expect, it } from 'vitest';
import {
  syntheticLoopTaskSeed,
  SYNTHETIC_LOOP_SEED_VERSION,
} from '../../src/application/synthetic-loop';
import { createSliceFamily } from '../../src/application/slice-family';
import { SYNTHETIC_PROFILE_IDS } from '../../src/domain/adaptation/types';
import { PROOF_FAMILY_IDS } from '../../src/domain/families/proofs';
import { SLICE_FAMILY_IDS } from '../../src/domain/families/slice';

describe('versioned synthetic workflow seed selection', () => {
  it('matches independent bigint modular arithmetic at ordinal boundaries', () => {
    expect(SYNTHETIC_LOOP_SEED_VERSION).toBe('phase3c-session-seeds-v1');
    const modulus = 1n << 32n;
    const families = [...PROOF_FAMILY_IDS, ...SLICE_FAMILY_IDS];
    for (const [profileIndex, profile] of SYNTHETIC_PROFILE_IDS.entries())
      for (const [index, family] of families.entries())
        for (const ordinal of [0, 1, 2, 65535, 999999, 1000000]) {
          const mixed =
            ((BigInt(ordinal) * 0x9e3779b9n) % modulus) ^
            (profileIndex === 0 ? 0xa341316cn : 0xc8013ea4n) ^
            ((BigInt(index + 1) * 0xad90777dn) % modulus);
          const expected = [
            BigInt(ordinal),
            mixed,
            BigInt(index + 1),
            0x9e3779b9n,
          ]
            .map((word) => word.toString(16).padStart(8, '0'))
            .join('');
          expect(syntheticLoopTaskSeed(profile, family, ordinal)).toEqual({
            ok: true,
            value: expected,
          });
        }
  });
  it('reaches every bounded numeral/counting case in a short deterministic session', () => {
    for (const profile of SYNTHETIC_PROFILE_IDS)
      for (const family of ['number.numeral', 'number.counting'] as const) {
        const quantities = new Set<number>();
        for (let ordinal = 1; ordinal <= 64; ordinal++) {
          const seed = syntheticLoopTaskSeed(profile, family, ordinal);
          expect(seed.ok).toBe(true);
          if (!seed.ok) continue;
          const task = createSliceFamily(family, seed.value);
          expect(task.ok).toBe(true);
          if (!task.ok) continue;
          if (task.value.task.kind === 'numeralRecognition')
            quantities.add(Number(task.value.task.numeral.numerator));
          else if (task.value.task.kind === 'countItems')
            quantities.add(task.value.task.items.length);
        }
        expect([...quantities].sort()).toEqual([0, 1, 2, 3, 4, 5]);
      }
  });
  it.each([-1, 1000001, 1.5, NaN, Infinity])(
    'refuses an unsupported ordinal %s',
    (ordinal) => {
      expect(
        syntheticLoopTaskSeed('SYNTHETIC-PLAYER-1', 'number.numeral', ordinal),
      ).toEqual({ ok: false, error: { code: 'invalid_command' } });
    },
  );
});
