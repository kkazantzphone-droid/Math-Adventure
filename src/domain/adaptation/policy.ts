// Numeric hypotheses copied explicitly from readiness, never accepted product policy.
export const ADAPTATION_POLICY = Object.freeze({
  version: 'phase3b-synthetic-policy-v1',
  status: 'experimental' as const,
  educatorReview: 'required' as const,
  developingWindow: 5,
  developingIndependent: 3,
  developingDiversity: 2,
  secureWindow: 10,
  secureIndependent: 8,
  secureSessions: 2,
  secureVariation: 2,
  representationIndependent: 2,
  fingerprintLimit: 2,
  retrievalGapDays: 2,
  perConceptLimit: 10,
  learnerLimit: 500,
  ageLimitDays: 60,
  supportWindow: 5,
  supportNonIndependent: 3,
  supportSessions: 2,
  supportRecoveryIndependent: 3,
  supportRecoveryDiversity: 3,
  supportRecoverySessions: 2,
  consecutiveTaskLimit: 3,
  reviewIntervals: Object.freeze([2, 7, 21, 30] as const),
});

// Refusal bounds for this memory-only proof, not learner retention/retry policy.
export const SYNTHETIC_ENGINE_LIMITS = Object.freeze({
  receipts: 1024,
  concepts: 128,
  diagnostics: 128,
  text: 4096,
  coarseDay: 1_000_000,
  sessionOrdinal: 1_000_000,
});
