import type {
  AccessibilitySupport,
  ConceptState,
  DiagnosticReadiness,
  EvidenceOutcome,
  ObservationReason,
  SyntheticObservationInput,
  SyntheticProfileId,
  SyntheticSnapshot,
} from '../../domain/adaptation/types';
import type {
  SelectionMemory,
  SyntheticRecommendation,
} from '../../domain/adaptation/selection';
import type { StructuredAnswer } from '../../domain/puzzles/contracts';
import type { ReplayDescriptor } from '../../domain/replay/descriptor';
import type { ProofFamilyId } from '../../domain/families/proofs';
import type { SliceFamilyId } from '../../domain/families/slice';
import type { ApplicationErrorCode } from '../core/result';
import type { RecordSnapshot } from '../ports/repository';

export const SYNTHETIC_LOOP_SCHEMA = 'phase3c-synthetic-loop-v1';
/** Synthetic engineering capacity, never a production retention/default policy. */
export const SYNTHETIC_LOOP_EVENT_LIMIT = 64;
export type SyntheticLoopMode = 'manual' | 'synthetic-policy';
export type LoopFamilyId = ProofFamilyId | SliceFamilyId;
export type LoopLocale =
  'el-GR' | 'en-GB' | 'de-DE' | 'fr-FR' | 'es-ES' | 'it-IT' | 'pt-PT';
export interface LoopPreferences {
  readonly uiLocale: LoopLocale;
  readonly instructionLocale: LoopLocale;
  readonly numberSpeechLocale: LoopLocale;
}

export interface LoopAnswerRequest {
  readonly replay: ReplayDescriptor;
  readonly answer: StructuredAnswer;
  readonly mathematicalHintTier: 0 | 1 | 2 | 3;
  readonly meaningfulAttempts: 1 | 2 | 3;
  readonly solutionExposed: boolean;
  readonly accessibilitySupports: readonly AccessibilitySupport[];
  /** Presentation must declare accessible mathematical scope, not modality credit. */
  readonly accessible: boolean;
  readonly playMode: 'practice' | 'exploration' | 'numberLab';
  readonly coarseDay: number;
  readonly clockCertain: boolean;
  readonly revisit: boolean;
}

export type LoopEvidenceEvent =
  | {
      readonly kind: 'observation';
      readonly input: SyntheticObservationInput;
      readonly selectionSeed: string;
    }
  | { readonly kind: 'checkpoint'; readonly sessionOrdinal: number };

export type LoopRecommendation = Omit<
  SyntheticRecommendation,
  'memory' | 'snapshot'
>;
/** Catalog signature/internal retry strings are reconstructed, never wire strings. */
export interface LoopDerivedState {
  readonly policyVersion: string;
  readonly concepts: Readonly<Record<string, ConceptState>>;
  readonly diagnostics: readonly DiagnosticReadiness[];
  readonly nextOrdinal: number;
  readonly lastSessionOrdinal: number;
  readonly lastSettledReviewSessionOrdinal: number | null;
  readonly clockCertain: boolean;
  readonly lastTrustedDay: number | null;
  readonly memory: SelectionMemory;
  readonly recommendation: LoopRecommendation | null;
}

export interface LoopCompletion {
  readonly operationId: string;
  readonly correct: boolean;
  readonly evidence:
    'manual' | 'limitedEvidence' | 'sessionOnly' | EvidenceOutcome;
  readonly reasonCode: ObservationReason | null;
}

/** Prepared domain verdict only. Raw submitted answers/replays never enter receipts. */
export interface LoopPending {
  readonly operationId: string;
  readonly expectedRevision: number;
  readonly storageEpoch: number;
  readonly correct: boolean;
  readonly evidenceKind: 'candidate' | 'manual' | 'limitedEvidence';
  readonly observation: Extract<
    LoopEvidenceEvent,
    { kind: 'observation' }
  > | null;
}

export interface SyntheticLoopRecord {
  readonly schema: typeof SYNTHETIC_LOOP_SCHEMA;
  readonly marker: 'synthetic-only';
  readonly profileId: SyntheticProfileId;
  readonly mode: SyntheticLoopMode;
  readonly sessionOrdinal: number;
  readonly sessionActive: boolean;
  readonly preferences: LoopPreferences;
  readonly completedCount: number;
  readonly taskOrdinal: number;
  readonly selectedFamily: LoopFamilyId;
  readonly events: readonly LoopEvidenceEvent[];
  readonly derived: LoopDerivedState;
  readonly pending: LoopPending | null;
  readonly lastCompletion: LoopCompletion | null;
}

export interface SyntheticLoopState {
  readonly record: SyntheticLoopRecord | null;
  readonly snapshot: RecordSnapshot<SyntheticLoopRecord> | null;
  readonly adaptation: SyntheticSnapshot | null;
  readonly saved: boolean;
  readonly busy: boolean;
  readonly uncertain: boolean;
  readonly readOnly: boolean;
  readonly frozen: boolean;
  readonly error: ApplicationErrorCode | null;
  readonly sessionOnlyCompletion: LoopCompletion | null;
  readonly explorationCount: number;
}
