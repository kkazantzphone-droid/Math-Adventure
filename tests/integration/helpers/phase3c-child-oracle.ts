// Test-only answer model over public semantic tasks. No production generator,
// validator, expected-answer contract, rendering projection or seed is consulted.
import type { LoopPresentation } from '../../../src/ui/synthetic-loop/TaskView';
import {
  countCombinedTokens,
  countUnitIntervals,
  quadrilateralClasses,
} from '../../oracle/family-proof';

export const CHILD_FAMILIES = [
  'number.addition',
  'geometry.quadrilateral',
  'measurement.unit-length',
  'number.numeral',
  'number.counting',
  'number.comparison',
  'number.subtraction',
  'number.missing',
] as const;

export type ChildAnswerKey =
  | `${number}`
  | 'comparison.less'
  | 'comparison.equal'
  | 'comparison.greater'
  | 'square'
  | 'rectangle'
  | 'parallelogram';

function boundedInteger(value: {
  readonly numerator: string;
  readonly denominator: string;
}): number {
  if (value.denominator !== '1' || !/^(?:0|[1-9]|10)$/.test(value.numerator))
    throw new Error('Unexpected bounded public integer');
  return Number(value.numerator);
}

function integerCoordinate(value: {
  readonly numerator: string;
  readonly denominator: string;
}): number {
  if (
    value.denominator !== '1' ||
    !/^(?:0|-?[1-9][0-9]*)$/.test(value.numerator)
  )
    throw new Error('Unexpected public coordinate spelling');
  const coordinate = Number(value.numerator);
  if (!Number.isSafeInteger(coordinate))
    throw new Error('Unexpected public coordinate bound');
  return coordinate;
}

export function childAnswerKey(presentation: LoopPresentation): ChildAnswerKey {
  const task = presentation.task;
  switch (task.kind) {
    case 'evaluateExpression': {
      const root = task.expression.root;
      if (
        root.kind !== 'add' ||
        root.left.kind !== 'literal' ||
        root.right.kind !== 'literal'
      )
        throw new Error('Unexpected public addition expression');
      return String(
        countCombinedTokens(
          boundedInteger(root.left.value),
          boundedInteger(root.right.value),
        ),
      ) as `${number}`;
    }
    case 'classifyGeometry': {
      const polygon = task.scene.objects.find(
        (object) => object.id === task.objectId,
      );
      if (!polygon || polygon.kind !== 'polygon')
        throw new Error('Public polygon missing');
      const classes = quadrilateralClasses(
        polygon.vertices.map((point) => ({
          x: integerCoordinate(point.x),
          y: integerCoordinate(point.y),
        })),
      );
      if (classes.includes('square')) return 'square';
      if (classes.includes('rectangle')) return 'rectangle';
      if (classes.includes('parallelogram')) return 'parallelogram';
      throw new Error('Unexpected bounded public quadrilateral');
    }
    case 'measureGeometry': {
      const segment = task.scene.objects.find(
        (object) => object.id === task.objectId,
      );
      if (!segment || segment.kind !== 'segment')
        throw new Error('Public unit segment missing');
      const length = countUnitIntervals(
        {
          x: integerCoordinate(segment.start.x),
          y: integerCoordinate(segment.start.y),
        },
        {
          x: integerCoordinate(segment.end.x),
          y: integerCoordinate(segment.end.y),
        },
      );
      if (length === undefined)
        throw new Error('Public unit segment is outside the independent model');
      return String(length) as `${number}`;
    }
    case 'numeralRecognition':
      return String(boundedInteger(task.numeral)) as `${number}`;
    case 'countItems':
      return String(task.items.reduce((count) => count + 1, 0)) as `${number}`;
    case 'compareQuantities': {
      const left = [...task.left],
        right = [...task.right];
      while (left.length && right.length) {
        left.pop();
        right.pop();
      }
      return left.length
        ? 'comparison.greater'
        : right.length
          ? 'comparison.less'
          : 'comparison.equal';
    }
    case 'subtractItems':
      return String(
        task.items.filter((item) => !task.removedIds.includes(item.id)).length,
      ) as `${number}`;
    case 'missingNumber': {
      const solutions: number[] = [];
      for (let candidate = 0; candidate <= 10; candidate++) {
        const left = task.left === null ? candidate : boundedInteger(task.left);
        const right =
          task.right === null ? candidate : boundedInteger(task.right);
        const total =
          task.total === null ? candidate : boundedInteger(task.total);
        const tokens = [
          ...Array.from({ length: left }, () => 1),
          ...Array.from({ length: right }, () => 1),
        ];
        if (tokens.length === total) solutions.push(candidate);
      }
      if (solutions.length !== 1 || solutions[0] === undefined)
        throw new Error('Expected one public finite-equation solution');
      return String(solutions[0]) as `${number}`;
    }
    case 'equation':
      throw new Error('Unimplemented public equation family');
  }
}

export function wrongChildAnswer(answer: ChildAnswerKey): ChildAnswerKey {
  if (
    answer === 'square' ||
    answer === 'rectangle' ||
    answer === 'parallelogram'
  )
    return answer === 'square' ? 'rectangle' : 'square';
  if (answer.startsWith('comparison.'))
    return answer === 'comparison.equal'
      ? 'comparison.less'
      : 'comparison.equal';
  return answer === '1' ? '2' : '1';
}
