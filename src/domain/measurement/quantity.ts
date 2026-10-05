import { dataRecord, hasKeys } from '../core/data';
import { identifier } from '../core/identifiers';
import type { UnitId } from '../core/identifiers';
import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import { rationalFromDto, rationalToDto } from '../math/rational';
import type { RationalDto } from '../math/rational';

export const MEASUREMENT_DIMENSIONS = Object.freeze([
  'length',
  'area',
  'angle',
  'time',
  'mass',
  'volume',
] as const);
export type MeasurementDimension = (typeof MEASUREMENT_DIMENSIONS)[number];

export interface ExactQuantityDto {
  readonly schema: 'quantity-v1';
  readonly kind: 'exact';
  readonly magnitude: RationalDto;
  readonly unitId: UnitId;
  readonly dimension: MeasurementDimension;
}

// Unit content/physical conversions are deliberately absent. A future reviewed
// registry must associate each unit ID with this declared dimension.
export function quantityFromDto(
  input: unknown,
): DomainResult<ExactQuantityDto> {
  const record = dataRecord(input);
  if (
    !record ||
    !hasKeys(record, ['schema', 'kind', 'magnitude', 'unitId', 'dimension'])
  )
    return failure('invalid_input');
  if (record.schema !== 'quantity-v1') return failure('unsupported_version');
  const unit = identifier('unit', record.unitId);
  const dimension = MEASUREMENT_DIMENSIONS.find(
    (candidate) => candidate === record.dimension,
  );
  const magnitude = rationalFromDto(record.magnitude);
  if (record.kind !== 'exact' || !unit.ok || !dimension || !magnitude.ok)
    return failure('invalid_input');
  return success({
    schema: 'quantity-v1',
    kind: 'exact',
    magnitude: rationalToDto(magnitude.value),
    unitId: unit.value,
    dimension,
  });
}
