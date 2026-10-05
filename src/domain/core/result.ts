export type DomainErrorCode =
  | 'invalid_input'
  | 'malformed_identifier'
  | 'unsupported_domain'
  | 'range_exceeded'
  | 'division_by_zero'
  | 'unsupported_operation'
  | 'invalid_replay'
  | 'invalid_seed'
  | 'draw_unavailable'
  | 'invalid_graph'
  | 'unsupported_version';

export interface DomainError {
  readonly code: DomainErrorCode;
}

export type DomainResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: DomainError };

export function success<T>(value: T): DomainResult<T> {
  return { ok: true, value };
}

export function failure(code: DomainErrorCode): DomainResult<never> {
  return { ok: false, error: { code } };
}
