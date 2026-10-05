export type ApplicationErrorCode =
  | 'invalid_command'
  | 'unsupported_schema'
  | 'invalid_record'
  | 'invalid_receipt'
  | 'invalid_revision'
  | 'invalid_epoch'
  | 'invalid_operation_id'
  | 'invalid_record_id'
  | 'revision_overflow'
  | 'epoch_overflow'
  | 'record_not_found'
  | 'record_already_exists'
  | 'revision_conflict'
  | 'epoch_conflict'
  | 'operation_conflict'
  | 'storage_unavailable'
  | 'quota_exceeded';

// Concurrency/I/O failures are separate from mathematical/domain outcomes.
export type ApplicationResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly error: { readonly code: ApplicationErrorCode };
    };

export function applicationSuccess<T>(value: T): ApplicationResult<T> {
  return { ok: true, value };
}

export function applicationFailure(
  code: ApplicationErrorCode,
): ApplicationResult<never> {
  return { ok: false, error: { code } };
}
