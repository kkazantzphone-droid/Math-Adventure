// SYNTHETIC DEVELOPER REVIEW ONLY. No production adaptation, persistence,
// educational validation or accepted policy is provided by this model.
import { boundedChoice, parseSeed } from '../../src/domain/random/xoshiro';

export const REVIEW_POLICY = Object.freeze({
  version: 'phase3-readiness-simulation-v2',
  status: 'PROPOSED' as const,
  developingWindow: 5,
  developingIndependent: 3,
  secureWindow: 10,
  secureIndependent: 8,
  perConceptLimit: 10,
  learnerLimit: 500,
  ageLimitDays: 60,
  retrievalGapDays: 2,
  fingerprintLimit: 2,
  supportWindow: 5,
  supportNonIndependent: 3,
  supportRecoveryIndependent: 3,
  consecutiveTaskLimit: 3,
});

export type EvidenceOutcome =
  'independentSuccess' | 'supportedSuccess' | 'unsuccessful' | 'excluded';
export type AttainedState = 'Unseen' | 'Emerging' | 'Developing' | 'Secure';
export type ReviewMode =
  'practice' | 'diagnostic' | 'exploration' | 'numberLab';

export interface SyntheticCompletion {
  readonly synthetic: true;
  readonly id: string;
  readonly concept: string;
  readonly representation: string;
  readonly domainViews: readonly string[];
  readonly taskFingerprint: string;
  readonly evidenceFingerprint: string;
  readonly day: number;
  readonly session: number;
  readonly mode: ReviewMode;
  readonly completion:
    'completed' | 'skipped' | 'interrupted' | 'adapterFailed' | 'abandoned';
  readonly validAccessibleTask: boolean;
  readonly correct: boolean;
  readonly meaningfulAttempts: number;
  readonly mathematicalHintTier: number;
  readonly solutionExposed: boolean;
  readonly accessibilitySupport: readonly string[];
  readonly variationCase: boolean;
  readonly revisit: boolean;
  // Deliberately present only to test that presentation/context is neutral.
  readonly locale: string;
  readonly cosmetic: string;
}

export interface FrozenObservation {
  readonly completion: SyntheticCompletion;
  readonly outcome: EvidenceOutcome;
  readonly reason:
    | 'independent'
    | 'supported'
    | 'unsuccessful'
    | 'nonPractice'
    | 'notCompleted'
    | 'inaccessible'
    | 'solutionExposed'
    | 'repetition';
  readonly ordinal: number;
  readonly clockCertain: boolean;
}

export type CoverageProposal =
  | { readonly kind: 'default'; readonly representations: readonly string[] }
  | {
      readonly kind: 'singleFamilyProposal';
      readonly representation: string;
      readonly minimumVariationCases: number;
      readonly educatorReview: 'REQUIRED';
    };

export interface ConceptReviewState {
  readonly attained: AttainedState;
  readonly observations: readonly FrozenObservation[];
  readonly needsSupport: boolean;
  readonly supportActivatedAfter: number;
  readonly lastCheckpointOrdinal: number;
  readonly reviewStage: 0 | 1 | 2 | 3 | null;
  readonly nextReviewDay: number | null;
  readonly reviewDue: boolean;
  readonly limitedEvidence: boolean;
}

export interface SyntheticReviewSnapshot {
  readonly synthetic: true;
  readonly profileId: string;
  readonly concepts: Readonly<Record<string, ConceptReviewState>>;
  // In-memory review audit permits frozen-exclusion assertions. It is not a
  // proposed persistent learner history or receipt/pruning implementation.
  readonly audit: readonly FrozenObservation[];
  readonly diagnostics: readonly string[];
  readonly clockCertain: boolean;
  readonly lastTrustedDay: number | null;
}

function emptyConcept(): ConceptReviewState {
  return {
    attained: 'Unseen',
    observations: [],
    needsSupport: false,
    supportActivatedAfter: 0,
    lastCheckpointOrdinal: 0,
    reviewStage: null,
    nextReviewDay: null,
    reviewDue: false,
    limitedEvidence: true,
  };
}

export function emptyReview(
  profileId = 'SYNTHETIC-REVIEW-PLAYER',
): SyntheticReviewSnapshot {
  if (!profileId.startsWith('SYNTHETIC-'))
    throw new Error('Synthetic profile required');
  return {
    synthetic: true,
    profileId,
    concepts: {},
    audit: [],
    diagnostics: [],
    clockCertain: true,
    lastTrustedDay: null,
  };
}

