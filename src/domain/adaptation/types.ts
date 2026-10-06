// Synthetic-only contracts. These are not a production learner record codec.
export type EvidenceOutcome =
  'independentSuccess' | 'supportedSuccess' | 'unsuccessful' | 'excluded';
export type AttainedState = 'Unseen' | 'Emerging' | 'Developing' | 'Secure';
export type ObservationMode =
  'practice' | 'diagnostic' | 'exploration' | 'numberLab';
export type ObservationReason =
  | 'independent'
  | 'mathematicalSupport'
  | 'unsuccessful'
  | 'nonPractice'
  | 'notCompleted'
  | 'inaccessibleScope'
  | 'solutionExposed'
  | 'immediateDuplicate'
  | 'retrievalLimit'
  | 'clockUncertain';
export type AccessibilitySupport =
  | 'screenReader'
  | 'speechReplay'
  | 'enlargedText'
  | 'alternateControls'
  | 'instructionClarification';

export interface SyntheticObservationInput {
  readonly synthetic: true;
  readonly id: string;
  readonly concept: string;
  readonly representation: string;
  readonly taskFingerprint: string;
  readonly evidenceFingerprint: string;
  readonly sessionOrdinal: number;
  readonly coarseDay: number;
  readonly clockCertain: boolean;
  readonly mathematicalHintTier: 0 | 1 | 2 | 3;
  readonly solutionExposed: boolean;
  readonly meaningfulAttempts: 1 | 2 | 3;
  readonly mode: ObservationMode;
  readonly completion:
    'completed' | 'skipped' | 'interrupted' | 'adapterFailed' | 'abandoned';
  readonly accessible: boolean;
  readonly correct: boolean;
  readonly accessibilitySupports: readonly AccessibilitySupport[];
  readonly variationCase: boolean;
  readonly revisit: boolean;
  readonly policyVersion: string;
  readonly generatorVersion: string;
}

export interface FrozenObservation {
  readonly input: SyntheticObservationInput;
  readonly outcome: EvidenceOutcome;
  readonly reasonCode: ObservationReason;
  readonly ordinal: number;
  readonly clockCertain: boolean;
}

export interface RepresentationEvidence {
  readonly representation: string;
  readonly retained: number;
  readonly independent: number;
  readonly supported: number;
  readonly unsuccessful: number;
}

export interface AttainmentSummary {
  readonly state: AttainedState;
  readonly scopeRepresentations: readonly string[];
  readonly promotionDay: number | null;
  readonly independentCount: number;
  readonly retainedCount: number;
  readonly policyVersion: string;
  readonly coverageCandidate: 'default' | 'singleRepresentationCandidate';
  readonly educatorReview: 'required';
}

export interface ConceptState {
  readonly attained: AttainedState;
  readonly attainment: AttainmentSummary | null;
  readonly recentState: AttainedState;
  readonly observations: readonly FrozenObservation[];
  readonly representationEvidence: readonly RepresentationEvidence[];
  readonly needsSupport: boolean;
  readonly supportActivatedAfter: number;
  readonly lastCheckpointOrdinal: number;
  readonly reviewStage: 0 | 1 | 2 | 3 | null;
  readonly nextReviewDay: number | null;
  readonly lastSettledOrdinal: number;
  readonly reviewDue: boolean;
  readonly limitedEvidence: boolean;
}

export const SYNTHETIC_PROFILE_IDS = Object.freeze([
  'SYNTHETIC-PLAYER-1',
  'SYNTHETIC-PLAYER-2',
] as const);
export type SyntheticProfileId = (typeof SYNTHETIC_PROFILE_IDS)[number];

export interface DiagnosticReadiness {
  readonly concept: string;
  readonly representation: string;
  readonly coarseDay: number;
  readonly clockCertain: boolean;
}

export interface SyntheticSnapshot {
  readonly synthetic: true;
  readonly profileId: SyntheticProfileId;
  readonly policyVersion: string;
  readonly catalogSignature: string | null;
  readonly concepts: Readonly<Record<string, ConceptState>>;
  readonly diagnostics: readonly DiagnosticReadiness[];
  readonly receipts: readonly {
    readonly id: string;
    readonly canonicalInput: string;
    readonly observation: FrozenObservation;
  }[];
  readonly nextOrdinal: number;
  readonly lastSessionOrdinal: number;
  readonly lastSettledReviewSessionOrdinal: number | null;
  readonly clockCertain: boolean;
  readonly lastTrustedDay: number | null;
}

export type AdaptationErrorCode =
  | 'invalidObservation'
  | 'unsupportedPolicy'
  | 'invalidCatalog'
  | 'catalogChanged'
  | 'unknownEvidence'
  | 'conflictingRetry'
  | 'receiptCapacityReached'
  | 'ordinalCapacityReached';
export type ObservationResult =
  | {
      readonly ok: true;
      readonly snapshot: SyntheticSnapshot;
      readonly observation: FrozenObservation;
      readonly exactRetry: boolean;
    }
  | {
      readonly ok: false;
      readonly error: { readonly code: AdaptationErrorCode };
    };
