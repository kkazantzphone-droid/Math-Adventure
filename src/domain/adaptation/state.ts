import { dataArray, dataRecord, hasKeys } from '../core/data';
import { canonicalize } from '../replay/canonical';
import { certifyEvidenceCatalog, findEvidenceCase } from './catalog';
import type { ConceptEvidenceScope, SyntheticEvidenceCatalog } from './catalog';
import {
  ADAPTATION_POLICY as policy,
  SYNTHETIC_ENGINE_LIMITS as limits,
} from './policy';
import { SYNTHETIC_PROFILE_IDS } from './types';
import type {
  AccessibilitySupport,
  AttainedState,
  ConceptState,
  FrozenObservation,
  ObservationResult,
  RepresentationEvidence,
  SyntheticObservationInput,
  SyntheticProfileId,
  SyntheticSnapshot,
} from './types';

const observationKeys = [
  'synthetic',
  'id',
  'concept',
  'representation',
  'taskFingerprint',
  'evidenceFingerprint',
  'sessionOrdinal',
  'coarseDay',
  'clockCertain',
  'mathematicalHintTier',
  'solutionExposed',
  'meaningfulAttempts',
  'mode',
  'completion',
  'accessible',
  'correct',
  'accessibilitySupports',
  'variationCase',
  'revisit',
  'policyVersion',
  'generatorVersion',
] as const;
const accessibilitySupports: readonly AccessibilitySupport[] = [
  'screenReader',
  'speechReplay',
  'enlargedText',
  'alternateControls',
  'instructionClarification',
];
const stateOrder: readonly AttainedState[] = [
  'Unseen',
  'Emerging',
  'Developing',
  'Secure',
];

function boundedOrdinal(value: unknown, maximum: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= maximum
  );
}

/** Decoded own data only: there is no arbitrary answer, prose or timing field. */
export function syntheticObservationFromInput(
  input: unknown,
): SyntheticObservationInput | undefined {
  const row = dataRecord(input, observationKeys.length);
  if (!row || !hasKeys(row, observationKeys)) return undefined;
  const supports = dataArray(
    row.accessibilitySupports,
    accessibilitySupports.length,
  );
  if (
    row.synthetic !== true ||
    typeof row.id !== 'string' ||
    !/^SYNTHETIC-[A-Za-z0-9._-]{1,80}$/.test(row.id) ||
    [
      'concept',
      'representation',
      'taskFingerprint',
      'evidenceFingerprint',
      'policyVersion',
      'generatorVersion',
    ].some(
      (key) =>
        typeof row[key] !== 'string' ||
        !/^[a-z][a-z0-9:._-]{0,127}$/.test(row[key]),
    ) ||
    !boundedOrdinal(row.sessionOrdinal, limits.sessionOrdinal) ||
    !boundedOrdinal(row.coarseDay, limits.coarseDay) ||
    ![0, 1, 2, 3].includes(row.mathematicalHintTier as number) ||
    ![1, 2, 3].includes(row.meaningfulAttempts as number) ||
    !['practice', 'diagnostic', 'exploration', 'numberLab'].includes(
      row.mode as string,
    ) ||
    ![
      'completed',
      'skipped',
      'interrupted',
      'adapterFailed',
      'abandoned',
    ].includes(row.completion as string) ||
    [
      'clockCertain',
      'solutionExposed',
      'accessible',
      'correct',
      'variationCase',
      'revisit',
    ].some((key) => typeof row[key] !== 'boolean') ||
    !supports ||
    supports.some(
      (item) => !accessibilitySupports.includes(item as AccessibilitySupport),
    ) ||
    new Set(supports).size !== supports.length
  )
    return undefined;
  const canonical = canonicalize(row);
  if (!canonical.ok) return undefined;
  // The data-only reader above has checked every property and each scalar range.
  return Object.freeze({
    ...row,
    accessibilitySupports: Object.freeze([...supports]),
  }) as unknown as SyntheticObservationInput;
}

