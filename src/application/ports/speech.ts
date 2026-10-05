// Phase 1D supplies validated request/plan types; no locale/utterance schema here.
export type SpeechCapability =
  | { readonly state: 'unknown' | 'loading' | 'missing' | 'error' }
  | { readonly state: 'ready-local' }
  | {
      readonly state: 'tested-offline';
      readonly scope: 'current-provider-and-surface';
    };

export type SpeechOutcome = {
  readonly kind:
    'completed' | 'cancelled' | 'unavailable' | 'error' | 'timeout';
};

/** A specialization must validate external request/plan data before use.
 * Only nonpersonal reviewed content may enter speech. Implementations later
 * enforce explicit local-only providers; speech never participates in commit.
 */
export interface SpeechPort<Request, Plan> {
  capabilities(request: Request): Promise<SpeechCapability>;
  speak(plan: Plan): Promise<SpeechOutcome>;
  cancel(): void;
}
