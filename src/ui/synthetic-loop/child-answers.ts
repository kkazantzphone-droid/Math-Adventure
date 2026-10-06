import { identifier } from '../../domain/core/identifiers';
import { LENGTH_UNIT_ID } from '../../domain/families/proofs';
import type { StructuredAnswer } from '../../domain/puzzles/contracts';
import type { LoopPresentation } from './TaskView';

/** Fixed choice translations only. The unchanged domain judges every answer. */
function freezeChoices<
  T extends readonly {
    readonly key: string;
    readonly answer: {
      readonly kind: 'classification';
      readonly classIds: readonly string[];
    };
  }[],
>(choices: T): T {
  for (const choice of choices) {
    Object.freeze(choice.answer.classIds);
    Object.freeze(choice.answer);
    Object.freeze(choice);
  }
  return Object.freeze(choices);
}

export const CHILD_SHAPE_CHOICES = freezeChoices([
  {
    key: 'square',
    answer: {
      kind: 'classification',
      classIds: [
        'geometry.parallelogram',
        'geometry.rectangle',
        'geometry.square',
      ],
    },
  },
  {
    key: 'rectangle',
    answer: {
      kind: 'classification',
      classIds: ['geometry.parallelogram', 'geometry.rectangle'],
    },
  },
  {
    key: 'parallelogram',
    answer: { kind: 'classification', classIds: ['geometry.parallelogram'] },
  },
] as const satisfies readonly {
  readonly key: string;
  readonly answer: StructuredAnswer;
}[]);

export const CHILD_RELATION_CHOICES = freezeChoices([
  {
    key: 'comparison.less',
    answer: { kind: 'classification', classIds: ['comparison.less'] },
  },
  {
    key: 'comparison.equal',
    answer: { kind: 'classification', classIds: ['comparison.equal'] },
  },
  {
    key: 'comparison.greater',
    answer: { kind: 'classification', classIds: ['comparison.greater'] },
  },
] as const satisfies readonly {
  readonly key: string;
  readonly answer: StructuredAnswer;
}[]);

export function childNumberAnswer(
  kind: LoopPresentation['task']['kind'],
  value: string,
): StructuredAnswer | null {
  if (!/^(?:0|[1-9]|10)$/.test(value)) return null;
  const number = Number(value);
  const maximum =
    kind === 'evaluateExpression' || kind === 'missingNumber'
      ? 10
      : kind === 'measureGeometry'
        ? 8
        : 5;
  if (
    ![
      'evaluateExpression',
      'measureGeometry',
      'numeralRecognition',
      'countItems',
      'subtractItems',
      'missingNumber',
    ].includes(kind) ||
    number > maximum ||
    (kind === 'measureGeometry' && number === 0)
  )
    return null;
  const rational = {
    schema: 'rational-v1' as const,
    numerator: value,
    denominator: '1',
  };
  if (kind !== 'measureGeometry')
    return { kind: 'exactValue', value: rational };
  const unit = identifier('unit', LENGTH_UNIT_ID);
  return unit.ok
    ? {
        kind: 'quantity',
        quantity: {
          schema: 'quantity-v1',
          kind: 'exact',
          magnitude: rational,
          unitId: unit.value,
          dimension: 'length',
        },
      }
    : null;
}