function freezeConcept(state: ConceptState): ConceptState {
  return Object.freeze({
    ...state,
    observations: Object.freeze([...state.observations]),
    representationEvidence: Object.freeze(
      state.representationEvidence.map((item) => Object.freeze({ ...item })),
    ),
    attainment:
      state.attainment === null
        ? null
        : Object.freeze({
            ...state.attainment,
            scopeRepresentations: Object.freeze([
              ...state.attainment.scopeRepresentations,
            ]),
          }),
  });
}

function freezeSnapshot(snapshot: SyntheticSnapshot): SyntheticSnapshot {
  return Object.freeze({
    ...snapshot,
    concepts: Object.freeze(
      Object.fromEntries(
        Object.entries(snapshot.concepts).map(([id, state]) => [
          id,
          freezeConcept(state),
        ]),
      ),
    ),
    diagnostics: Object.freeze(
      snapshot.diagnostics.map((item) => Object.freeze({ ...item })),
    ),
    receipts: Object.freeze(
      snapshot.receipts.map((item) => Object.freeze({ ...item })),
    ),
  });
}

function emptyConcept(): ConceptState {
  return freezeConcept({
    attained: 'Unseen',
    attainment: null,
    recentState: 'Unseen',
    observations: [],
    representationEvidence: [],
    needsSupport: false,
    supportActivatedAfter: 0,
    lastCheckpointOrdinal: 0,
    reviewStage: null,
    nextReviewDay: null,
    lastSettledOrdinal: 0,
    reviewDue: false,
    limitedEvidence: true,
  });
}

export function emptySyntheticSnapshot(
  profileId: SyntheticProfileId = 'SYNTHETIC-PLAYER-1',
): SyntheticSnapshot {
  if (!SYNTHETIC_PROFILE_IDS.includes(profileId))
    throw new Error('invalidSyntheticProfile');
  return freezeSnapshot({
    synthetic: true,
    profileId,
    policyVersion: policy.version,
    catalogSignature: null,
    concepts: {},
    diagnostics: [],
    receipts: [],
    nextOrdinal: 1,
    lastSessionOrdinal: 0,
    lastSettledReviewSessionOrdinal: null,
    clockCertain: true,
    lastTrustedDay: null,
  });
}

export function getConceptState(
  snapshot: SyntheticSnapshot,
  concept: string,
): ConceptState {
  return Object.hasOwn(snapshot.concepts, concept)
    ? (snapshot.concepts[concept] ?? emptyConcept())
    : emptyConcept();
}

function catalogSignature(
  snapshot: SyntheticSnapshot,
  catalog: SyntheticEvidenceCatalog,
): string | undefined {
  if (!supportedSnapshot(snapshot)) return undefined;
  const certified = certifyEvidenceCatalog(catalog, policy);
  if (!certified.ok || catalog.scopes.length > limits.concepts)
    return undefined;
  const canonical = canonicalize({
    ...catalog,
    scopes: [...catalog.scopes].sort((a, b) =>
      a.conceptId < b.conceptId ? -1 : a.conceptId > b.conceptId ? 1 : 0,
    ),
  });
  return canonical.ok ? canonical.value : undefined;
}

function supportedSnapshot(snapshot: SyntheticSnapshot): boolean {
  return (
    snapshot.synthetic === true &&
    SYNTHETIC_PROFILE_IDS.includes(snapshot.profileId) &&
    snapshot.policyVersion === policy.version
  );
}

function independent(
  items: readonly FrozenObservation[],
): readonly FrozenObservation[] {
  return items.filter((item) => item.outcome === 'independentSuccess');
}
function diversity(items: readonly FrozenObservation[]): number {
  return new Set(items.map((item) => item.input.evidenceFingerprint)).size;
}
function sessions(items: readonly FrozenObservation[]): number {
  return new Set(items.map((item) => item.input.sessionOrdinal)).size;
}

export function representationEvidence(
  snapshot: SyntheticSnapshot,
  concept: string,
  representation: string,
): RepresentationEvidence {
  const items = getConceptState(snapshot, concept).observations.filter(
    (item) => item.input.representation === representation,
  );
  return Object.freeze({
    representation,
    retained: items.length,
    independent: independent(items).length,
    supported: items.filter((item) => item.outcome === 'supportedSuccess')
      .length,
    unsuccessful: items.filter((item) => item.outcome === 'unsuccessful')
      .length,
  });
}

