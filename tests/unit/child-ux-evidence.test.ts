import { describe, expect, it } from 'vitest';
import { createFamilyProof } from '../../src/application/family-proof';
import { createSliceFamily } from '../../src/application/slice-family';
import {
  initialSyntheticLoop,
  prepareSyntheticLoopAnswer,
  syntheticLoopTaskSeed,
} from '../../src/application/synthetic-loop';
import type {
  LoopAnswerRequest,
  LoopFamilyId,
  SyntheticLoopRecord,
} from '../../src/application/synthetic-loop';
import { completePendingSyntheticLoop } from '../../src/application/synthetic-loop/record';
import type { StructuredAnswer } from '../../src/domain/puzzles/contracts';
import {
  CHILD_RELATION_CHOICES,
  CHILD_SHAPE_CHOICES,
  childNumberAnswer,
} from '../../src/ui/synthetic-loop/child-answers';
import type { LoopPresentation } from '../../src/ui/synthetic-loop/TaskView';

function value<T>(result: {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: { readonly code: string };
}): T {
  if (!result.ok || result.value === undefined)
    throw new Error(`Synthetic child evidence: ${result.error?.code}`);
  return result.value;
}

function presentation(family: LoopFamilyId, ordinal: number): LoopPresentation {
  const seed = value(
    syntheticLoopTaskSeed('SYNTHETIC-PLAYER-1', family, ordinal),
  );
  return family === 'number.addition' ||
    family === 'geometry.quadrilateral' ||
    family === 'measurement.unit-length'
    ? value(createFamilyProof(family, seed))
    : value(createSliceFamily(family, seed));
}

/** Test oracle reads public task data; no generator solution/diagnostic predicates. */
function answerFor(presentation: LoopPresentation): StructuredAnswer {
  const task = presentation.task;
  if (task.kind === 'classifyGeometry') {
    const polygon = task.scene.objects.find(
      (object) => object.kind === 'polygon',
    );
    if (!polygon || polygon.kind !== 'polygon')
      throw new Error('Expected polygon');
    const corners = polygon.vertices.map((corner) => ({
      x: BigInt(corner.x.numerator),
      y: BigInt(corner.y.numerator),
    }));
    const edges = corners.map((corner, index) => {
      const next = corners[(index + 1) % 4];
      if (!next) throw new Error('Missing corner');
      return { x: next.x - corner.x, y: next.y - corner.y };
    });
    const right = edges.every((edge, index) => {
      const next = edges[(index + 1) % 4];
      return next && edge.x * next.x + edge.y * next.y === 0n;
    });
    const squares = edges.map((edge) => edge.x ** 2n + edge.y ** 2n);
    const key = !right
      ? 'parallelogram'
      : squares.every((square) => square === squares[0])
        ? 'square'
        : 'rectangle';
    const choice = CHILD_SHAPE_CHOICES.find((card) => card.key === key);
    if (!choice) throw new Error('Missing static shape card');
    return choice.answer;
  }
  if (task.kind === 'compareQuantities') {
    const expected =
      task.left.length < task.right.length
        ? 'comparison.less'
        : task.left.length > task.right.length
          ? 'comparison.greater'
          : 'comparison.equal';
    const card = CHILD_RELATION_CHOICES.find(
      (choice) =>
        choice.answer.kind === 'classification' &&
        choice.answer.classIds[0] === expected,
    );
    if (!card) throw new Error('Missing static relation card');
    return card.answer;
  }
  let expected: string;
  if (task.kind === 'evaluateExpression') {
    const root = task.expression.root;
    if (
      root.kind !== 'add' ||
      root.left.kind !== 'literal' ||
      root.right.kind !== 'literal'
    )
      throw new Error('Expected addition');
    expected = String(
      BigInt(root.left.value.numerator) + BigInt(root.right.value.numerator),
    );
  } else if (task.kind === 'measureGeometry') {
    const line = task.scene.objects.find((object) => object.kind === 'segment');
    if (!line || line.kind !== 'segment') throw new Error('Expected unit line');
    const dx = BigInt(line.end.x.numerator) - BigInt(line.start.x.numerator);
    const dy = BigInt(line.end.y.numerator) - BigInt(line.start.y.numerator);
    const difference = dx === 0n ? dy : dx;
    expected = String(difference < 0n ? -difference : difference);
  } else if (task.kind === 'numeralRecognition')
    expected = task.numeral.numerator;
  else if (task.kind === 'countItems') expected = String(task.items.length);
  else if (task.kind === 'subtractItems')
    expected = String(
      task.items.filter((item) => !task.removedIds.includes(item.id)).length,
    );
  else if (task.kind === 'missingNumber') {
    if (task.unknownPosition === 'total' && task.left && task.right)
      expected = String(
        BigInt(task.left.numerator) + BigInt(task.right.numerator),
      );
    else if (task.unknownPosition === 'left' && task.total && task.right)
      expected = String(
        BigInt(task.total.numerator) - BigInt(task.right.numerator),
      );
    else if (task.unknownPosition === 'right' && task.total && task.left)
      expected = String(
        BigInt(task.total.numerator) - BigInt(task.left.numerator),
      );
    else throw new Error('Invalid missing-number task');
  } else throw new Error('Unsupported numeric task');
  const answer = childNumberAnswer(task.kind, expected);
  if (!answer) throw new Error('Missing number card');
  return answer;
}

