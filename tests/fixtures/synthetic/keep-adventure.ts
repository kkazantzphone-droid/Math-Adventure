/** Deliberately authored synthetic badge histories for backup/restore proof.
 * They exercise the real application session over the test-only repository;
 * they are never learner data, trajectories or a validated progression. */
import {
  createSyntheticLoopSession,
  prepareSyntheticLoopAnswer,
  syntheticLoopCodec,
  syntheticLoopRecordId,
  syntheticLoopTaskSeed,
} from '../../../src/application/synthetic-loop';
import type {
  LoopAnswerRequest,
  LoopFamilyId,
  SyntheticLoopRecord,
} from '../../../src/application/synthetic-loop';
import { createChapterTask } from '../../../src/application/growing-world';
import { submitFamilyProof } from '../../../src/application/family-proof';
import type { SyntheticProfileId } from '../../../src/domain/adaptation/types';
import {
  chapterEvidence,
  createChapterReplay,
} from '../../../src/domain/growing-world/content';
import type { ChapterFamilyId } from '../../../src/domain/growing-world/content';
import { proofEvidence } from '../../../src/domain/families/proof-evidence';
import {
  createProofReplay,
  LENGTH_UNIT_ID,
} from '../../../src/domain/families/proofs';
import type { ProofFamilyId } from '../../../src/domain/families/proofs';
import type { StructuredAnswer } from '../../../src/domain/puzzles/contracts';
import type { ReplayDescriptor } from '../../../src/domain/replay/descriptor';
import { createSyntheticRepository } from '../../fakes/synthetic-repository';

export function value<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string } },
): T {
  if (!result.ok)
    throw new Error(`Synthetic backup fixture: ${result.error.code}`);
  return result.value;
}

/** Answer operations use the app's `synthetic-` + UUID shape; evidence IDs
 * derived from them are the only shape a backup may carry. */
