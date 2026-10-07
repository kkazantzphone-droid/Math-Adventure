import { dataArray, dataRecord, hasKeys } from '../../domain/core/data';
import { createPhase2EvidenceCatalog } from '../../domain/adaptation/catalog';
import { ADAPTATION_POLICY } from '../../domain/adaptation/policy';
import {
  applySyntheticObservation,
  checkpointSyntheticSession,
  emptySyntheticSnapshot,
  syntheticObservationFromInput,
} from '../../domain/adaptation/state';
import {
  emptySelectionMemory,
  recommendSynthetic,
  recordSyntheticScoredTask,
} from '../../domain/adaptation/selection';
import { SYNTHETIC_PROFILE_IDS } from '../../domain/adaptation/types';
import type { SyntheticProfileId } from '../../domain/adaptation/types';
import { parseSeed } from '../../domain/random/xoshiro';
import { PROOF_FAMILY_IDS } from '../../domain/families/proofs';
import { SLICE_FAMILY_IDS } from '../../domain/families/slice';
import { canonicalize } from '../../domain/replay/canonical';
import { operationId, revision, storageEpoch } from '../core/integrity';
import { applicationFailure, applicationSuccess } from '../core/result';
import type { ApplicationResult } from '../core/result';
import type { RecordCodec } from '../ports/repository';
import { detachedData } from '../repository/validation';
import { SYNTHETIC_LOOP_EVENT_LIMIT, SYNTHETIC_LOOP_SCHEMA } from './types';
import type {
  LoopDerivedState,
  LoopEvidenceEvent,
  LoopPending,
  LoopPreferences,
  SyntheticLoopRecord,
} from './types';

const catalog = createPhase2EvidenceCatalog([
  {
    familyId: 'number.addition',
    maximum: 5,
    coverage: 'singleRepresentationCandidate',
  },
  {
    familyId: 'geometry.quadrilateral',
    maximum: 3,
    coverage: 'singleRepresentationCandidate',
  },
  {
    familyId: 'measurement.unit-length',
    maximum: 8,
    coverage: 'singleRepresentationCandidate',
  },
]);
if (!catalog.ok) throw new Error('Synthetic catalog constant invalid');
export const SYNTHETIC_LOOP_CATALOG = catalog.value;
const selectionCatalog = catalog.value.scopes.map((scope) => ({
  concept: scope.conceptId,
  prerequisiteReady: true,
  generationAvailable: true,
}));

function boundedOrdinal(input: unknown): input is number {
  return (
    typeof input === 'number' &&
    Number.isSafeInteger(input) &&
    input >= 1 &&
    input <= 1_000_000
  );
}

function equalData(left: unknown, right: unknown): boolean {
  const a = canonicalize(left),
    b = canonicalize(right);
  return a.ok && b.ok && a.value === b.value;
}

function freezeData<T>(input: T): T {
  if (input !== null && typeof input === 'object') {
    for (const nested of Object.values(input)) freezeData(nested);
    Object.freeze(input);
  }
  return input;
}

export function loopPreferencesFromInput(
  input: unknown,
): LoopPreferences | undefined {
  const row = dataRecord(input, 3);
  const keys = ['uiLocale', 'instructionLocale', 'numberSpeechLocale'];
  const locales = [
    'el-GR',
    'en-GB',
    'de-DE',
    'fr-FR',
    'es-ES',
    'it-IT',
    'pt-PT',
  ];
  if (
    !row ||
    !hasKeys(row, keys) ||
    keys.some((key) => !locales.includes(row[key] as string))
  )
    return undefined;
  return row as unknown as LoopPreferences;
}

