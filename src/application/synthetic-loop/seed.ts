import { PROOF_FAMILY_IDS } from '../../domain/families/proofs';
import { SLICE_FAMILY_IDS } from '../../domain/families/slice';
import { CHAPTER_FAMILY_IDS } from '../../domain/growing-world/content';
import { SYNTHETIC_PROFILE_IDS } from '../../domain/adaptation/types';
import type { SyntheticProfileId } from '../../domain/adaptation/types';
import { applicationFailure, applicationSuccess } from '../core/result';
import type { ApplicationResult } from '../core/result';
import type { LoopFamilyId } from './types';

/** Frozen first workflow seed selection. Its later words stay nearly constant,
 * so every generator's second draw repeated its first; kept only as history. */
export const SYNTHETIC_LOOP_SEED_VERSION_V1 = 'phase3c-session-seeds-v1';
export const SYNTHETIC_LOOP_SEED_VERSION = 'phase3c-session-seeds-v2';
/** Seed selections whose saved worlds this build reads; only the current one
 * chooses new tasks. Journals keep the seeds they were recorded with. */
export const SYNTHETIC_LOOP_SEED_VERSIONS = Object.freeze([
  SYNTHETIC_LOOP_SEED_VERSION_V1,
  SYNTHETIC_LOOP_SEED_VERSION,
] as const);

const ORDINAL_LIMIT = 1_000_000;

function familyIndex(
  profile: SyntheticProfileId,
  family: LoopFamilyId,
  ordinal: number,
): number | undefined {
  const index = [
    ...PROOF_FAMILY_IDS,
    ...SLICE_FAMILY_IDS,
    ...CHAPTER_FAMILY_IDS,
  ].indexOf(family);
  return SYNTHETIC_PROFILE_IDS.includes(profile) &&
    index >= 0 &&
    Number.isSafeInteger(ordinal) &&
    ordinal >= 0 &&
    ordinal <= ORDINAL_LIMIT
    ? index
    : undefined;
}

function seedText(words: readonly number[]): string {
  return words.map((word) => word.toString(16).padStart(8, '0')).join('');
}

/** Historical v1 selection. Math.imul and unsigned coercion specify exact
 * arithmetic modulo 2^32. Only the first draw varied with the ordinal. */
export function syntheticLoopTaskSeedV1(
  profile: SyntheticProfileId,
  family: LoopFamilyId,
  ordinal: number,
): ApplicationResult<string> {
  const index = familyIndex(profile, family, ordinal);
  if (index === undefined) return applicationFailure('invalid_command');
  const profileWord =
    profile === SYNTHETIC_PROFILE_IDS[0] ? 0xa341316c : 0xc8013ea4;
  return applicationSuccess(
    seedText([
      ordinal >>> 0,
      (Math.imul(ordinal, 0x9e3779b9) ^
        profileWord ^
        Math.imul(index + 1, 0xad90777d)) >>>
        0,
      index + 1,
      0x9e3779b9,
    ]),
  );
}

/** MurmurHash3 finalizer: a bijection on 32-bit words with full avalanche. */
function mix32(input: number): number {
  let value = input >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return value >>> 0;
}

/** Deterministic workflow seed selection, separate from immutable RNG/generators.
 * The key packs ordinal (20 bits), family (4 bits) and badge (1 bit) without
 * collision. Each state word mixes the key plus a distinct multiple of
 * 0x9e3779b9, so every word avalanches, the four words of one state differ
 * and the state is never all zero.
 */
export function syntheticLoopTaskSeed(
  profile: SyntheticProfileId,
  family: LoopFamilyId,
  ordinal: number,
): ApplicationResult<string> {
  const index = familyIndex(profile, family, ordinal);
  if (index === undefined || index + 1 >= 16)
    return applicationFailure('invalid_command');
  const key =
    (ordinal |
      ((index + 1) << 20) |
      (profile === SYNTHETIC_PROFILE_IDS[0] ? 0 : 1 << 24)) >>>
    0;
  return applicationSuccess(
    seedText(
      [1, 2, 3, 4].map((lane) => mix32(key + Math.imul(lane, 0x9e3779b9))),
    ),
  );
}
