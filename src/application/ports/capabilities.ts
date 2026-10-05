import type { ExpressionDto } from '../../domain/expressions/expression';
import type { GeometryScene } from '../../domain/geometry/scene';
import type { RepresentationId } from '../../domain/core/identifiers';
import type { SpeechCapability } from './speech';

export type StorageCapability =
  | {
      readonly state: 'unknown' | 'available' | 'unavailable' | 'quota-limited';
    }
  | { readonly state: 'degraded'; readonly saving: 'unsaved-session-only' };

export type RepresentationRequirement =
  | {
      readonly kind: 'geometry';
      readonly scene: GeometryScene;
      readonly representationId: RepresentationId;
      readonly accessibleAlternativeRequired: true;
    }
  | {
      readonly kind: 'notation';
      readonly expression: ExpressionDto;
      readonly representationId: RepresentationId;
      readonly accessibleAlternativeRequired: true;
    };

// Capability data contains no revised scene, expression, answer or truth.
export type RepresentationCapability =
  | { readonly state: 'unknown' | 'supported' | 'unsupported' }
  | { readonly state: 'degraded'; readonly alternativeAvailable: boolean };

/** Contract vocabulary only. Availability is not durable-save evidence. */
export interface PlatformCapabilityPort {
  storage(): Promise<StorageCapability>;
}

/** Future adapters validate semantic input and returned capability data.
 * No SVG, MathML, markup generation or feature detection is implemented here.
 */
export interface RepresentationCapabilityPort {
  inspect(
    requirement: RepresentationRequirement,
  ): Promise<RepresentationCapability>;
}

export interface CapabilitySnapshot {
  readonly storage: StorageCapability;
  readonly speech: SpeechCapability;
  readonly representation: RepresentationCapability;
}
