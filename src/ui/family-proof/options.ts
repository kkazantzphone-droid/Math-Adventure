import { PROOF_FAMILY_IDS } from '../../application/family-proof';
import type { ProofFamilyId } from '../../application/family-proof';

export const DEFAULT_PROOF_SEED = '0123456789abcdeffedcba9876543210';

export interface FamilyProofOptions {
  readonly enabled: boolean;
  readonly familyId: ProofFamilyId;
  readonly seedHex: string;
  readonly textScale?: 200;
}

/** Deliberate developer path; no browser entropy, persistence or locale authority. */
export function parseFamilyProofOptions(search: string): FamilyProofOptions {
  const parameters = new URLSearchParams(search);
  const flags = parameters.getAll('familyProof');
  const families = parameters.getAll('family');
  const seeds = parameters.getAll('seed');
  const textScales = parameters.getAll('textScale');
  const enabled = flags.length === 1 && flags[0] === '1';
  return {
    enabled,
    familyId:
      families.length === 1
        ? (PROOF_FAMILY_IDS.find((id) => id === families[0]) ??
          PROOF_FAMILY_IDS[0])
        : PROOF_FAMILY_IDS[0],
    // Invalid explicit seeds are rejected by the domain instead of silently replaced.
    seedHex:
      seeds.length === 0
        ? DEFAULT_PROOF_SEED
        : seeds.length === 1
          ? (seeds[0] ?? '')
          : '',
    // Developer QA text enlargement, distinct from native browser zoom.
    ...(enabled && textScales.length === 1 && textScales[0] === '200'
      ? { textScale: 200 as const }
      : {}),
  };
}