function request(
  task: LoopPresentation,
  extra: Partial<LoopAnswerRequest> = {},
): LoopAnswerRequest {
  return {
    replay: task.replay,
    answer: answerFor(task),
    mathematicalHintTier: 0,
    meaningfulAttempts: 1,
    solutionExposed: false,
    accessibilitySupports: [],
    accessible: task.task.kind !== 'classifyGeometry',
    playMode: 'practice',
    coarseDay: 100,
    clockCertain: true,
    revisit: false,
    ...extra,
  };
}

function completed(
  record: SyntheticLoopRecord,
  input: LoopAnswerRequest,
  ordinal = 0,
): SyntheticLoopRecord {
  const prepared = value(
    prepareSyntheticLoopAnswer(
      record,
      input,
      `child-answer-${ordinal}`,
      ordinal + 1,
      0,
    ),
  );
  if (prepared.kind !== 'pending')
    throw new Error('Expected explicit prepared answer');
  return value(
    completePendingSyntheticLoop({ ...record, pending: prepared.pending }),
  );
}

describe('child presentation uses unchanged conservative evidence boundaries', () => {
  it('repeated correct shape matching never credits inclusive classification mastery', () => {
    let record: SyntheticLoopRecord = {
      ...initialSyntheticLoop('SYNTHETIC-PLAYER-1'),
      mode: 'synthetic-policy',
    };
    for (let ordinal = 0; ordinal < 18; ordinal += 1) {
      const task = presentation('geometry.quadrilateral', ordinal);
      record = completed(record, request(task), ordinal);
      expect(record.lastCompletion).toMatchObject({
        correct: true,
        evidence: 'excluded',
        reasonCode: 'inaccessibleScope',
      });
      const geometry =
        record.derived.concepts['geometry.quadrilateral.attributes'];
      expect(geometry?.observations ?? []).toEqual([]);
      expect(geometry?.attainment).toBeFalsy();
      expect(geometry?.attained ?? 'Unseen').toBe('Unseen');
      expect(record.completedCount).toBe(ordinal + 1);
    }
    expect(record.events).toHaveLength(18);
    expect(
      record.events.every(
        (event) => event.kind === 'observation' && !event.input.accessible,
      ),
    ).toBe(true);
  });

  it('wrong shape cards and every visual-help tier also remain excluded, without penalizing shape mastery', () => {
    const task = presentation('geometry.quadrilateral', 0);
    const correct = answerFor(task);
    const wrong = CHILD_SHAPE_CHOICES.find(
      (choice) => JSON.stringify(choice.answer) !== JSON.stringify(correct),
    );
    if (!wrong) throw new Error('Expected a distinct wrong shape card');
    for (const mathematicalHintTier of [0, 1, 2, 3] as const) {
      const record = completed(
        {
          ...initialSyntheticLoop('SYNTHETIC-PLAYER-1'),
          mode: 'synthetic-policy',
        },
        request(task, { answer: wrong.answer, mathematicalHintTier }),
      );
      expect(record.lastCompletion).toMatchObject({
        correct: false,
        evidence: 'excluded',
        reasonCode: 'inaccessibleScope',
      });
      expect(
        record.derived.concepts['geometry.quadrilateral.attributes'],
      ).toBeUndefined();
    }
  });

  it('mathematical visual scaffolding does not masquerade as neutral accessibility support or independence', () => {
    const task = presentation('number.addition', 0);
    for (const mathematicalHintTier of [1, 2, 3] as const) {
      const record = completed(
        {
          ...initialSyntheticLoop('SYNTHETIC-PLAYER-1'),
          mode: 'synthetic-policy',
        },
        request(task, {
          mathematicalHintTier,
          accessibilitySupports: ['alternateControls'],
        }),
      );
      expect(record.lastCompletion).toMatchObject({
        correct: true,
        evidence: 'supportedSuccess',
        reasonCode: 'mathematicalSupport',
      });
      expect(
        record.derived.concepts['addition.part-whole']?.observations[0]?.input
          .mathematicalHintTier,
      ).toBe(mathematicalHintTier);
    }
    const exposed = completed(
      {
        ...initialSyntheticLoop('SYNTHETIC-PLAYER-1'),
        mode: 'synthetic-policy',
      },
      request(task, { mathematicalHintTier: 3, solutionExposed: true }),
    );
    expect(exposed.lastCompletion).toMatchObject({
      evidence: 'excluded',
      reasonCode: 'solutionExposed',
    });
  });

  it.each([
    'number.numeral',
    'number.counting',
    'number.comparison',
    'number.subtraction',
    'number.missing',
  ] as const)(
    '%s direct cards and nonvisual support cannot invent new-family mastery',
    (family) => {
      const task = presentation(family, 0);
      const record = completed(
        {
          ...initialSyntheticLoop('SYNTHETIC-PLAYER-1'),
          mode: 'synthetic-policy',
        },
        request(task, {
          accessibilitySupports: ['screenReader', 'alternateControls'],
        }),
      );
      expect(record.lastCompletion).toMatchObject({
        correct: true,
        evidence: 'limitedEvidence',
        reasonCode: null,
      });
      expect(record.events).toEqual([]);
      expect(record.derived.concepts).toEqual({});
      expect(record.derived.recommendation).toBeNull();
    },
  );

  it.each([
    'number.addition',
    'geometry.quadrilateral',
    'measurement.unit-length',
    'number.numeral',
    'number.counting',
    'number.comparison',
    'number.subtraction',
    'number.missing',
  ] as const)('%s child practice keeps manual/no-evidence honest', (family) => {
    const task = presentation(family, 0);
    const record = completed(
      initialSyntheticLoop('SYNTHETIC-PLAYER-1'),
      request(task, { mathematicalHintTier: 2 }),
    );
    expect(record.lastCompletion).toMatchObject({
      correct: true,
      evidence: 'manual',
      reasonCode: null,
    });
    expect(record.events).toEqual([]);
    expect(record.derived.concepts).toEqual({});
    expect(record.derived.recommendation).toBeNull();
  });

  it('child Explore preserves session-only exposure with no durable observation or completed count', () => {
    const initial: SyntheticLoopRecord = {
      ...initialSyntheticLoop('SYNTHETIC-PLAYER-1'),
      mode: 'synthetic-policy',
    };
    const prepared = value(
      prepareSyntheticLoopAnswer(
        initial,
        request(presentation('number.addition', 0), {
          playMode: 'exploration',
        }),
        'child-explore',
        1,
        0,
      ),
    );
    expect(prepared.kind).toBe('sessionOnly');
    if (prepared.kind !== 'sessionOnly')
      throw new Error('Expected unscored Explore');
    expect(prepared.completion).toMatchObject({
      correct: true,
      evidence: 'sessionOnly',
      reasonCode: 'nonPractice',
    });
    expect(initial.events).toEqual([]);
    expect(initial.completedCount).toBe(0);
  });
});
