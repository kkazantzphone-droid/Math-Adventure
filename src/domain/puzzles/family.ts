import type {
  ConceptId,
  ContentVersion,
  FamilyId,
  GeneratorVersion,
  RepresentationId,
} from '../core/identifiers';
import type { DomainResult } from '../core/result';
import type { NaturalSafeInteger } from '../math/integer';
import type { ReplayDescriptor } from '../replay/descriptor';
import type {
  PuzzleInstance,
  SemanticHint,
  SemanticTask,
  StructuredAnswer,
} from './contracts';

// Executable catalogs additionally validate minimum <= maximum and nonempty,
// unique category values. Phase 2 validates its bounded static proof catalog.
export type DifficultyDimension =
  | {
      readonly id: RepresentationId;
      readonly kind: 'naturalBound';
      readonly minimum: NaturalSafeInteger;
      readonly maximum: NaturalSafeInteger;
    }
  | {
      readonly id: RepresentationId;
      readonly kind: 'category';
      readonly allowed: readonly RepresentationId[];
    };

export interface FamilyMetadata {
  readonly familyId: FamilyId;
  readonly generatorVersion: GeneratorVersion;
  readonly contentVersion: ContentVersion;
  readonly conceptCoverage: readonly ConceptId[];
  readonly difficultyDimensions: readonly DifficultyDimension[];
  readonly representationCapabilities: readonly RepresentationId[];
  readonly accessibilityEvidence: 'declaredPerInstance';
  readonly localisationKeyReferences: readonly string[];
}

// Internal executable interface, not a DTO/downloaded plugin. The bounded Phase 2
// registry uses this contract; tests/oracles are separately reviewed artifacts.
export interface PuzzleFamily {
  readonly metadata: FamilyMetadata;
  readonly generate: (replay: ReplayDescriptor) => DomainResult<PuzzleInstance>;
  readonly validate: (
    instance: PuzzleInstance,
    answer: StructuredAnswer,
  ) => DomainResult<{ readonly correct: boolean }>;
  readonly deriveHint: (
    task: SemanticTask,
    level: number,
  ) => DomainResult<SemanticHint>;
}
