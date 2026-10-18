import { success } from '../domain/core/result';
import type { DomainResult } from '../domain/core/result';
import {
  createChapterReplay,
  generateChapter,
  validateChapter,
} from '../domain/growing-world/content';
import type {
  ChapterFamilyId,
  ChapterTask,
} from '../domain/growing-world/content';
import type { ReplayDescriptor } from '../domain/replay/descriptor';

export {
  CHAPTER_FAMILY_IDS,
  deriveChapterHelp,
  isChapterFamilyId,
} from '../domain/growing-world/content';
export type {
  ChapterFamilyId,
  ChapterHelp,
  ChapterRepresentation,
  ChapterTask,
} from '../domain/growing-world/content';

/** No expected answer, private instance, observation or learner state escapes. */
export interface ChapterPresentation {
  readonly familyId: ChapterFamilyId;
  readonly replay: ReplayDescriptor;
  readonly task: ChapterTask;
}

export function createChapterTask(
  familyId: ChapterFamilyId,
  seedHex: string,
): DomainResult<ChapterPresentation> {
  const replay = createChapterReplay(familyId, seedHex);
  if (!replay.ok) return replay;
  const instance = generateChapter(replay.value);
  return instance.ok
    ? success({
        familyId,
        replay: instance.value.replay,
        task: instance.value.task,
      })
    : instance;
}

export function validateChapterAnswer(
  replay: unknown,
  answer: unknown,
): DomainResult<{ readonly correct: boolean }> {
  return validateChapter(replay, answer);
}