export function conceptReview(
  snapshot: SyntheticReviewSnapshot,
  concept: string,
): ConceptReviewState {
  return snapshot.concepts[concept] ?? emptyConcept();
}

export function representationEvidence(
  snapshot: SyntheticReviewSnapshot,
  concept: string,
  representation: string,
): {
  readonly independent: number;
  readonly supported: number;
  readonly unsuccessful: number;
  readonly retained: number;
} {
  const observations = conceptReview(snapshot, concept).observations.filter(
    (item) => item.completion.representation === representation,
  );
  return {
    independent: observations.filter(
      (item) => item.outcome === 'independentSuccess',
    ).length,
    supported: observations.filter(
      (item) => item.outcome === 'supportedSuccess',
    ).length,
    unsuccessful: observations.filter((item) => item.outcome === 'unsuccessful')
      .length,
    retained: observations.length,
  };
}

function classified(
  completion: SyntheticCompletion,
  before: readonly FrozenObservation[],
  ordinal: number,
  clockCertain = true,
): FrozenObservation {
  const result = (
    outcome: EvidenceOutcome,
    reason: FrozenObservation['reason'],
  ): FrozenObservation => ({
    completion: structuredClone(completion),
    outcome,
    reason,
    ordinal,
    clockCertain,
  });
  if (completion.mode !== 'practice') return result('excluded', 'nonPractice');
  if (completion.completion !== 'completed')
    return result('excluded', 'notCompleted');
  if (!completion.validAccessibleTask)
    return result('excluded', 'inaccessible');
  if (completion.solutionExposed) return result('excluded', 'solutionExposed');
  const repeats = before.filter(
    (item) =>
      item.completion.evidenceFingerprint === completion.evidenceFingerprint,
  );
  const last = repeats.at(-1);
  if (
    repeats.length >= REVIEW_POLICY.fingerprintLimit ||
    (last &&
      (!clockCertain ||
        !last.clockCertain ||
        last.completion.session === completion.session ||
        completion.day - last.completion.day < REVIEW_POLICY.retrievalGapDays))
  )
    return result('excluded', 'repetition');
  if (!completion.correct) return result('unsuccessful', 'unsuccessful');
  if (
    completion.meaningfulAttempts !== 1 ||
    completion.mathematicalHintTier > 0
  )
    return result('supportedSuccess', 'supported');
  return result('independentSuccess', 'independent');
}

function independent(
  items: readonly FrozenObservation[],
): readonly FrozenObservation[] {
  return items.filter((item) => item.outcome === 'independentSuccess');
}

function sessions(items: readonly FrozenObservation[]): number {
  return new Set(items.map((item) => item.completion.session)).size;
}

function diversity(items: readonly FrozenObservation[]): number {
  return new Set(items.map((item) => item.completion.evidenceFingerprint)).size;
}

function variationCases(items: readonly FrozenObservation[]): number {
  return diversity(items.filter((item) => item.completion.variationCase));
}

function hasCoverage(
  items: readonly FrozenObservation[],
  coverage: CoverageProposal,
): boolean {
  const successes = independent(items);
  if (coverage.kind === 'singleFamilyProposal')
    return (
      successes.filter(
        (item) => item.completion.representation === coverage.representation,
      ).length >= 2 &&
      variationCases(successes) >= coverage.minimumVariationCases
    );
  return (
    new Set(coverage.representations).size >= 2 &&
    coverage.representations.every(
      (representation) =>
        successes.filter(
          (item) => item.completion.representation === representation,
        ).length >= 2,
    )
  );
}

function attained(
  before: AttainedState,
  items: readonly FrozenObservation[],
  coverage: CoverageProposal,
): AttainedState {
  // Attainment is monotonic; sparse recent evidence affects flags instead.
  if (before === 'Secure') return before;
  const successes = independent(items);
  if (
    items.length === REVIEW_POLICY.secureWindow &&
    successes.length >= REVIEW_POLICY.secureIndependent &&
    sessions(successes) >= 2 &&
    variationCases(successes) >= 2 &&
    hasCoverage(items, coverage)
  )
    return 'Secure';
  const developing = items.slice(-REVIEW_POLICY.developingWindow);
  if (
    before === 'Developing' ||
    (developing.length === REVIEW_POLICY.developingWindow &&
      independent(developing).length >= REVIEW_POLICY.developingIndependent &&
      diversity(developing) >= 2)
  )
    return 'Developing';
  return items.length > 0 || before === 'Emerging' ? 'Emerging' : 'Unseen';
}