function eventFromInput(input: unknown): LoopEvidenceEvent | undefined {
  const row = dataRecord(input, 3);
  if (!row) return undefined;
  if (
    row.kind === 'checkpoint' &&
    hasKeys(row, ['kind', 'sessionOrdinal']) &&
    boundedOrdinal(row.sessionOrdinal)
  )
    return { kind: 'checkpoint', sessionOrdinal: row.sessionOrdinal };
  if (
    row.kind !== 'observation' ||
    !hasKeys(row, ['kind', 'input', 'selectionSeed']) ||
    typeof row.selectionSeed !== 'string'
  )
    return undefined;
  const observation = syntheticObservationFromInput(row.input);
  const seed = parseSeed(row.selectionSeed);
  if (
    !observation ||
    !seed.ok ||
    observation.mode !== 'practice' ||
    observation.completion !== 'completed' ||
    observation.policyVersion !== ADAPTATION_POLICY.version ||
    observation.sessionOrdinal === 0 ||
    row.selectionSeed !== row.selectionSeed.toLowerCase()
  )
    return undefined;
  return freezeData({
    kind: 'observation',
    input: observation,
    selectionSeed: row.selectionSeed,
  });
}

/** Replay the unchanged named candidate engine, including frozen classifications.
 * The log holds scoped observations/checkpoints, never submitted answers/tasks.
 */
export function deriveSyntheticLoop(
  profileId: SyntheticProfileId,
  events: readonly LoopEvidenceEvent[],
) {
  let snapshot = emptySyntheticSnapshot(profileId);
  let memory = emptySelectionMemory(snapshot);
  let recommendation: LoopDerivedState['recommendation'] = null;
  let lastSession = 0;
  const observationIds = new Set<string>();
  for (const event of events) {
    if (event.kind === 'checkpoint') {
      if (event.sessionOrdinal < lastSession)
        return applicationFailure('invalid_record');
      lastSession = event.sessionOrdinal;
      snapshot = checkpointSyntheticSession(snapshot);
      continue;
    }
    if (
      event.input.sessionOrdinal < lastSession ||
      observationIds.has(event.input.id)
    )
      return applicationFailure('invalid_record');
    lastSession = event.input.sessionOrdinal;
    observationIds.add(event.input.id);
    const result = applySyntheticObservation(
      snapshot,
      event.input,
      SYNTHETIC_LOOP_CATALOG,
    );
    if (!result.ok || result.exactRetry)
      return applicationFailure('invalid_record');
    snapshot = result.snapshot;
    if (result.observation.outcome !== 'excluded')
      memory = recordSyntheticScoredTask(memory, event.input.concept);
    const offered = recommendSynthetic({
      snapshot,
      memory,
      evidenceCatalog: SYNTHETIC_LOOP_CATALOG,
      catalog: selectionCatalog,
      intent: { kind: 'automatic' },
      policyVersion: ADAPTATION_POLICY.version,
      coarseDay: event.input.coarseDay,
      clockCertain: event.input.clockCertain,
      sessionOrdinal: event.input.sessionOrdinal,
      seed: event.selectionSeed,
    });
    if (
      offered.reasonCode === 'invalidSelectionInput' ||
      offered.reasonCode === 'unsupportedPolicy'
    )
      return applicationFailure('invalid_record');
    snapshot = offered.snapshot;
    memory = offered.memory;
    const {
      snapshot: omittedSnapshot,
      memory: omittedMemory,
      ...metadata
    } = offered;
    void omittedSnapshot;
    void omittedMemory;
    recommendation = metadata;
  }
  const derived: LoopDerivedState = {
    policyVersion: snapshot.policyVersion,
    concepts: snapshot.concepts,
    diagnostics: snapshot.diagnostics,
    nextOrdinal: snapshot.nextOrdinal,
    lastSessionOrdinal: snapshot.lastSessionOrdinal,
    lastSettledReviewSessionOrdinal: snapshot.lastSettledReviewSessionOrdinal,
    clockCertain: snapshot.clockCertain,
    lastTrustedDay: snapshot.lastTrustedDay,
    memory,
    recommendation,
  };
  return applicationSuccess({ derived, snapshot });
}

export function initialSyntheticLoop(
  profileId: SyntheticProfileId,
): SyntheticLoopRecord {
  const derived = deriveSyntheticLoop(profileId, []);
  if (!derived.ok) throw new Error('Synthetic initial state invalid');
  return freezeData({
    schema: SYNTHETIC_LOOP_SCHEMA,
    marker: 'synthetic-only',
    profileId,
    mode: 'manual',
    sessionOrdinal: 1,
    sessionActive: true,
    preferences: {
      uiLocale: 'el-GR',
      instructionLocale: 'el-GR',
      numberSpeechLocale: 'el-GR',
    },
    completedCount: 0,
    taskOrdinal: 0,
    selectedFamily: 'number.addition',
    events: [],
    derived: derived.value.derived,
    pending: null,
    lastCompletion: null,
  });
}

