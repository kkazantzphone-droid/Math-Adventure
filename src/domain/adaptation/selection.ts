import { boundedChoice, parseSeed } from '../random/xoshiro';
import { advanceSyntheticClock, getConceptState } from './state';
import type { SyntheticSnapshot } from './types';
import { SYNTHETIC_PROFILE_IDS } from './types';
import { ADAPTATION_POLICY, SYNTHETIC_ENGINE_LIMITS } from './policy';
import { certifyEvidenceCatalog } from './catalog';
import type { SyntheticEvidenceCatalog } from './catalog';
import { canonicalize } from '../replay/canonical';

// Resource bound, not a curriculum or a learner-level limit.
export const SELECTION_CATALOG_LIMIT = 64;
export interface SelectionCandidate {
  readonly concept: string;
  readonly prerequisiteReady: boolean;
  readonly generationAvailable: boolean;
}
export type SelectionIntent =
  | { readonly kind: 'automatic' }
  | { readonly kind: 'childChoice' | 'parentChoice'; readonly concept: string }
  | { readonly kind: 'requestedHelp'; readonly concept: string }
  | { readonly kind: 'exploration' }
  | { readonly kind: 'menu' };
export interface SelectionMemory {
  readonly profileId: string;
  readonly policyVersion: string;
  readonly nextOfferOrdinal: number;
  readonly lastOffered: Readonly<Record<string, number>>;
  readonly sessionOrdinal: number;
  readonly supportOffered: boolean;
  readonly reviewOffered: boolean;
  readonly lastScoredConcept: string | null;
  readonly consecutiveScored: number;
}
export interface SelectionInput {
  readonly snapshot: SyntheticSnapshot;
  readonly evidenceCatalog: SyntheticEvidenceCatalog;
  readonly catalog: readonly SelectionCandidate[];
  readonly intent: SelectionIntent;
  readonly policyVersion: string;
  readonly coarseDay: number;
  readonly clockCertain: boolean;
  readonly sessionOrdinal: number;
  readonly seed: string;
  readonly memory: SelectionMemory;
}
export type RecommendationReason =
  | 'requestedByChild'
  | 'requestedByParent'
  | 'needsSupport'
  | 'reviewDue'
  | 'developingContinuation'
  | 'newReadyConcept'
  | 'familiarPractice'
  | 'explorationOffer'
  | 'insufficientEvidence'
  | 'clockUncertain'
  | 'unavailableGeneration'
  | 'yieldAfterThree'
  | 'invalidSelectionInput'
  | 'unsupportedPolicy'
  | 'menu';
export interface SyntheticRecommendation {
  readonly concept: string | null;
  readonly reasonCode: RecommendationReason;
  readonly evidenceReasons: readonly (
    'insufficientEvidence' | 'clockUncertain'
  )[];
  readonly policyVersion: string;
  readonly retainedCount: number;
  readonly independentCount: number;
  readonly revisit: boolean;
  readonly alternatives: readonly ['manualChoice', 'exploration', 'stop'];
  readonly memory: SelectionMemory;
  readonly snapshot: SyntheticSnapshot;
}

export function emptySelectionMemory(
  snapshot: SyntheticSnapshot,
): SelectionMemory {
  return {
    profileId: snapshot.profileId,
    policyVersion: snapshot.policyVersion,
    nextOfferOrdinal: 1,
    lastOffered: {},
    sessionOrdinal: 0,
    supportOffered: false,
    reviewOffered: false,
    lastScoredConcept: null,
    consecutiveScored: 0,
  };
}

// Call only for an eligible scored practice completion. Exposure/skip never call
// this function. Merely offering an activity is not a completed scored task.
export function recordSyntheticScoredTask(
  memory: SelectionMemory,
  concept: string,
): SelectionMemory {
  return {
    ...memory,
    lastOffered: { ...memory.lastOffered },
    lastScoredConcept: concept,
    consecutiveScored:
      memory.lastScoredConcept === concept
        ? Math.min(3, memory.consecutiveScored + 1)
        : 1,
  };
}

