import { dataRecord, hasKeys } from '../../domain/core/data';
import { ADAPTATION_POLICY } from '../../domain/adaptation/policy';
import { syntheticObservationFromInput } from '../../domain/adaptation/state';
import { proofEvidence } from '../../domain/families/proof-evidence';
import { PROOF_FAMILY_IDS } from '../../domain/families/proofs';
import {
  CHAPTER_FAMILY_IDS,
  chapterEvidence,
} from '../../domain/growing-world/content';
import { GROWING_JOURNEY_POLICY } from '../../domain/growing-world/journey';
import { chapterSupportTier } from '../../domain/growing-world/support';
import { structuredAnswerFromDto } from '../../domain/puzzles/contracts';
import { replayFromDto } from '../../domain/replay/descriptor';
import { submitFamilyProof } from '../family-proof';
import { submitSliceFamily } from '../slice-family';
import { validateChapterAnswer } from '../growing-world';
import { operationId, revision, storageEpoch } from '../core/integrity';
import { applicationFailure, applicationSuccess } from '../core/result';
import type { ApplicationResult } from '../core/result';
import { detachedData } from '../repository/validation';
import { GROWING_LOOP_SCHEMA, SYNTHETIC_LOOP_EVENT_LIMIT } from './types';
import type { LoopCompletion, LoopPending, SyntheticLoopRecord } from './types';

/** Regenerates truth before any write. No caller/UI correctness flag is accepted. */
export function prepareSyntheticLoopAnswer(
  record: SyntheticLoopRecord,
  request: unknown,
  operation: string,
  expectedRevision: number,
  epoch: number,
): ApplicationResult<
  | { readonly kind: 'pending'; readonly pending: LoopPending }
  | {
      readonly kind: 'sessionOnly';
      readonly completion: LoopCompletion;
      readonly exploratory: boolean;
    }