export function retainReview(
  snapshot: SyntheticReviewSnapshot,
  day: number,
  clockCertain = true,
): SyntheticReviewSnapshot {
  const certain =
    snapshot.clockCertain &&
    clockCertain &&
    (snapshot.lastTrustedDay === null || day >= snapshot.lastTrustedDay);
  const all = Object.values(snapshot.concepts)
    .flatMap((state) => state.observations)
    .filter(
      (item) =>
        !certain || day - item.completion.day <= REVIEW_POLICY.ageLimitDays,
    )
    .sort((a, b) => a.ordinal - b.ordinal)
    .slice(-REVIEW_POLICY.learnerLimit);
  const retainedOrdinals = new Set(all.map((item) => item.ordinal));
  return {
    ...snapshot,
    clockCertain: certain,
    lastTrustedDay: certain ? day : snapshot.lastTrustedDay,
    concepts: Object.fromEntries(
      Object.entries(snapshot.concepts).map(([id, state]) => {
        const observations = state.observations
          .filter((item) => retainedOrdinals.has(item.ordinal))
          .slice(-REVIEW_POLICY.perConceptLimit);
        return [
          id,
          {
            ...state,
            observations,
            limitedEvidence:
              !certain ||
              state.limitedEvidence ||
              observations.length < REVIEW_POLICY.secureWindow,
            reviewDue: certain
              ? state.nextReviewDay !== null && day >= state.nextReviewDay
              : state.reviewDue,
          },
        ];
      }),
    ),
  };
}

// Explicit review-only parent resolution; normal commands cannot infer this.
export function resolveReviewClock(
  snapshot: SyntheticReviewSnapshot,
  day: number,
): SyntheticReviewSnapshot {
  return retainReview(
    { ...snapshot, clockCertain: true, lastTrustedDay: day },
    day,
  );
}

export function completeReview(
  snapshot: SyntheticReviewSnapshot,
  completion: SyntheticCompletion,
  coverage: CoverageProposal,
  clockCertain = true,
): SyntheticReviewSnapshot {
  if (completion.synthetic !== true)
    throw new Error('Synthetic completion required');
  const previous = snapshot.audit.find(
    (item) => item.completion.id === completion.id,
  );
  if (previous) {
    if (JSON.stringify(previous.completion) !== JSON.stringify(completion))
      throw new Error('Conflicting completion retry');
    return snapshot;
  }
  if (completion.mode === 'numberLab' || completion.mode === 'exploration') {
    const observation = classified(completion, [], snapshot.audit.length + 1);
    return { ...snapshot, audit: [...snapshot.audit, observation] };
  }
  const retained =
    completion.mode === 'diagnostic'
      ? snapshot
      : retainReview(snapshot, completion.day, clockCertain);
  const before = conceptReview(retained, completion.concept);
  const observation = classified(
    completion,
    before.observations,
    snapshot.audit.length + 1,
    retained.clockCertain,
  );
  const audit = [...snapshot.audit, observation];
  if (completion.mode === 'diagnostic') {
    // Proposal: a valid independent diagnostic is readiness for this observed
    // scope only. It never silently becomes a normal-practice mastery window.
    const ready =
      completion.completion === 'completed' &&
      completion.validAccessibleTask &&
      completion.correct &&
      completion.meaningfulAttempts === 1 &&
      completion.mathematicalHintTier === 0 &&
      !completion.solutionExposed;
    return {
      ...retained,
      audit,
      diagnostics: ready
        ? [
            ...new Set([
              ...retained.diagnostics,
              `${completion.concept}/${completion.representation}`,
            ]),
          ]
        : retained.diagnostics,
    };
  }
  if (observation.outcome === 'excluded') return { ...retained, audit };
  const observations = [...before.observations, observation].slice(
    -REVIEW_POLICY.perConceptLimit,
  );
  return retainReview(
    {
      ...retained,
      audit,
      concepts: {
        ...retained.concepts,
        [completion.concept]: {
          ...before,
          observations,
          attained: attained(before.attained, observations, coverage),
          limitedEvidence:
            observations.length < REVIEW_POLICY.secureWindow ||
            !hasCoverage(observations, coverage),
        },
      },
    },
    completion.day,
  );
}