function coverageSatisfied(
  items: readonly FrozenObservation[],
  scope: ConceptEvidenceScope,
): boolean {
  const successes = independent(items);
  return (
    (scope.coverage === 'singleRepresentationCandidate' ||
      new Set(scope.representations).size >= 2) &&
    scope.representations.every(
      (representation) =>
        successes.filter((item) => item.input.representation === representation)
          .length >= policy.representationIndependent,
    )
  );
}

function recentState(
  items: readonly FrozenObservation[],
  scope: ConceptEvidenceScope,
): AttainedState {
  const successes = independent(items);
  if (
    items.length === policy.secureWindow &&
    successes.length >= policy.secureIndependent &&
    sessions(successes) >= policy.secureSessions &&
    diversity(successes.filter((item) => item.input.variationCase)) >=
      policy.secureVariation &&
    coverageSatisfied(items, scope)
  )
    return 'Secure';
  const recent = items.slice(-policy.developingWindow);
  if (
    recent.length === policy.developingWindow &&
    independent(recent).length >= policy.developingIndependent &&
    diversity(recent) >= policy.developingDiversity
  )
    return 'Developing';
  return items.length > 0 ? 'Emerging' : 'Unseen';
}

function summarize(
  before: ConceptState,
  observations: readonly FrozenObservation[],
  scope: ConceptEvidenceScope,
  certain: boolean,
  day: number,
): ConceptState {
  const recent = recentState(observations, scope);
  const promoted =
    stateOrder.indexOf(recent) > stateOrder.indexOf(before.attained);
  const attained = promoted ? recent : before.attained;
  const reps = scope.representations.map((representation) => {
    const items = observations.filter(
      (item) => item.input.representation === representation,
    );
    return {
      representation,
      retained: items.length,
      independent: independent(items).length,
      supported: items.filter((item) => item.outcome === 'supportedSuccess')
        .length,
      unsuccessful: items.filter((item) => item.outcome === 'unsuccessful')
        .length,
    };
  });
  return freezeConcept({
    ...before,
    observations,
    recentState: recent,
    attained,
    representationEvidence: reps,
    attainment: promoted
      ? {
          state: attained,
          scopeRepresentations: reps
            .filter((item) => item.independent > 0)
            .map((item) => item.representation),
          promotionDay: certain ? day : null,
          independentCount: independent(observations).length,
          retainedCount: observations.length,
          policyVersion: policy.version,
          coverageCandidate: scope.coverage,
          educatorReview: 'required',
        }
      : before.attainment,
    limitedEvidence: !certain || recent !== 'Secure',
    reviewDue: certain
      ? before.nextReviewDay !== null && day >= before.nextReviewDay
      : before.reviewDue,
  });
}

/** Supplied coarse time only. Once uncertain, only explicit resolution resumes advancement. */
export function advanceSyntheticClock(
  snapshot: SyntheticSnapshot,
  coarseDay: number,
  clockCertain: boolean,
  catalog: SyntheticEvidenceCatalog,
): SyntheticSnapshot {
  if (
    !boundedOrdinal(coarseDay, limits.coarseDay) ||
    typeof clockCertain !== 'boolean'
  )
    return snapshot;
  const signature = catalogSignature(snapshot, catalog);
  if (
    signature === undefined ||
    (snapshot.catalogSignature !== null &&
      snapshot.catalogSignature !== signature)
  )
    return snapshot;
  const certain =
    snapshot.clockCertain &&
    clockCertain &&
    (snapshot.lastTrustedDay === null || coarseDay >= snapshot.lastTrustedDay);
  const observations = Object.values(snapshot.concepts)
    .flatMap((state) => state.observations)
    .filter(
      (item) =>
        !certain || coarseDay - item.input.coarseDay <= policy.ageLimitDays,
    )
    .sort((a, b) => a.ordinal - b.ordinal)
    .slice(-policy.learnerLimit);
  const ordinals = new Set(observations.map((item) => item.ordinal));
  return freezeSnapshot({
    ...snapshot,
    clockCertain: certain,
    lastTrustedDay: certain ? coarseDay : snapshot.lastTrustedDay,
    diagnostics: snapshot.diagnostics.filter(
      (item) => !certain || coarseDay - item.coarseDay <= policy.ageLimitDays,
    ),
    concepts: Object.fromEntries(
      Object.entries(snapshot.concepts).map(([id, before]) => {
        const retained = before.observations
          .filter((item) => ordinals.has(item.ordinal))
          .slice(-policy.perConceptLimit);
        const scope = catalog.scopes.find((item) => item.conceptId === id);
        return [
          id,
          scope
            ? summarize(before, retained, scope, certain, coarseDay)
            : before,
        ];
      }),
    ),
  });
}