export const answerOperation = (index: number) =>
  `synthetic-00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;

/** The app's own per-profile task seeds, skipping repeated semantic cases so
 * each scripted answer is a distinct relationship (fixture selection only). */
function seeds(
  profile: SyntheticProfileId,
  family: ProofFamilyId | ChapterFamilyId,
  count: number,
): string[] {
  const found = new Map<string, string>();
  for (let ordinal = 0; ordinal < 400 && found.size < count; ordinal++) {
    const candidate = value(
      syntheticLoopTaskSeed(profile, family as LoopFamilyId, ordinal),
    );
    const fingerprint =
      family === 'number.addition' ||
      family === 'geometry.quadrilateral' ||
      family === 'measurement.unit-length'
        ? value(proofEvidence(value(createProofReplay(family, candidate))))
            .fingerprint
        : value(chapterEvidence(value(createChapterReplay(family, candidate))))
            .fingerprint;
    if (!found.has(fingerprint)) found.set(fingerprint, candidate);
  }
  if (found.size < count)
    throw new Error('Synthetic backup fixture: too few distinct cases');
  return [...found.values()];
}

function exact(answer: number): StructuredAnswer {
  return {
    kind: 'exactValue',
    value: {
      schema: 'rational-v1',
      numerator: String(answer),
      denominator: '1',
    },
  };
}

function length(answer: number): StructuredAnswer {
  return {
    kind: 'quantity',
    quantity: {
      schema: 'quantity-v1',
      kind: 'exact',
      magnitude: {
        schema: 'rational-v1',
        numerator: String(answer),
        denominator: '1',
      },
      unitId: LENGTH_UNIT_ID,
      dimension: 'length',
    },
  } as StructuredAnswer;
}

/** Fixture generation only: search the finite answer set for the regenerated
 * truth. Assertions use independent expectations, never this helper. */
function legacyAnswer(
  family: ProofFamilyId,
  replay: ReplayDescriptor,
  correct: boolean,
) {
  const build = family === 'measurement.unit-length' ? length : exact;
  for (let candidate = 0; candidate <= 10; candidate++) {
    const answer = build(candidate);
    if (value(submitFamilyProof(replay, answer)).correct === correct)
      return answer;
  }
  throw new Error('Synthetic backup fixture: no legacy answer');
}

/** Independent integer relationships for the chosen chapter families. */
function chapterAnswer(task: ReturnType<typeof chapter>['task']): number {
  switch (task.kind) {
    case 'makeTen':
      return 10 - task.first;
    case 'missingPart':
      return task.total - task.known;
    case 'equalGroups':
      return task.groups * task.each;
    default:
      throw new Error('Synthetic backup fixture: unsupported chapter task');
  }
}

function chapter(family: ChapterFamilyId, seedHex: string) {
  return value(createChapterTask(family, seedHex));
}

function request(
  replay: ReplayDescriptor,
  answer: StructuredAnswer,
  options: Partial<LoopAnswerRequest> = {},
): LoopAnswerRequest {
  return {
    replay,
    answer,
    mathematicalHintTier: 0,
    meaningfulAttempts: 1,
    solutionExposed: false,
    accessibilitySupports: [],
    accessible: true,
    playMode: 'practice',
    coarseDay: 100,
    clockCertain: false,
    revisit: false,
    ...options,
  };
}

export interface SyntheticBackupWorld {
  readonly star: SyntheticLoopRecord;
  readonly triangle: SyntheticLoopRecord;
  /** The open Star help context: tier 3 was requested before any answer. */
  readonly openHelpReplay: ReplayDescriptor;
  readonly openHelpAnswer: StructuredAnswer;
}

/** Scripted expectations from the documented rules (distinct cases; help or a
 * retry makes support; a worked tier exposes the solution), not from code. */
export const SYNTHETIC_BACKUP_SCRIPT = Object.freeze({
  star: {
    legacyIndependent: 3,
    legacySupported: 1,
    chapterIndependent: 1,
    chapterSupported: 1,
    chapterWorked: 1,
    completed: 7,
    sessionOrdinal: 2,
  },
  triangle: {
    independent: 2,
    unsuccessful: 1,
    completed: 3,
    sessionOrdinal: 1,
  },
});

export async function syntheticBackupWorld(): Promise<SyntheticBackupWorld> {
  const repository = value(createSyntheticRepository(syntheticLoopCodec));
  const star = createSyntheticLoopSession(repository);
  value(
    await star.selectProfile('SYNTHETIC-PLAYER-1', 'kma-star-create', {
      uiLocale: 'el-GR',
      instructionLocale: 'en-GB',
      numberSpeechLocale: 'el-GR',
    }),
  );
  value(await star.setMode('synthetic-policy', 'kma-star-guided'));
  const addition = seeds('SYNTHETIC-PLAYER-1', 'number.addition', 4);
  for (const [index, seedHex] of addition.entries()) {
    const replay = value(createProofReplay('number.addition', seedHex));
    value(
      await star.submit(
        request(
          replay,
          legacyAnswer('number.addition', replay, true),
          index === 3 ? { mathematicalHintTier: 1 } : {},
        ),
        answerOperation(index + 1),
      ),
    );
  }
  value(await star.endSession('kma-star-stop-1'));
  value(await star.startSession('kma-star-start-2'));
  value(await star.setActivity('number.make-ten', 'kma-star-make-ten'));
  const makeTen = seeds('SYNTHETIC-PLAYER-1', 'number.make-ten', 3).map(
    (seedHex) => chapter('number.make-ten', seedHex),
  );
  const [independent, retried, worked] = makeTen;
  if (!independent || !retried || !worked)
    throw new Error('Synthetic backup fixture: chapter cases');
  value(
    await star.submit(
      request(independent.replay, exact(chapterAnswer(independent.task))),
      answerOperation(10),
    ),
  );
  value(
    await star.submit(
      request(retried.replay, exact(chapterAnswer(retried.task)), {
        meaningfulAttempts: 2,
      }),
      answerOperation(11),
    ),
  );
  value(await star.requestChapterSupport(worked.replay, 3, 'kma-star-help-1'));
  value(
    await star.submit(
      // Underreported help is still raised to the saved worked tier.
      request(worked.replay, exact(chapterAnswer(worked.task))),
      answerOperation(12),
    ),
  );
  value(await star.setActivity('groups.equal', 'kma-star-groups'));
  const [openSeed] = seeds('SYNTHETIC-PLAYER-1', 'groups.equal', 1);
  const open = chapter('groups.equal', openSeed ?? '');
  value(await star.requestChapterSupport(open.replay, 3, 'kma-star-help-2'));

  const triangle = createSyntheticLoopSession(repository);
  value(
    await triangle.selectProfile('SYNTHETIC-PLAYER-2', 'kma-triangle-create', {
      uiLocale: 'de-DE',
      instructionLocale: 'de-DE',
      numberSpeechLocale: 'de-DE',
    }),
  );
  value(await triangle.setMode('synthetic-policy', 'kma-triangle-guided'));
  value(
    await triangle.setActivity(
      'measurement.unit-length',
      'kma-triangle-measure',
    ),
  );
  const measures = seeds('SYNTHETIC-PLAYER-2', 'measurement.unit-length', 3);
  for (const [index, seedHex] of measures.entries()) {
    const replay = value(createProofReplay('measurement.unit-length', seedHex));
    value(
      await triangle.submit(
        request(
          replay,
          legacyAnswer('measurement.unit-length', replay, index !== 0),
        ),
        answerOperation(20 + index),
      ),
    );
  }
  value(await triangle.setActivity('number.counting', 'kma-triangle-count'));
  value(await triangle.endSession('kma-triangle-stop-1'));
  const load = async (profile: SyntheticProfileId) =>
    value(await repository.load(value(syntheticLoopRecordId(profile)))).payload;
  return {
    star: await load('SYNTHETIC-PLAYER-1'),
    triangle: await load('SYNTHETIC-PLAYER-2'),
    openHelpReplay: open.replay,
    openHelpAnswer: exact(chapterAnswer(open.task)),
  };
}

/** A stored record whose answer was staged but never completed. */
export function withPendingAnswer(record: SyntheticLoopRecord, epoch = 0) {
  const family = record.selectedFamily;
  let answer: LoopAnswerRequest;
  if (family === 'groups.equal' || family === 'number.make-ten') {
    // A different relationship from the open help context.
    const [, seedHex] = seeds(record.profileId, family, 2);
    const task = chapter(family, seedHex ?? '');
    answer = request(task.replay, exact(chapterAnswer(task.task)));
  } else {
    const [seedHex] = seeds(record.profileId, 'number.addition', 5).slice(4);
    const replay = value(createProofReplay('number.addition', seedHex ?? ''));
    answer = request(replay, legacyAnswer('number.addition', replay, true));
  }
  const prepared = value(
    prepareSyntheticLoopAnswer(record, answer, answerOperation(99), 2, epoch),
  );
  if (prepared.kind !== 'pending')
    throw new Error('Synthetic backup fixture: expected pending answer');
  return value(
    syntheticLoopCodec.decode({ ...record, pending: prepared.pending }),
  );
}
