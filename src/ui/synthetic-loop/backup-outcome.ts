import type { ApplicationErrorCode } from '../../application/core/result';

/** occupied/changed/quota/unavailable/blocked: this attempt certainly wrote
 * nothing. differs/absent: what is saved now, when a commit may have happened. */
export type RestoreFailure =
  | 'occupied'
  | 'changed'
  | 'quota'
  | 'unavailable'
  | 'blocked'
  | 'differs'
  | 'absent';
export type RestoreOutcome =
  | { readonly kind: 'restored' }
  | { readonly kind: 'not-restored'; readonly reason: RestoreFailure }
  | { readonly kind: 'uncertain' };

/** Truthful outcome from the restore transaction (null when unknown, as for a
 * later check) and the separate readback (null when it could not run). Only an
 * exact readback reports success; an aborted transaction alone proves nothing
 * was written by this attempt; otherwise state what is saved now. */
export function restoreOutcomeFrom(
  commit:
    | { readonly ok: true }
    | { readonly ok: false; readonly code: ApplicationErrorCode }
    | null,
  readback: 'restored' | 'absent' | 'different' | null,
): RestoreOutcome {
  if (readback === 'restored') return { kind: 'restored' };
  if (commit?.ok === false) {
    const code = commit.code;
    return {
      kind: 'not-restored',
      reason:
        code === 'record_already_exists'
          ? 'occupied'
          : code === 'epoch_conflict' || code === 'operation_conflict'
            ? 'changed'
            : code === 'quota_exceeded'
              ? 'quota'
              : 'unavailable',
    };
  }
  if (readback === 'different')
    return { kind: 'not-restored', reason: 'differs' };
  if (readback === 'absent') return { kind: 'not-restored', reason: 'absent' };
  return { kind: 'uncertain' };
}
