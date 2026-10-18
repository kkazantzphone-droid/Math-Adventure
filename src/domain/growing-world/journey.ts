import { dataArray, dataRecord, hasKeys } from '../core/data';
import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import type { SyntheticSnapshot } from '../adaptation/types';
import { CHAPTER_FAMILY_IDS, chapterEvidenceFromInput } from './content';
import type { ChapterFamilyId } from './content';

/** Invitation hypotheses for synthetic engineering only; never attainment. */
export const GROWING_JOURNEY_POLICY = Object.freeze({
  version: 'growing-world-invitations-v1',
  status: 'experimental' as const,
  educatorReview: 'required' as const,
  independentCases: 4,
  representations: 2,
  sessions: 2,
  additionBridgeCases: 3,
  eventLimit: 72,
});

export interface ChapterObservation {
  readonly schema: 'growing-world-observation-v1';
  readonly policyVersion: typeof GROWING_JOURNEY_POLICY.version;
  readonly id: string;
  readonly familyId: ChapterFamilyId;
  readonly concept: string;
  readonly representation: string;
  readonly fingerprint: string;
  readonly generatorVersion: string;
  readonly sessionOrdinal: number;
  readonly correct: boolean;
  readonly mathematicalHintTier: 0 | 1 | 2 | 3;
  readonly meaningfulAttempts: 1 | 2 | 3;
  readonly solutionExposed: boolean;
  readonly accessible: boolean;
}

export type ChapterOutcome =
  'independentSuccess' | 'supportedSuccess' | 'unsuccessful' | 'excluded';
export interface ChapterClassification {
  readonly observation: ChapterObservation;
  readonly outcome: ChapterOutcome;
  readonly reason:
    | 'independent'
    | 'mathematicalSupport'
    | 'unsuccessful'
    | 'inaccessibleScope'
    | 'solutionExposed'
    | 'independentConfirmation'
    | 'repeatedRelationship';
}
export interface ChapterReadiness {
  readonly familyId: ChapterFamilyId;
  readonly independentCases: number;
  readonly representations: number;
  readonly sessions: number;
  readonly supported: number;
  readonly unsuccessful: number;
  readonly readyForInvitation: boolean;
  readonly needsSupport: boolean;
  readonly limitedEvidence: true;
}
export interface ChapterInvitation {
  readonly familyId: ChapterFamilyId;
  readonly reason: 'support' | 'connectedReadiness' | 'chooseFreely';
  readonly connectedFrom: string | null;
}
export interface GrowingJourney {
  readonly policyVersion: typeof GROWING_JOURNEY_POLICY.version;
  readonly status: 'experimental';
  readonly educatorReview: 'required';
  readonly limitedEvidence: true;
  readonly assessmentCount: number;
  readonly remainingCapacity: number;
  readonly capacityReached: boolean;
  readonly currentEdge: boolean;
  readonly readiness: readonly ChapterReadiness[];
  readonly invitations: readonly ChapterInvitation[];
  readonly classifications: readonly ChapterClassification[];
}

const eventKeys = [
  'schema',
  'policyVersion',
  'id',
  'familyId',
  'concept',
  'representation',
  'fingerprint',
  'generatorVersion',
  'sessionOrdinal',
  'correct',
  'mathematicalHintTier',
  'meaningfulAttempts',
  'solutionExposed',
  'accessible',
] as const;

export function chapterObservationFromInput(
  input: unknown,
): ChapterObservation | undefined {
  const row = dataRecord(input, eventKeys.length);
  if (
    !row ||
    !hasKeys(row, eventKeys) ||
    row.schema !== 'growing-world-observation-v1' ||
    row.policyVersion !== GROWING_JOURNEY_POLICY.version ||
    typeof row.id !== 'string' ||
    !/^SYNTHETIC-[A-Za-z0-9._-]{1,80}$/.test(row.id) ||
    !CHAPTER_FAMILY_IDS.some((family) => family === row.familyId) ||
    typeof row.sessionOrdinal !== 'number' ||
    !Number.isSafeInteger(row.sessionOrdinal) ||
    row.sessionOrdinal < 1 ||
    row.sessionOrdinal > 1_000_000 ||
    ![0, 1, 2, 3].includes(row.mathematicalHintTier as number) ||
    ![1, 2, 3].includes(row.meaningfulAttempts as number) ||
    ['correct', 'solutionExposed', 'accessible'].some(
      (key) => typeof row[key] !== 'boolean',
    )
  )
    return undefined;
  const evidence = chapterEvidenceFromInput({
    familyId: row.familyId,
    concept: row.concept,
    representation: row.representation,
    fingerprint: row.fingerprint,
    generatorVersion: row.generatorVersion,
  });
  if (!evidence.ok) return undefined;
  return Object.freeze({ ...row }) as unknown as ChapterObservation;
}

/** One independent case per relationship. Bounded later-session confirmations
 * can supply missing representation/session coverage, never another case. */
export function classifyChapterObservation(
  input: ChapterObservation,
  prior: readonly ChapterClassification[],
): ChapterClassification {
  const make = (
    outcome: ChapterOutcome,
    reason: ChapterClassification['reason'],
  ) => Object.freeze({ observation: input, outcome, reason });
  if (!input.accessible) return make('excluded', 'inaccessibleScope');
  if (input.solutionExposed) return make('excluded', 'solutionExposed');
  const repeats = prior.filter(
    (item) =>
      item.observation.familyId === input.familyId &&
      item.observation.fingerprint === input.fingerprint,
  );
  if (
    repeats.some(
      (item) =>
        item.reason === 'independentConfirmation' &&
        item.observation.representation === input.representation,
    ) ||
    repeats.some(
      (item) =>
        item.observation.sessionOrdinal === input.sessionOrdinal &&
        (item.outcome !== 'excluded' ||
          item.reason === 'solutionExposed' ||
          item.reason === 'independentConfirmation'),
    )
  )
    return make('excluded', 'repeatedRelationship');
  if (!input.correct) return make('unsuccessful', 'unsuccessful');
  if (input.mathematicalHintTier > 0 || input.meaningfulAttempts > 1)
    return make('supportedSuccess', 'mathematicalSupport');
  if (repeats.some((item) => item.outcome === 'independentSuccess'))
    return make('excluded', 'independentConfirmation');
  return make('independentSuccess', 'independent');
}