export function resolveSyntheticClock(
  snapshot: SyntheticSnapshot,
  coarseDay: number,
  catalog: SyntheticEvidenceCatalog,
): SyntheticSnapshot {
  if (!boundedOrdinal(coarseDay, limits.coarseDay)) return snapshot;
  const signature = catalogSignature(snapshot, catalog);
  if (
    signature === undefined ||
    (snapshot.catalogSignature !== null &&
      snapshot.catalogSignature !== signature)
  )
    return snapshot;
  return advanceSyntheticClock(
    { ...snapshot, clockCertain: true, lastTrustedDay: coarseDay },
    coarseDay,
    true,
    catalog,
  );
}

function classify(
  input: SyntheticObservationInput,
  before: readonly FrozenObservation[],
  ordinal: number,
  certain: boolean,
): FrozenObservation {
  const result = (
    outcome: FrozenObservation['outcome'],
    reasonCode: FrozenObservation['reasonCode'],
  ): FrozenObservation =>
    Object.freeze({
      input,
      ordinal,
      outcome,
      reasonCode,
      clockCertain: certain,
    });
  if (input.mode !== 'practice') return result('excluded', 'nonPractice');
  if (input.completion !== 'completed')
    return result('excluded', 'notCompleted');
  if (!input.accessible) return result('excluded', 'inaccessibleScope');
  if (input.solutionExposed) return result('excluded', 'solutionExposed');
  const repeats = before.filter(
    (item) => item.input.evidenceFingerprint === input.evidenceFingerprint,
  );
  if (repeats.length >= policy.fingerprintLimit)
    return result('excluded', 'retrievalLimit');
  const last = repeats.at(-1);
  if (last) {
    if (!certain || !last.clockCertain)
      return result('excluded', 'clockUncertain');
    if (
      last.input.sessionOrdinal === input.sessionOrdinal ||
      input.coarseDay - last.input.coarseDay < policy.retrievalGapDays
    )
      return result('excluded', 'immediateDuplicate');
  }
  if (!input.correct) return result('unsuccessful', 'unsuccessful');
  if (input.meaningfulAttempts !== 1 || input.mathematicalHintTier > 0)
    return result('supportedSuccess', 'mathematicalSupport');
  return result('independentSuccess', 'independent');
}