function pendingFromInput(
  input: unknown,
  record: SyntheticLoopRecord,
): LoopPending | undefined {
  const row = dataRecord(input, 7);
  if (
    !row ||
    !hasKeys(row, [
      'operationId',
      'expectedRevision',
      'storageEpoch',
      'correct',
      'evidenceKind',
      'observation',
    ]) ||
    typeof row.correct !== 'boolean' ||
    typeof row.operationId !== 'string' ||
    row.operationId.length > 80 ||
    !operationId(row.operationId).ok ||
    !revision(row.expectedRevision).ok ||
    row.expectedRevision === 0 ||
    !storageEpoch(row.storageEpoch).ok ||
    !record.sessionActive
  )
    return undefined;
  if (
    row.evidenceKind !== 'candidate' &&
    row.evidenceKind !== 'manual' &&
    row.evidenceKind !== 'limitedEvidence'
  )
    return undefined;
  const observation =
    row.observation === null ? null : eventFromInput(row.observation);
  if (observation !== null && observation?.kind !== 'observation')
    return undefined;
  if (row.evidenceKind === 'candidate') {
    if (
      !observation ||
      record.mode !== 'synthetic-policy' ||
      observation.input.id !== `SYNTHETIC-${row.operationId}` ||
      observation.input.sessionOrdinal !== record.sessionOrdinal ||
      observation.input.correct !== row.correct
    )
      return undefined;
    if (
      !deriveSyntheticLoop(record.profileId, [...record.events, observation]).ok
    )
      return undefined;
  } else if (
    observation !== null ||
    (row.evidenceKind === 'manual') !== (record.mode === 'manual')
  )
    return undefined;
  return row as unknown as LoopPending;
}