/** Journal-derived engineering readiness. No mastery state is written/promoted. */
export function deriveGrowingJourney(
  rawEvents: readonly ChapterObservation[],
  legacy: SyntheticSnapshot | null = null,
): DomainResult<GrowingJourney> {
  if (!dataArray(rawEvents, GROWING_JOURNEY_POLICY.eventLimit))
    return failure('invalid_input');
  const classifications: ChapterClassification[] = [];
  const ids = new Set<string>();
  let session = 0;
  for (const raw of rawEvents) {
    const event = chapterObservationFromInput(raw);
    if (!event || ids.has(event.id) || event.sessionOrdinal < session)
      return failure('invalid_input');
    ids.add(event.id);
    session = event.sessionOrdinal;
    classifications.push(classifyChapterObservation(event, classifications));
  }
  const readiness = CHAPTER_FAMILY_IDS.map((familyId): ChapterReadiness => {
    const items = classifications.filter(
      (item) => item.observation.familyId === familyId,
    );
    const independent = items.filter(
      (item) => item.outcome === 'independentSuccess',
    );
    const cases = new Set(
      independent.map((item) => item.observation.fingerprint),
    ).size;
    const coverage = items.filter(
      (item) =>
        item.outcome === 'independentSuccess' ||
        item.reason === 'independentConfirmation',
    );
    const representations = new Set(
      coverage.map((item) => item.observation.representation),
    ).size;
    const sessions = new Set(
      coverage.map((item) => item.observation.sessionOrdinal),
    ).size;
    const recent = items
      .filter(
        (item) =>
          item.outcome !== 'excluded' ||
          item.reason === 'independentConfirmation',
      )
      .slice(-2);
    return Object.freeze({
      familyId,
      independentCases: cases,
      representations,
      sessions,
      supported: items.filter((item) => item.outcome === 'supportedSuccess')
        .length,
      unsuccessful: items.filter((item) => item.outcome === 'unsuccessful')
        .length,
      readyForInvitation:
        cases >= GROWING_JOURNEY_POLICY.independentCases &&
        representations >= GROWING_JOURNEY_POLICY.representations &&
        sessions >= GROWING_JOURNEY_POLICY.sessions,
      needsSupport:
        recent.length === 2 &&
        recent.every(
          (item) =>
            item.outcome !== 'independentSuccess' &&
            item.reason !== 'independentConfirmation',
        ),
      limitedEvidence: true,
    });
  });
  const old = (concept: string) => legacy?.concepts[concept];
  const legacyIndependent = (concept: string) =>
    new Set(
      old(concept)
        ?.observations.filter((item) => item.outcome === 'independentSuccess')
        .map((item) => item.input.evidenceFingerprint) ?? [],
    ).size;
  const ready = (family: ChapterFamilyId) =>
    readiness.find((item) => item.familyId === family)?.readyForInvitation ===
    true;
  const predecessor: Readonly<Record<ChapterFamilyId, string | null>> = {
    'number.make-ten':
      legacyIndependent('addition.part-whole') >=
      GROWING_JOURNEY_POLICY.additionBridgeCases
        ? 'addition.part-whole'
        : null,
    'number.part-whole': ready('number.make-ten') ? 'number.make-ten' : null,
    'groups.equal': ready('number.part-whole')
      ? 'number.part-whole'
      : ready('number.make-ten')
        ? 'number.make-ten'
        : null,
    'groups.missing': ready('groups.equal') ? 'groups.equal' : null,
    'measurement.array-area':
      legacyIndependent('measurement.length.unit-iteration') >= 3
        ? 'measurement.length.unit-iteration'
        : ready('groups.equal')
          ? 'groups.equal'
          : null,
    'powers.square-side': ready('measurement.array-area')
      ? 'measurement.array-area'
      : null,
  };
  const invitations = readiness.map((item): ChapterInvitation => {
    const support =
      item.needsSupport ||
      (item.familyId === 'number.make-ten' &&
        old('addition.part-whole')?.needsSupport === true) ||
      (item.familyId === 'measurement.array-area' &&
        old('measurement.length.unit-iteration')?.needsSupport === true);
    return Object.freeze({
      familyId: item.familyId,
      reason: support
        ? 'support'
        : predecessor[item.familyId]
          ? 'connectedReadiness'
          : 'chooseFreely',
      connectedFrom: predecessor[item.familyId],
    });
  });
  return success(
    Object.freeze({
      policyVersion: GROWING_JOURNEY_POLICY.version,
      status: 'experimental',
      educatorReview: 'required',
      limitedEvidence: true,
      assessmentCount: rawEvents.length,
      remainingCapacity: GROWING_JOURNEY_POLICY.eventLimit - rawEvents.length,
      capacityReached: rawEvents.length === GROWING_JOURNEY_POLICY.eventLimit,
      currentEdge: readiness.every((item) => item.readyForInvitation),
      readiness: Object.freeze(readiness),
      invitations: Object.freeze(invitations),
      classifications: Object.freeze(classifications),
    }),
  );
}