export function sessionCheckpoint(
  snapshot: SyntheticReviewSnapshot,
): SyntheticReviewSnapshot {
  return {
    ...snapshot,
    concepts: Object.fromEntries(
      Object.entries(snapshot.concepts).map(([id, state]) => {
        const latestOrdinal = state.observations.at(-1)?.ordinal ?? 0;
        if (latestOrdinal === state.lastCheckpointOrdinal) return [id, state];
        const recent = state.observations.slice(-REVIEW_POLICY.supportWindow);
        const nonIndependent = recent.filter(
          (item) => item.outcome !== 'independentSuccess',
        );
        const recovery = independent(state.observations).filter(
          (item) =>
            item.ordinal > state.supportActivatedAfter &&
            item.completion.revisit,
        );
        if (state.needsSupport) {
          const clear =
            recovery.length >= REVIEW_POLICY.supportRecoveryIndependent &&
            diversity(recovery) >= 3 &&
            sessions(recovery) >= 2;
          return [
            id,
            {
              ...state,
              needsSupport: !clear,
              lastCheckpointOrdinal: latestOrdinal,
            },
          ];
        }
        const activate =
          recent.length === REVIEW_POLICY.supportWindow &&
          nonIndependent.length >= REVIEW_POLICY.supportNonIndependent &&
          sessions(nonIndependent) >= 2;
        return [
          id,
          {
            ...state,
            needsSupport: activate,
            lastCheckpointOrdinal: latestOrdinal,
            supportActivatedAfter: activate
              ? snapshot.audit.length
              : state.supportActivatedAfter,
          },
        ];
      }),
    ),
  };
}

export function confirmReadiness(
  snapshot: SyntheticReviewSnapshot,
  concept: string,
  observationId: string,
): SyntheticReviewSnapshot {
  const state = conceptReview(snapshot, concept);
  const confirmation = state.observations.find(
    (item) =>
      item.completion.id === observationId &&
      item.outcome === 'independentSuccess',
  );
  if (
    !snapshot.clockCertain ||
    !confirmation ||
    !confirmation.clockCertain ||
    state.reviewStage !== null
  )
    return snapshot;
  return {
    ...snapshot,
    concepts: {
      ...snapshot.concepts,
      [concept]: {
        ...state,
        reviewStage: 0,
        nextReviewDay: confirmation.completion.day + 2,
        reviewDue: false,
      },
    },
  };
}

export function settleDueRevisit(
  snapshot: SyntheticReviewSnapshot,
  concept: string,
  observationId: string,
  clockCertain = true,
): SyntheticReviewSnapshot {
  const state = conceptReview(snapshot, concept);
  const observation = state.observations.find(
    (item) => item.completion.id === observationId,
  );
  if (
    !clockCertain ||
    !snapshot.clockCertain ||
    !observation ||
    !observation.completion.revisit ||
    observation.outcome !== 'independentSuccess' ||
    !observation.clockCertain ||
    state.reviewStage === null ||
    state.nextReviewDay === null ||
    observation.completion.day < state.nextReviewDay
  )
    return snapshot;
  // Explicit proposal: only the just-completed observation can advance once.
  if (observation !== state.observations.at(-1)) return snapshot;
  const stage = Math.min(3, state.reviewStage + 1) as 1 | 2 | 3;
  const gap = [2, 7, 21, 30][stage];
  if (gap === undefined) throw new Error('Invalid synthetic review stage');
  return {
    ...snapshot,
    concepts: {
      ...snapshot.concepts,
      [concept]: {
        ...state,
        reviewStage: stage,
        nextReviewDay: observation.completion.day + gap,
        reviewDue: false,
      },
    },
  };
}

export function immediateSupportChoices(
  snapshot: SyntheticReviewSnapshot,
  concept: string,
): readonly string[] {
  const recent = conceptReview(snapshot, concept).observations.slice(-2);
  return recent.length === 2 &&
    recent.every(
      (item) =>
        item.outcome === 'unsuccessful' ||
        item.completion.mathematicalHintTier > 0,
    )
    ? ['easier', 'anotherRepresentation', 'workedExample', 'stop']
    : [];
}

export interface SyntheticCandidate {
  readonly concept: string;
  readonly prerequisiteReady: boolean;
  readonly generationAvailable: boolean;
  readonly lastOffered: number;
}

