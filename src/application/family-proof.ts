import {
  createProofReplay,
  generateProof,
  inspectQuadrilateral,
  PROOF_FAMILY_IDS,
  unitSegments,
  validateProof,
} from '../domain/families/proofs';
import type { ProofFamilyId } from '../domain/families/proofs';
import { failure, success } from '../domain/core/result';
import type { DomainResult } from '../domain/core/result';
import type { ExactPoint } from '../domain/geometry/scene';
import type { ReplayDescriptor } from '../domain/replay/descriptor';
import type { SemanticHint, SemanticTask } from '../domain/puzzles/contracts';
export { PROOF_FAMILY_IDS };
export type { ProofFamilyId };

/** Public presentation data deliberately omits expected answers. No observations. */
export interface FamilyProof {
  readonly familyId: ProofFamilyId;
  readonly replay: ReplayDescriptor;
  readonly task: SemanticTask;
  readonly hint: SemanticHint;
  readonly geometry?: {
    readonly sideLengthSquares: readonly number[];
    readonly rightAngles: readonly boolean[];
  };
  readonly units?: readonly {
    readonly start: ExactPoint;
    readonly end: ExactPoint;
  }[];
}

export function createFamilyProof(
  familyId: ProofFamilyId,
  seedHex: string,
): DomainResult<FamilyProof> {
  const replay = createProofReplay(familyId, seedHex);
  if (!replay.ok) return replay;
  const generated = generateProof(replay.value);
  if (!generated.ok) return generated;
  const { task, hintPlan } = generated.value;
  const hint = hintPlan[0];
  if (!hint) return failure('invalid_input');
  const base = { familyId, replay: generated.value.replay, task, hint };
  if (task.kind === 'classifyGeometry') {
    const attributes = inspectQuadrilateral(task.scene);
    return attributes.ok
      ? success({
          ...base,
          geometry: {
            sideLengthSquares: attributes.value.sideLengthSquares,
            rightAngles: attributes.value.rightAngles,
          },
        })
      : attributes;
  }
  if (task.kind === 'measureGeometry') {
    const units = unitSegments(task.scene);
    return units.ok ? success({ ...base, units: units.value }) : units;
  }
  return success(base);
}

export function submitFamilyProof(
  replay: unknown,
  answer: unknown,
): DomainResult<{ readonly correct: boolean }> {
  const instance = generateProof(replay);
  return instance.ok ? validateProof(instance.value, answer) : instance;
}
