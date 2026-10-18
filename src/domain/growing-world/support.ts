import { dataArray, dataRecord, hasKeys } from '../core/data';
import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import { createPhase2EvidenceCatalog } from '../adaptation/catalog';
import { proofEvidence } from '../families/proof-evidence';
import { PROOF_FAMILY_IDS } from '../families/proofs';
import type { ProofFamilyId } from '../families/proofs';
import { replayFromDto } from '../replay/descriptor';
import {
  CHAPTER_FAMILY_IDS,
  CHAPTER_GENERATOR_IDS,
  chapterEvidence,
  chapterEvidenceFromInput,
  isChapterFamilyId,
} from './content';
import type { ChapterFamilyId } from './content';

/** Current-session mathematical support context, never assessment evidence.
 * The finite bound includes all chapter and original assessed semantic cases. */
export const CHAPTER_SUPPORT_LIMIT = 256;
export type SupportFamilyId = ChapterFamilyId | ProofFamilyId;
export type MathematicalHintTier = 0 | 1 | 2 | 3;
export interface ChapterSupport {
  readonly familyId: SupportFamilyId;
  readonly fingerprint: string;
  readonly maxHintTier: 1 | 2 | 3;
}

// This new context reader reuses the frozen catalog without changing old replay.
const historical = createPhase2EvidenceCatalog([
  {
    familyId: 'number.addition',
    maximum: 5,
    coverage: 'singleRepresentationCandidate',
  },
  {
    familyId: 'geometry.quadrilateral',
    maximum: 3,
    coverage: 'singleRepresentationCandidate',
  },
  {
    familyId: 'measurement.unit-length',
    maximum: 8,
    coverage: 'singleRepresentationCandidate',
  },
]);
if (!historical.ok) throw new Error('Synthetic support catalog invalid');
const historicalCases = historical.value.scopes.flatMap((scope) => scope.cases);

function knownCase(familyId: SupportFamilyId, fingerprint: string): boolean {
  if (!isChapterFamilyId(familyId))
    return historicalCases.some(
      (entry) =>
        entry.familyId === familyId && entry.fingerprint === fingerprint,
    );
  return chapterEvidenceFromInput({
    familyId,
    concept: `growth.${familyId}`,
    fingerprint,
    representation: `representation.growth.${familyId}.concrete`,
    generatorVersion:
      CHAPTER_GENERATOR_IDS[CHAPTER_FAMILY_IDS.indexOf(familyId)],
  }).ok;
}

/** Decode only exact bounded known-scope entries; free-form fingerprints are not
 * an extensibility path. Seeds and representations cannot erase semantic help. */
export function chapterSupportFromInput(
  input: unknown,
): DomainResult<readonly ChapterSupport[]> {
  const rows = dataArray(input, CHAPTER_SUPPORT_LIMIT);
  if (!rows) return failure('invalid_input');
  const support: ChapterSupport[] = [];
  const seen = new Set<string>();
  for (const raw of rows) {
    const row = dataRecord(raw, 3);
    if (
      !row ||
      !hasKeys(row, ['familyId', 'fingerprint', 'maxHintTier']) ||
      ![...CHAPTER_FAMILY_IDS, ...PROOF_FAMILY_IDS].some(
        (id) => id === row.familyId,
      ) ||
      typeof row.fingerprint !== 'string' ||
      (row.maxHintTier !== 1 && row.maxHintTier !== 2 && row.maxHintTier !== 3)
    )
      return failure('invalid_input');
    const familyId = row.familyId as SupportFamilyId;
    const key = `${familyId}|${row.fingerprint}`;
    if (seen.has(key) || !knownCase(familyId, row.fingerprint))
      return failure('invalid_input');
    seen.add(key);
    support.push(
      Object.freeze({
        familyId,
        fingerprint: row.fingerprint,
        maxHintTier: row.maxHintTier,
      }),
    );
  }
  return success(Object.freeze(support));
}

/** Regeneration, rather than caller-supplied identity, selects support context. */
export function chapterSupportCase(replay: unknown): DomainResult<{
  readonly familyId: SupportFamilyId;
  readonly fingerprint: string;
}> {
  const parsed = replayFromDto(replay);
  if (!parsed.ok) return parsed;
  const familyId = parsed.value.familyId;
  const proofFamily = PROOF_FAMILY_IDS.find((family) => family === familyId);
  if (!isChapterFamilyId(familyId) && !proofFamily)
    return failure('unsupported_domain');
  const evidence = proofFamily
    ? proofEvidence(parsed.value)
    : chapterEvidence(parsed.value);
  if (!evidence.ok) return evidence;
  const supportedFamily = proofFamily ?? (familyId as ChapterFamilyId);
  if (!knownCase(supportedFamily, evidence.value.fingerprint))
    return failure('invalid_input');
  return success(
    Object.freeze({
      familyId: supportedFamily,
      fingerprint: evidence.value.fingerprint,
    }),
  );
}

export function chapterSupportTier(
  support: readonly ChapterSupport[],
  replay: unknown,
): MathematicalHintTier {
  const key = chapterSupportCase(replay);
  return key.ok
    ? (support.find(
        (entry) =>
          entry.familyId === key.value.familyId &&
          entry.fingerprint === key.value.fingerprint,
      )?.maxHintTier ?? 0)
    : 0;
}

export function rememberChapterSupport(
  input: unknown,
  replay: unknown,
  tier: unknown,
): DomainResult<readonly ChapterSupport[]> {
  if (tier !== 1 && tier !== 2 && tier !== 3) return failure('invalid_input');
  const decoded = chapterSupportFromInput(input);
  if (!decoded.ok) return decoded;
  const key = chapterSupportCase(replay);
  if (!key.ok) return key;
  const previous = decoded.value.find(
    (entry) =>
      entry.familyId === key.value.familyId &&
      entry.fingerprint === key.value.fingerprint,
  );
  if (previous && previous.maxHintTier >= tier) return decoded;
  const support = decoded.value.filter((entry) => entry !== previous);
  support.push(Object.freeze({ ...key.value, maxHintTier: tier }));
  return chapterSupportFromInput(support);
}