export function applySyntheticObservation(
  snapshot: SyntheticSnapshot,
  raw: unknown,
  catalog: SyntheticEvidenceCatalog,
): ObservationResult {
  const input = syntheticObservationFromInput(raw);
  if (!input) return { ok: false, error: { code: 'invalidObservation' } };
  if (
    snapshot.synthetic !== true ||
    !SYNTHETIC_PROFILE_IDS.includes(snapshot.profileId)
  )
    return { ok: false, error: { code: 'invalidObservation' } };
  if (
    snapshot.policyVersion !== policy.version ||
    input.policyVersion !== policy.version
  )
    return { ok: false, error: { code: 'unsupportedPolicy' } };
  if (input.mode === 'numberLab' || input.mode === 'exploration') {
    // Session-only exposure needs no retained history, receipt, readiness or clock mutation.
    return {
      ok: true,
      snapshot,
      observation: classify(
        input,
        [],
        snapshot.nextOrdinal,
        snapshot.clockCertain,
      ),
      exactRetry: false,
    };
  }
  const signature = catalogSignature(snapshot, catalog);
  if (signature === undefined)
    return { ok: false, error: { code: 'invalidCatalog' } };
  if (
    snapshot.catalogSignature !== null &&
    snapshot.catalogSignature !== signature
  )
    return { ok: false, error: { code: 'catalogChanged' } };
  const canonical = canonicalize(input);
  if (!canonical.ok)
    return { ok: false, error: { code: 'invalidObservation' } };
  const receipt = snapshot.receipts.find((item) => item.id === input.id);
  if (receipt)
    return receipt.canonicalInput === canonical.value
      ? {
          ok: true,
          snapshot,
          observation: receipt.observation,
          exactRetry: true,
        }
      : { ok: false, error: { code: 'conflictingRetry' } };
  if (input.sessionOrdinal < snapshot.lastSessionOrdinal)
    return { ok: false, error: { code: 'invalidObservation' } };
  if (snapshot.receipts.length >= limits.receipts)
    return { ok: false, error: { code: 'receiptCapacityReached' } };
  if (
    !Number.isSafeInteger(snapshot.nextOrdinal) ||
    snapshot.nextOrdinal >= Number.MAX_SAFE_INTEGER
  )
    return { ok: false, error: { code: 'ordinalCapacityReached' } };
  const evidence = findEvidenceCase(catalog, input);
  const scope = catalog.scopes.find((item) => item.conceptId === input.concept);
  if (!evidence || !scope || (input.variationCase && !evidence.variationCase))
    return { ok: false, error: { code: 'unknownEvidence' } };
  const retained = advanceSyntheticClock(
    snapshot,
    input.coarseDay,
    input.clockCertain,
    catalog,
  );
  const before = getConceptState(retained, input.concept);
  const observation = classify(
    input,
    before.observations,
    snapshot.nextOrdinal,
    retained.clockCertain,
  );
  let concepts = retained.concepts;
  let diagnostics = retained.diagnostics;
  if (observation.outcome !== 'excluded') {
    concepts = {
      ...concepts,
      [input.concept]: summarize(
        before,
        [...before.observations, observation].slice(-policy.perConceptLimit),
        scope,
        retained.clockCertain,
        input.coarseDay,
      ),
    };
  } else if (
    input.mode === 'diagnostic' &&
    input.completion === 'completed' &&
    input.accessible &&
    input.correct &&
    input.meaningfulAttempts === 1 &&
    input.mathematicalHintTier === 0 &&
    !input.solutionExposed
  ) {
    diagnostics = [
      ...diagnostics.filter(
        (item) =>
          item.concept !== input.concept ||
          item.representation !== input.representation,
      ),
      {
        concept: input.concept,
        representation: input.representation,
        coarseDay: input.coarseDay,
        clockCertain: retained.clockCertain,
      },
    ].slice(-limits.diagnostics);
  }
  const updated = freezeSnapshot({
    ...retained,
    concepts,
    diagnostics,
    catalogSignature: signature,
    nextOrdinal: snapshot.nextOrdinal + 1,
    lastSessionOrdinal: input.sessionOrdinal,
    receipts: [
      ...snapshot.receipts,
      { id: input.id, canonicalInput: canonical.value, observation },
    ],
  });
  return {
    ok: true,
    snapshot: advanceSyntheticClock(
      updated,
      input.coarseDay,
      input.clockCertain,
      catalog,
    ),
    observation,
    exactRetry: false,
  };
}

