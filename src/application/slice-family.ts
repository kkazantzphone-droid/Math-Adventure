import { failure, success } from '../domain/core/result';
import type { DomainResult } from '../domain/core/result';
import {
  createSliceReplay,
  generateSlice,
  submitSlice,
} from '../domain/families/slice';
import type { SliceFamilyId, SliceTask } from '../domain/families/slice';
import type { SemanticHint } from '../domain/puzzles/contracts';
import type { ReplayDescriptor } from '../domain/replay/descriptor';

/** Presentation has no solution, expected answer, learner record or adaptation. */
export interface SliceFamilyPresentation {
  readonly familyId: SliceFamilyId;
  readonly replay: ReplayDescriptor;
  readonly task: SliceTask;
  readonly hint: SemanticHint;
}

export function createSliceFamily(
  familyId: SliceFamilyId,
  seedHex: string,
): DomainResult<SliceFamilyPresentation> {
  const replay = createSliceReplay(familyId, seedHex);
  if (!replay.ok) return replay;
  const generated = generateSlice(replay.value);
  if (!generated.ok) return generated;
  const hint = generated.value.hintPlan[1];
  return hint
    ? success({
        familyId,
        replay: generated.value.replay,
        task: generated.value.task,
        hint,
      })
    : failure('invalid_input');
}

export function submitSliceFamily(
  replay: unknown,
  answer: unknown,
): DomainResult<{ readonly correct: boolean }> {
  return submitSlice(replay, answer);
}
