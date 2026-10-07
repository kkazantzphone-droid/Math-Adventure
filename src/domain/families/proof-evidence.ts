import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import { rationalFromDto, rationalToSafeInteger } from '../math/rational';
import type { RationalDto } from '../math/rational';
import { generateProof, unitLengthTruth } from './proofs';

export interface ProofEvidence {
  readonly concept: string;
  readonly representation: string;
  readonly fingerprint: string;
  readonly generatorVersion: string;
}

function integer(dto: RationalDto): DomainResult<number> {
  const parsed = rationalFromDto(dto);
  return parsed.ok ? rationalToSafeInteger(parsed.value) : parsed;
}

function gcd(first: number, second: number): number {
  let a = first;
  let b = second;
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/** Rebuild immutable semantic truth before producing a Phase 3B evidence key.
 * Shape keys use exact integer Gram data, invariant under similarity, cyclic
 * vertex order and winding. Rendering dimensions never enter this calculation.
 */
export function proofEvidence(replay: unknown): DomainResult<ProofEvidence> {
  const generated = generateProof(replay);
  if (!generated.ok) return generated;
  const instance = generated.value;
  const scope = instance.evidenceScope;
  if (scope.kind !== 'assessment' || scope.scopes.length !== 1)
    return failure('invalid_input');
  const declaration = scope.scopes[0];
  if (!declaration) return failure('invalid_input');
  let fingerprint: string;
  const task = instance.task;
  if (task.kind === 'evaluateExpression') {
    const root = task.expression.root;
    if (
      root.kind !== 'add' ||
      root.left.kind !== 'literal' ||
      root.right.kind !== 'literal'
    )
      return failure('invalid_input');
    const a = integer(root.left.value),
      b = integer(root.right.value);
    if (!a.ok || !b.ok) return failure('invalid_input');
    fingerprint = `add:${Math.min(a.value, b.value)}:${Math.max(a.value, b.value)}`;
  } else if (task.kind === 'measureGeometry') {
    const length = unitLengthTruth(task.scene);
    if (!length.ok) return length;
    fingerprint = `length:${length.value}`;
  } else if (task.kind === 'classifyGeometry') {
    const polygon = task.scene.objects[0];
    if (!polygon || polygon.kind !== 'polygon') return failure('invalid_input');
    const points: { x: number; y: number }[] = [];
    for (const point of polygon.vertices) {
      const x = integer(point.x),
        y = integer(point.y);
      if (!x.ok || !y.ok) return failure('invalid_input');
      points.push({ x: x.value, y: y.value });
    }
    const [p, q, r] = points;
    if (!p || !q || !r) return failure('invalid_input');
    const a = { x: q.x - p.x, y: q.y - p.y };
    const b = { x: r.x - q.x, y: r.y - q.y };
    const first = a.x * a.x + a.y * a.y;
    const second = b.x * b.x + b.y * b.y;
    const dot = Math.abs(a.x * b.x + a.y * b.y);
    const factor = gcd(gcd(first, second), dot);
    if (factor <= 0) return failure('invalid_input');
    fingerprint = `shape:${Math.min(first, second) / factor}:${Math.max(first, second) / factor}:${dot / factor}`;
  } else return failure('unsupported_domain');
  return success({
    concept: declaration.conceptId,
    representation: declaration.representationId,
    fingerprint,
    generatorVersion: instance.replay.generatorVersion,
  });
}