export const syntheticLoopCodec: RecordCodec<SyntheticLoopRecord> = {
  schema: SYNTHETIC_LOOP_SCHEMA,
  decode(input: unknown): ApplicationResult<SyntheticLoopRecord> {
    const detached = detachedData(input);
    if (!detached.ok) return detached;
    const row = dataRecord(detached.value, 14);
    const keys = [
      'schema',
      'marker',
      'profileId',
      'mode',
      'sessionOrdinal',
      'sessionActive',
      'preferences',
      'completedCount',
      'taskOrdinal',
      'selectedFamily',
      'events',
      'derived',
      'pending',
      'lastCompletion',
    ];
    if (
      !row ||
      !hasKeys(row, keys) ||
      row.schema !== SYNTHETIC_LOOP_SCHEMA ||
      row.marker !== 'synthetic-only' ||
      !SYNTHETIC_PROFILE_IDS.includes(row.profileId as SyntheticProfileId) ||
      (row.mode !== 'manual' && row.mode !== 'synthetic-policy') ||
      !boundedOrdinal(row.sessionOrdinal) ||
      typeof row.sessionActive !== 'boolean' ||
      typeof row.completedCount !== 'number' ||
      !Number.isSafeInteger(row.completedCount) ||
      row.completedCount < 0 ||
      row.completedCount > 1_000_000 ||
      typeof row.taskOrdinal !== 'number' ||
      !Number.isSafeInteger(row.taskOrdinal) ||
      row.taskOrdinal < row.completedCount ||
      row.taskOrdinal > 1_000_000 ||
      ![...PROOF_FAMILY_IDS, ...SLICE_FAMILY_IDS].some(
        (family) => family === row.selectedFamily,
      ) ||
      !loopPreferencesFromInput(row.preferences)
    )
      return applicationFailure('invalid_record');
    const rawEvents = dataArray(row.events, SYNTHETIC_LOOP_EVENT_LIMIT);
    if (!rawEvents) return applicationFailure('invalid_record');
    const events: LoopEvidenceEvent[] = [];
    for (const raw of rawEvents) {
      const event = eventFromInput(raw);
      if (
        !event ||
        (event.kind === 'checkpoint'
          ? event.sessionOrdinal
          : event.input.sessionOrdinal) > row.sessionOrdinal
      )
        return applicationFailure('invalid_record');
      events.push(event);
    }
    if (
      events.filter((event) => event.kind === 'observation').length >
      row.completedCount
    )
      return applicationFailure('invalid_record');
    const derived = deriveSyntheticLoop(
      row.profileId as SyntheticProfileId,
      events,
    );
    if (!derived.ok || !equalData(row.derived, derived.value.derived))
      return applicationFailure('invalid_record');
    const record = row as unknown as SyntheticLoopRecord;
    if (
      record.pending !== null &&
      (!pendingFromInput(record.pending, record) ||
        (record.pending.observation !== null &&
          events.length >= SYNTHETIC_LOOP_EVENT_LIMIT))
    )
      return applicationFailure('invalid_record');
    if (record.lastCompletion !== null) {
      const completion = dataRecord(record.lastCompletion, 4);
      const evidence = [
        'manual',
        'limitedEvidence',
        'sessionOnly',
        'independentSuccess',
        'supportedSuccess',
        'unsuccessful',
        'excluded',
      ];
      const reasons = [
        'independent',
        'mathematicalSupport',
        'unsuccessful',
        'nonPractice',
        'notCompleted',
        'inaccessibleScope',
        'solutionExposed',
        'immediateDuplicate',
        'retrievalLimit',
        'clockUncertain',
      ];
      if (
        !completion ||
        !hasKeys(completion, [
          'operationId',
          'correct',
          'evidence',
          'reasonCode',
        ]) ||
        !operationId(completion.operationId).ok ||
        typeof completion.correct !== 'boolean' ||
        !evidence.includes(completion.evidence as string) ||
        (completion.reasonCode !== null &&
          !reasons.includes(completion.reasonCode as string)) ||
        record.completedCount === 0 ||
        record.pending?.operationId === completion.operationId
      )
        return applicationFailure('invalid_record');
    }
    if (
      record.lastCompletion &&
      !['manual', 'limitedEvidence'].includes(record.lastCompletion.evidence)
    ) {
      const observation = derived.value.snapshot.receipts.find(
        (receipt) =>
          receipt.id === `SYNTHETIC-${record.lastCompletion?.operationId}`,
      )?.observation;
      if (
        !observation ||
        observation.input.correct !== record.lastCompletion.correct ||
        observation.outcome !== record.lastCompletion.evidence ||
        observation.reasonCode !== record.lastCompletion.reasonCode
      )
        return applicationFailure('invalid_record');
    } else if (
      record.lastCompletion?.reasonCode !== null &&
      record.lastCompletion !== null
    )
      return applicationFailure('invalid_record');
    return applicationSuccess(freezeData(record));
  },
};

/** Terminal payload is deterministic and contains no journal/raw answer. */
export function completePendingSyntheticLoop(
  record: SyntheticLoopRecord,
): ApplicationResult<SyntheticLoopRecord> {
  const pending = record.pending;
  if (
    !pending ||
    record.completedCount >= 1_000_000 ||
    record.taskOrdinal >= 1_000_000
  )
    return applicationFailure('invalid_command');
  const events = pending.observation
    ? [...record.events, pending.observation]
    : record.events;
  const derived = deriveSyntheticLoop(record.profileId, events);
  if (!derived.ok) return derived;
  const observation = pending.observation
    ? derived.value.snapshot.receipts.find(
        (receipt) => receipt.id === pending.observation?.input.id,
      )?.observation
    : undefined;
  if (pending.observation && !observation)
    return applicationFailure('invalid_record');
  const payload: SyntheticLoopRecord = {
    ...record,
    events,
    derived: derived.value.derived,
    pending: null,
    completedCount: record.completedCount + 1,
    taskOrdinal: record.taskOrdinal + 1,
    lastCompletion: {
      operationId: pending.operationId,
      correct: pending.correct,
      evidence:
        observation?.outcome ??
        (pending.evidenceKind === 'manual' ? 'manual' : 'limitedEvidence'),
      reasonCode: observation?.reasonCode ?? null,
    },
  };
  return syntheticLoopCodec.decode(payload);
}