export interface SelectionContext {
  readonly seed: string;
  readonly explicitChoice: string | null;
  readonly requestedHelp: string | null;
  readonly lastConcept: string | null;
  readonly consecutiveScored: number;
  readonly supportOfferedThisSession: readonly string[];
  readonly reviewOfferedThisSession: readonly string[];
  readonly clockCertain: boolean;
}

export interface SyntheticRecommendation {
  readonly concept: string | null;
  readonly reasonCode:
    | 'explicitChoice'
    | 'support'
    | 'reviewDue'
    | 'developing'
    | 'newReady'
    | 'familiar'
    | 'menu';
  readonly policyVersion: string;
  readonly retainedCount: number;
  readonly independentCount: number;
  readonly alternatives: readonly string[];
}

export function recommendReview(
  snapshot: SyntheticReviewSnapshot,
  catalog: readonly SyntheticCandidate[],
  context: SelectionContext,
): SyntheticRecommendation {
  const ready = catalog.filter((candidate) => candidate.generationAvailable);
  const make = (
    concept: string | null,
    reasonCode: SyntheticRecommendation['reasonCode'],
  ): SyntheticRecommendation => {
    const observations = concept
      ? conceptReview(snapshot, concept).observations
      : [];
    return {
      concept,
      reasonCode,
      policyVersion: REVIEW_POLICY.version,
      retainedCount: observations.length,
      independentCount: independent(observations).length,
      alternatives: ['manualChoice', 'numberLab', 'stop'],
    };
  };
  if (
    context.explicitChoice &&
    ready.some((item) => item.concept === context.explicitChoice)
  )
    return make(context.explicitChoice, 'explicitChoice');
  const unblocked = ready.filter(
    (item) =>
      item.concept !== context.lastConcept ||
      context.consecutiveScored < REVIEW_POLICY.consecutiveTaskLimit,
  );
  const groups: readonly [
    SyntheticRecommendation['reasonCode'],
    readonly SyntheticCandidate[],
  ][] = [
    [
      'support',
      unblocked.filter(
        (item) =>
          item.concept === context.requestedHelp ||
          (conceptReview(snapshot, item.concept).needsSupport &&
            context.supportOfferedThisSession.length === 0),
      ),
    ],
    [
      'reviewDue',
      unblocked.filter(
        (item) =>
          context.clockCertain &&
          snapshot.clockCertain &&
          conceptReview(snapshot, item.concept).reviewDue &&
          context.reviewOfferedThisSession.length === 0,
      ),
    ],
    [
      'developing',
      unblocked.filter(
        (item) =>
          conceptReview(snapshot, item.concept).attained === 'Developing',
      ),
    ],
    [
      'newReady',
      unblocked.filter(
        (item) =>
          item.prerequisiteReady &&
          conceptReview(snapshot, item.concept).attained === 'Unseen',
      ),
    ],
    [
      'familiar',
      unblocked.filter(
        (item) => conceptReview(snapshot, item.concept).attained !== 'Unseen',
      ),
    ],
  ];
  for (const [reason, candidates] of groups) {
    if (candidates.length === 0) continue;
    const oldest = Math.min(...candidates.map((item) => item.lastOffered));
    const tied = candidates
      .filter((item) => item.lastOffered === oldest)
      .sort((a, b) =>
        a.concept < b.concept ? -1 : a.concept > b.concept ? 1 : 0,
      );
    const seed = parseSeed(context.seed);
    if (!seed.ok) return make(null, 'menu');
    const draw = boundedChoice(seed.value, tied.length);
    if (!draw.ok) return make(null, 'menu');
    const selected = tied[draw.value];
    return selected ? make(selected.concept, reason) : make(null, 'menu');
  }
  return make(null, 'menu');
}

export function finiteUniverseReview(
  fingerprintCount: number,
  representations: readonly string[],
  coverage: CoverageProposal,
): readonly string[] {
  const blockers: string[] = [];
  if (
    fingerprintCount * REVIEW_POLICY.fingerprintLimit <
    REVIEW_POLICY.secureWindow
  )
    blockers.push('finiteUniverseCannotFillWindow');
  if (
    coverage.kind === 'default' &&
    (new Set(coverage.representations).size < 2 ||
      coverage.representations.some((id) => !representations.includes(id)))
  )
    blockers.push('requiredRepresentationUnavailable');
  return blockers;
}