export function checkpointSyntheticSession(
  snapshot: SyntheticSnapshot,
): SyntheticSnapshot {
  if (!supportedSnapshot(snapshot)) return snapshot;
  return freezeSnapshot({
    ...snapshot,
    concepts: Object.fromEntries(
      Object.entries(snapshot.concepts).map(([id, state]) => {
        const latestOrdinal = state.observations.at(-1)?.ordinal ?? 0;
        if (latestOrdinal === state.lastCheckpointOrdinal) return [id, state];
        const recent = state.observations.slice(-policy.supportWindow);
        const nonIndependent = recent.filter(
          (item) => item.outcome !== 'independentSuccess',
        );
        if (state.needsSupport) {
          const recovery = independent(state.observations).filter(
            (item) =>
              item.ordinal > state.supportActivatedAfter && item.input.revisit,
          );
          const clear =
            recovery.length >= policy.supportRecoveryIndependent &&
            diversity(recovery) >= policy.supportRecoveryDiversity &&
            sessions(recovery) >= policy.supportRecoverySessions;
          return [
            id,
            {
              ...state,
              needsSupport: !clear,
              lastCheckpointOrdinal: latestOrdinal,
            },
          ];
        }
        const activate =
          recent.length === policy.supportWindow &&
          nonIndependent.length >= policy.supportNonIndependent &&
          sessions(nonIndependent) >= policy.supportSessions;
        return [
          id,
          {
            ...state,
            needsSupport: activate,
            lastCheckpointOrdinal: latestOrdinal,
            supportActivatedAfter: activate
              ? snapshot.nextOrdinal - 1
              : state.supportActivatedAfter,
          },
        ];
      }),
    ),
  });
}

export function confirmSyntheticReadiness(
  snapshot: SyntheticSnapshot,
  concept: string,
  observationId: string,
): SyntheticSnapshot {
  if (!supportedSnapshot(snapshot)) return snapshot;
  const state = getConceptState(snapshot, concept);
  const observation = state.observations.find(
    (item) =>
      item.input.id === observationId && item.outcome === 'independentSuccess',
  );
  if (
    !snapshot.clockCertain ||
    !observation?.clockCertain ||
    state.reviewStage !== null
  )
    return snapshot;
  const nextReviewDay = observation.input.coarseDay + policy.reviewIntervals[0];
  return freezeSnapshot({
    ...snapshot,
    concepts: {
      ...snapshot.concepts,
      [concept]: {
        ...state,
        reviewStage: 0,
        nextReviewDay,
        reviewDue:
          snapshot.lastTrustedDay !== null &&
          snapshot.lastTrustedDay >= nextReviewDay,
      },
    },
  });
}

export function settleSyntheticRevisit(
  snapshot: SyntheticSnapshot,
  concept: string,
  observationId: string,
): SyntheticSnapshot {
  if (!supportedSnapshot(snapshot)) return snapshot;
  const state = getConceptState(snapshot, concept);
  const observation = state.observations.at(-1);
  if (
    !snapshot.clockCertain ||
    !observation ||
    (snapshot.lastSettledReviewSessionOrdinal !== null &&
      observation.input.sessionOrdinal <=
        snapshot.lastSettledReviewSessionOrdinal) ||
    observation.input.id !== observationId ||
    !observation.clockCertain ||
    !observation.input.revisit ||
    observation.outcome !== 'independentSuccess' ||
    observation.ordinal <= state.lastSettledOrdinal ||
    state.reviewStage === null ||
    state.nextReviewDay === null ||
    observation.input.coarseDay < state.nextReviewDay
  )
    return snapshot;
  const reviewStage = Math.min(3, state.reviewStage + 1) as 1 | 2 | 3;
  const nextReviewDay =
    observation.input.coarseDay + policy.reviewIntervals[reviewStage];
  return freezeSnapshot({
    ...snapshot,
    lastSettledReviewSessionOrdinal: observation.input.sessionOrdinal,
    concepts: {
      ...snapshot.concepts,
      [concept]: {
        ...state,
        reviewStage,
        nextReviewDay,
        lastSettledOrdinal: observation.ordinal,
        reviewDue: false,
      },
    },
  });
}

export function immediateSyntheticSupportChoices(
  snapshot: SyntheticSnapshot,
  concept: string,
): readonly ('easier' | 'anotherRepresentation' | 'workedExample' | 'stop')[] {
  if (!supportedSnapshot(snapshot)) return Object.freeze([]);
  const recent = getConceptState(snapshot, concept).observations.slice(-2);
  return recent.length === 2 &&
    recent.every(
      (item) =>
        item.outcome === 'unsuccessful' || item.input.mathematicalHintTier > 0,
    )
    ? Object.freeze([
        'easier',
        'anotherRepresentation',
        'workedExample',
        'stop',
      ] as const)
    : Object.freeze([]);
}
