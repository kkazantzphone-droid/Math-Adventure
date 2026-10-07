import { PROOF_FAMILY_IDS } from '../../domain/families/proofs';
import { SLICE_FAMILY_IDS } from '../../domain/families/slice';
import { SYNTHETIC_PROFILE_IDS } from '../../domain/adaptation/types';
import type { SyntheticProfileId } from '../../domain/adaptation/types';
import { applicationFailure, applicationSuccess } from '../core/result';
import type { ApplicationResult } from '../core/result';
import type { LoopFamilyId } from './types';

export const SYNTHETIC_LOOP_SEED_VERSION = 'phase3c-session-seeds-v1';

/** Deterministic workflow seed selection, separate from immutable RNG/generators.
 * Math.imul and unsigned coercion specify exact arithmetic modulo 2^32. Ordinal
 * reaches the xoshiro output word, so first-draw tasks vary between examples.
 */
export function syntheticLoopTaskSeed(
  profile: SyntheticProfileId,
  family: LoopFamilyId,
  ordinal: number,
): ApplicationResult<string> {
  const index = [...PROOF_FAMILY_IDS, ...SLICE_FAMILY_IDS].indexOf(family);
  if (
    !SYNTHETIC_PROFILE_IDS.includes(profile) ||
    index < 0 ||
    !Number.isSafeInteger(ordinal) ||
    ordinal < 0 ||
    ordinal > 1_000_000
  )
    return applicationFailure('invalid_command');
  const profileWord =
    profile === SYNTHETIC_PROFILE_IDS[0] ? 0xa341316c : 0xc8013ea4;
  const words = [
    ordinal >>> 0,
    (Math.imul(ordinal, 0x9e3779b9) ^
      profileWord ^
      Math.imul(index + 1, 0xad90777d)) >>>
      0,
    index + 1,
    0x9e3779b9,
  ];
  return applicationSuccess(
    words.map((word) => word.toString(16).padStart(8, '0')).join(''),
  );
}
