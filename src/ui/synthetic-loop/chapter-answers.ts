import type { ChapterTask } from '../../application/growing-world';
import { identifier } from '../../domain/core/identifiers';
import type { StructuredAnswer } from '../../domain/puzzles/contracts';

/** Public response bounds, independent of the expected answer. */
export function chapterAnswerMaximum(task: ChapterTask): number {
  return task.kind === 'makeTen' || task.kind === 'missingGroup'
    ? 10
    : task.kind === 'missingPart'
      ? 20
      : task.kind === 'squareSide'
        ? 6
        : 25;
}

/** The same bounded DTO for compact and original direct-number controls. */
export function chapterNumberAnswer(
  task: ChapterTask,
  value: number,
): StructuredAnswer | null {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > chapterAnswerMaximum(task)
  )
    return null;
  const rational = {
    schema: 'rational-v1' as const,
    numerator: String(value),
    denominator: '1',
  };
  if (task.kind !== 'arrayArea') return { kind: 'exactValue', value: rational };
  const unit = identifier('unit', task.unitId);
  return unit.ok
    ? {
        kind: 'quantity',
        quantity: {
          schema: 'quantity-v1',
          kind: 'exact',
          magnitude: rational,
          unitId: unit.value,
          dimension: 'area',
        },
      }
    : null;
}
