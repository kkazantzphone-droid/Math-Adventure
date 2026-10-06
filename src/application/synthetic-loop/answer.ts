import { dataRecord, hasKeys } from '../../domain/core/data';
import { ADAPTATION_POLICY } from '../../domain/adaptation/policy';
import { syntheticObservationFromInput } from '../../domain/adaptation/state';
import { proofEvidence } from '../../domain/families/proof-evidence';
import { PROOF_FAMILY_IDS } from '../../domain/families/proofs';
import { structuredAnswerFromDto } from '../../domain/puzzles/contracts';
import { replayFromDto } from '../../domain/replay/descriptor';
import { submitFamilyProof } from '../family-proof';
import { submitSliceFamily } from '../slice-family';
import { operationId, revision, storageEpoch } from '../core/integrity';
import { applicationFailure, applicationSuccess } from '../core/result';
import type { ApplicationResult } from '../core/result';
import { detachedData } from '../repository/validation';
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
  | { readonly kind: 'sessionOnly'; readonly completion: LoopCompletion }
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
  const verdict = oldFamily
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
  if (row.playMode !== 'practice')
    return applicationSuccess({
      kind: 'sessionOnly',
      completion: {
        operationId: operation,
        correct: verdict.value.correct,
        evidence: 'sessionOnly',
        reasonCode: 'nonPractice',
      },
    });
  let observation: LoopPending['observation'] = null;
  if (record.mode === 'synthetic-policy' && oldFamily) {
    const evidence = proofEvidence(replay.value);
    if (!evidence.ok) return applicationFailure('invalid_command');
    observation = {
      kind: 'observation',
      selectionSeed: replay.value.seedHex,
      input: {
        ...probe,
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
    },
  });
}