> {
  if (
    !record.sessionActive ||
    record.pending !== null ||
    !operationId(operation).ok ||
    operation.length > 80 ||
    !revision(expectedRevision).ok ||
    expectedRevision === 0 ||
    !storageEpoch(epoch).ok
  )
    return applicationFailure('invalid_command');
  const detached = detachedData(request);
  if (!detached.ok) return detached;
  const row = dataRecord(detached.value, 11);
  const keys = [
    'replay',
    'answer',
    'mathematicalHintTier',
    'meaningfulAttempts',
    'solutionExposed',
    'accessibilitySupports',
    'accessible',
    'playMode',
    'coarseDay',
    'clockCertain',
    'revisit',
  ];
  if (
    !row ||
    !hasKeys(row, keys) ||
    !['practice', 'exploration', 'numberLab'].includes(row.playMode as string)
  )
    return applicationFailure('invalid_command');
  const replay = replayFromDto(row.replay);
  const answer = structuredAnswerFromDto(row.answer);
  if (!replay.ok || !answer.ok) return applicationFailure('invalid_command');
  const oldFamily = PROOF_FAMILY_IDS.some(
    (family) => family === replay.value.familyId,
  );
  const chapterFamily = CHAPTER_FAMILY_IDS.find(
    (family) => family === replay.value.familyId,
  );
  if (
    chapterFamily &&
    (record.schema !== GROWING_LOOP_SCHEMA ||
      record.selectedFamily !== chapterFamily)
  )
    return applicationFailure('invalid_command');
  const verdict = chapterFamily
    ? validateChapterAnswer(replay.value, answer.value)
    : oldFamily
      ? submitFamilyProof(replay.value, answer.value)
      : submitSliceFamily(replay.value, answer.value);
  if (!verdict.ok) return applicationFailure('invalid_command');
  // Common contextual bounds use the already certified Phase 3B decoder, even
  // for manual/exploratory/new-family paths which never retain this probe.
  const probe = syntheticObservationFromInput({
    synthetic: true,
    id: `SYNTHETIC-${operation}`,
    concept: 'synthetic.context',
    representation: 'synthetic.context',
    taskFingerprint: 'synthetic.context',
    evidenceFingerprint: 'synthetic.context',
    sessionOrdinal: record.sessionOrdinal,
    coarseDay: row.coarseDay,
    clockCertain: row.clockCertain,
    mathematicalHintTier: row.mathematicalHintTier,
    meaningfulAttempts: row.meaningfulAttempts,
    solutionExposed: row.solutionExposed,
    accessible: row.accessible,
    correct: verdict.value.correct,
    accessibilitySupports: row.accessibilitySupports,
    mode: row.playMode,
    completion: 'completed',
    variationCase: true,
    revisit: row.revisit,
    policyVersion: ADAPTATION_POLICY.version,
    generatorVersion: replay.value.generatorVersion,
  });
  if (!probe) return applicationFailure('invalid_command');
  const persistedTier =
    record.schema === GROWING_LOOP_SCHEMA
      ? chapterSupportTier(record.chapterSupport, replay.value)
      : 0;
  const hintTier = Math.max(probe.mathematicalHintTier, persistedTier) as
    0 | 1 | 2 | 3;
  const solutionExposed =
    probe.solutionExposed || (!!chapterFamily && persistedTier === 3);
  if (row.playMode !== 'practice')
    return applicationSuccess({
      kind: 'sessionOnly',
      exploratory: true,
      completion: {
        operationId: operation,
        correct: verdict.value.correct,
        evidence: 'sessionOnly',
        reasonCode: 'nonPractice',
      },
    });
  if (
    record.mode === 'synthetic-policy' &&
    ((chapterFamily &&
      record.schema === GROWING_LOOP_SCHEMA &&
      record.chapterEvents.length >= GROWING_JOURNEY_POLICY.eventLimit) ||
      (oldFamily && record.events.length >= SYNTHETIC_LOOP_EVENT_LIMIT))
  )
    return applicationSuccess({
      kind: 'sessionOnly',
      exploratory: false,
      completion: {
        operationId: operation,
        correct: verdict.value.correct,
        evidence: 'sessionOnly',
        reasonCode: 'nonPractice',
      },
    });
  let observation: LoopPending['observation'] = null;
  let chapterObservation: LoopPending['chapterObservation'];
  if (record.mode === 'synthetic-policy' && chapterFamily) {
    const evidence = chapterEvidence(replay.value);
    if (!evidence.ok || record.schema !== GROWING_LOOP_SCHEMA)
      return applicationFailure('invalid_command');
    chapterObservation = {
      schema: 'growing-world-observation-v1',
      policyVersion: GROWING_JOURNEY_POLICY.version,
      id: probe.id,
      familyId: chapterFamily,
      ...evidence.value,
      sessionOrdinal: record.sessionOrdinal,
      correct: verdict.value.correct,
      mathematicalHintTier: hintTier,
      meaningfulAttempts: probe.meaningfulAttempts,
      solutionExposed,
      accessible: probe.accessible,
    };
  }
  if (record.mode === 'synthetic-policy' && oldFamily) {
    const evidence = proofEvidence(replay.value);
    if (!evidence.ok) return applicationFailure('invalid_command');
    observation = {
      kind: 'observation',
      selectionSeed: replay.value.seedHex,
      input: {
        ...probe,
        mathematicalHintTier: hintTier,
        solutionExposed,
        concept: evidence.value.concept,
        representation: evidence.value.representation,
        taskFingerprint: evidence.value.fingerprint,
        evidenceFingerprint: evidence.value.fingerprint,
        generatorVersion: evidence.value.generatorVersion,
      },
    };
  }
  return applicationSuccess({
    kind: 'pending',
    pending: {
      operationId: operation,
      expectedRevision,
      storageEpoch: epoch,
      correct: verdict.value.correct,
      evidenceKind:
        record.mode === 'manual'
          ? 'manual'
          : oldFamily
            ? 'candidate'
            : 'limitedEvidence',
      observation,
      ...(chapterObservation === undefined ? {} : { chapterObservation }),
    },
  });
}
