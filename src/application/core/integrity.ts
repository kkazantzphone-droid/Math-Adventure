import { applicationFailure, applicationSuccess } from './result';
import type { ApplicationResult } from './result';

declare const integrityBrand: unique symbol;
export type Revision = number & { readonly [integrityBrand]: 'revision' };
export type StorageEpoch = number & {
  readonly [integrityBrand]: 'storageEpoch';
};
export type OperationId = string & { readonly [integrityBrand]: 'operationId' };
export type RecordId = string & { readonly [integrityBrand]: 'recordId' };

export function revision(input: unknown): ApplicationResult<Revision> {
  return typeof input === 'number' && Number.isSafeInteger(input) && input >= 0
    ? applicationSuccess((input === 0 ? 0 : input) as Revision)
    : applicationFailure('invalid_revision');
}

export function storageEpoch(input: unknown): ApplicationResult<StorageEpoch> {
  return typeof input === 'number' && Number.isSafeInteger(input) && input >= 0
    ? applicationSuccess((input === 0 ? 0 : input) as StorageEpoch)
    : applicationFailure('invalid_epoch');
}

export function advanceRevision(input: Revision): ApplicationResult<Revision> {
  const checked = revision(input);
  if (!checked.ok) return checked;
  return input === Number.MAX_SAFE_INTEGER
    ? applicationFailure('revision_overflow')
    : revision(input + 1);
}

export function advanceEpoch(
  input: StorageEpoch,
): ApplicationResult<StorageEpoch> {
  const checked = storageEpoch(input);
  if (!checked.ok) return checked;
  return input === Number.MAX_SAFE_INTEGER
    ? applicationFailure('epoch_overflow')
    : storageEpoch(input + 1);
}

function validId(input: unknown): input is string {
  return (
    typeof input === 'string' &&
    input.length <= 96 &&
    /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(input)
  );
}

// Opaque caller-supplied tokens only; callers must not encode personal data.
// Syntax validation cannot establish the provenance/meaning of an arbitrary ID.
export function operationId(input: unknown): ApplicationResult<OperationId> {
  return validId(input)
    ? applicationSuccess(input as OperationId)
    : applicationFailure('invalid_operation_id');
}

export function recordId(input: unknown): ApplicationResult<RecordId> {
  return validId(input)
    ? applicationSuccess(input as RecordId)
    : applicationFailure('invalid_record_id');
}
