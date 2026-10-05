import type { ProofFamilyId } from '../../application/family-proof';

export const PROOF_CLASS_IDS = [
  'geometry.parallelogram',
  'geometry.rectangle',
  'geometry.square',
] as const;

/** Bounded input encoding only; the application/domain decides validity and truth. */
export function encodeProofAnswer(
  familyId: ProofFamilyId,
  value: string,
  classIds: readonly string[],
): unknown {
  if (familyId === 'geometry.quadrilateral')
    return { kind: 'classification', classIds };
  const magnitude = {
    schema: 'rational-v1',
    numerator: value,
    denominator: '1',
  };
  return familyId === 'number.addition'
    ? { kind: 'exactValue', value: magnitude }
    : {
        kind: 'quantity',
        quantity: {
          schema: 'quantity-v1',
          kind: 'exact',
          magnitude,
          unitId: 'unit.length-step',
          dimension: 'length',
        },
      };
}