function identifier(id: string): boolean {
  return typeof id === 'string' && /^[a-z][a-z0-9.-]{0,95}$/.test(id);
}
function ordinal(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function recommendSynthetic(
  input: SelectionInput,
): SyntheticRecommendation {
  const { catalog, memory, intent } = input;
  let snapshot = input.snapshot;
  const make = (
    concept: string | null,
    reasonCode: RecommendationReason,
    nextMemory: SelectionMemory = memory,
  ): SyntheticRecommendation => {
    const state = concept === null ? null : getConceptState(snapshot, concept);
    const clockCertain =
      snapshot.clockCertain &&
      input.clockCertain &&
      (snapshot.lastTrustedDay === null ||
        input.coarseDay >= snapshot.lastTrustedDay);
    return {
      concept,
      reasonCode,
      evidenceReasons: [
        ...(state?.limitedEvidence ? ['insufficientEvidence' as const] : []),
        ...(!clockCertain ? ['clockUncertain' as const] : []),
      ],
      policyVersion: input.policyVersion,
      retainedCount: state?.observations.length ?? 0,
      independentCount:
        state?.observations.filter((o) => o.outcome === 'independentSuccess')
          .length ?? 0,
      revisit: reasonCode === 'reviewDue',
      alternatives: ['manualChoice', 'exploration', 'stop'],
      memory: { ...nextMemory, lastOffered: { ...nextMemory.lastOffered } },
      snapshot,
    };
  };
  if (
    input.policyVersion !== ADAPTATION_POLICY.version ||
    snapshot.policyVersion !== input.policyVersion ||
    memory.policyVersion !== input.policyVersion
  )
    return make(null, 'unsupportedPolicy');
  if (
    snapshot.synthetic !== true ||
    !SYNTHETIC_PROFILE_IDS.includes(snapshot.profileId) ||
    memory.profileId !== snapshot.profileId ||
    catalog.length > SELECTION_CATALOG_LIMIT ||
    new Set(catalog.map((c) => c.concept)).size !== catalog.length ||
    catalog.some(
      (c) =>
        !identifier(c.concept) ||
        typeof c.prerequisiteReady !== 'boolean' ||
        typeof c.generationAvailable !== 'boolean',
    ) ||
    !ordinal(input.coarseDay) ||
    input.coarseDay > SYNTHETIC_ENGINE_LIMITS.coarseDay ||
    !ordinal(input.sessionOrdinal) ||
    input.sessionOrdinal > SYNTHETIC_ENGINE_LIMITS.sessionOrdinal ||
    typeof input.clockCertain !== 'boolean' ||
    !ordinal(memory.sessionOrdinal) ||
    memory.sessionOrdinal > SYNTHETIC_ENGINE_LIMITS.sessionOrdinal ||
    typeof memory.supportOffered !== 'boolean' ||
    typeof memory.reviewOffered !== 'boolean' ||
    (memory.lastScoredConcept !== null &&
      !identifier(memory.lastScoredConcept)) ||
    input.sessionOrdinal < memory.sessionOrdinal ||
    input.sessionOrdinal < snapshot.lastSessionOrdinal ||
    !ordinal(memory.nextOfferOrdinal) ||
    memory.nextOfferOrdinal === 0 ||
    memory.nextOfferOrdinal === Number.MAX_SAFE_INTEGER ||
    Object.keys(memory.lastOffered).length > SELECTION_CATALOG_LIMIT ||
    Object.entries(memory.lastOffered).some(
      ([id, n]) =>
        !identifier(id) || !ordinal(n) || n >= memory.nextOfferOrdinal,
    ) ||
    !ordinal(memory.consecutiveScored) ||
    memory.consecutiveScored > 3
  )
    return make(null, 'invalidSelectionInput');
  if (
    !certifyEvidenceCatalog(input.evidenceCatalog, ADAPTATION_POLICY).ok ||
    catalog.some(
      (c) =>
        !input.evidenceCatalog.scopes.some(
          (scope) => scope.conceptId === c.concept,
        ),
    )
  )
    return make(null, 'invalidSelectionInput');
  const catalogSignature = canonicalize({
    ...input.evidenceCatalog,
    scopes: [...input.evidenceCatalog.scopes].sort((a, b) =>
      a.conceptId < b.conceptId ? -1 : a.conceptId > b.conceptId ? 1 : 0,
    ),
  });
  if (
    !catalogSignature.ok ||
    (snapshot.catalogSignature !== null &&
      snapshot.catalogSignature !== catalogSignature.value)
  )
    return make(null, 'invalidSelectionInput');
  const session =
    input.sessionOrdinal === memory.sessionOrdinal
      ? memory
      : {
          ...memory,
          sessionOrdinal: input.sessionOrdinal,
          supportOffered: false,
          reviewOffered: false,
        };
  snapshot = advanceSyntheticClock(
    snapshot,
    input.coarseDay,
    input.clockCertain,
    input.evidenceCatalog,
  );
  if (intent.kind === 'menu' || intent.kind === 'exploration')
    return make(null, intent.kind === 'menu' ? 'menu' : 'explorationOffer', {
      ...session,
      lastScoredConcept: null,
      consecutiveScored: 0,
    });
  const seed = parseSeed(input.seed);
  if (!seed.ok) return make(null, 'invalidSelectionInput', session);
  const available = catalog.filter((c) => c.generationAvailable);
  const offer = (
    candidate: SelectionCandidate,
    reason: RecommendationReason,
  ): SyntheticRecommendation => {
    // Prune absent catalog metadata; never store an unbounded offer log.
    const lastOffered = Object.fromEntries(
      catalog.map((c) => [c.concept, session.lastOffered[c.concept] ?? 0]),
    );
    lastOffered[candidate.concept] = session.nextOfferOrdinal;
    return make(candidate.concept, reason, {
      ...session,
      lastOffered,
      nextOfferOrdinal: session.nextOfferOrdinal + 1,
      supportOffered: session.supportOffered || reason === 'needsSupport',
      reviewOffered: session.reviewOffered || reason === 'reviewDue',
    });
  };
  if (intent.kind !== 'automatic') {
    const requestedConcept = intent.concept;
    const requested = available.find((c) => c.concept === requestedConcept);
    if (!requested) return make(null, 'unavailableGeneration', session);
    return offer(
      requested,
      intent.kind === 'childChoice'
        ? 'requestedByChild'
        : intent.kind === 'parentChoice'
          ? 'requestedByParent'
          : 'needsSupport',
    );
  }
  const certain =
    snapshot.clockCertain &&
    input.clockCertain &&
    (snapshot.lastTrustedDay === null ||
      input.coarseDay >= snapshot.lastTrustedDay);
  const eligible = available.filter(
    (c) =>
      c.prerequisiteReady ||
      getConceptState(snapshot, c.concept).attained !== 'Unseen',
  );
  const unblocked = eligible.filter(
    (c) =>
      c.concept !== session.lastScoredConcept || session.consecutiveScored < 3,
  );
  if (unblocked.length === 0) {
    const capped = eligible.length > 0;
    return make(
      null,
      capped
        ? 'yieldAfterThree'
        : available.length === 0
          ? 'unavailableGeneration'
          : 'insufficientEvidence',
      capped
        ? {
            ...session,
            lastScoredConcept: null,
            consecutiveScored: 0,
          }
        : session,
    );
  }
  const reasonFor = (candidate: SelectionCandidate): RecommendationReason => {
    const state = getConceptState(snapshot, candidate.concept);
    if (state.needsSupport && !session.supportOffered) return 'needsSupport';
    if (
      certain &&
      state.nextReviewDay !== null &&
      input.coarseDay >= state.nextReviewDay &&
      input.sessionOrdinal !== snapshot.lastSettledReviewSessionOrdinal &&
      !session.reviewOffered
    )
      return 'reviewDue';
    if (state.recentState === 'Developing') return 'developingContinuation';
    if (state.attained === 'Unseen') return 'newReadyConcept';
    return state.limitedEvidence ? 'insufficientEvidence' : 'familiarPractice';
  };
  const priority: readonly RecommendationReason[] = [
    'needsSupport',
    'reviewDue',
    'developingContinuation',
    'newReadyConcept',
    'familiarPractice',
    'insufficientEvidence',
  ];
  // Experimental correction: age wins across classes; priority breaks age ties.
  // Every continuously eligible item gets an offer within catalog cardinality N
  // automatic concept offers (fixed availability; explicit overrides excluded).
  const oldest = Math.min(
    ...unblocked.map((c) => session.lastOffered[c.concept] ?? 0),
  );
  const oldestCandidates = unblocked.filter(
    (c) => (session.lastOffered[c.concept] ?? 0) === oldest,
  );
  const bestPriority = Math.min(
    ...oldestCandidates.map((c) => priority.indexOf(reasonFor(c))),
  );
  const tied = oldestCandidates
    .filter((c) => priority.indexOf(reasonFor(c)) === bestPriority)
    .sort((a, b) =>
      a.concept < b.concept ? -1 : a.concept > b.concept ? 1 : 0,
    );
  const draw = boundedChoice(seed.value, tied.length);
  if (!draw.ok) return make(null, 'invalidSelectionInput', session);
  const selected = tied[draw.value];
  return selected
    ? offer(selected, reasonFor(selected))
    : make(null, 'menu', session);
}
