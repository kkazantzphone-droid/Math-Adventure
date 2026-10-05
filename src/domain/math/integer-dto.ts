import { dataRecord, hasKeys } from '../core/data';
import { failure, success, type DomainResult } from '../core/result';
import { parseExactInteger, withinIntegerBound } from './bounds';

// Exact BigInt-valued power/root results cross a replay boundary through this
// DTO. It differs from the number-backed SignedSafeInteger mathematical type.
export interface IntegerDto {
  readonly schema: 'integer-v1';
  readonly value: string;
}

export function integerToDto(value: bigint): DomainResult<IntegerDto> {
  if (typeof value !== 'bigint') return failure('invalid_input');
  if (!withinIntegerBound(value)) return failure('range_exceeded');
  return success(
    Object.freeze({ schema: 'integer-v1', value: value.toString() }),
  );
}

export function integerFromDto(input: unknown): DomainResult<bigint> {
  const data = dataRecord(input);
  if (!data || !hasKeys(data, ['schema', 'value']))
    return failure('invalid_input');
  if (data.schema !== 'integer-v1') return failure('unsupported_version');
  return parseExactInteger(data.value);
}
