import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  createFamilyProof,
  submitFamilyProof,
} from '../../src/application/family-proof';
import {
  createSliceFamily,
  submitSliceFamily,
} from '../../src/application/slice-family';
import { syntheticLoopTaskSeed } from '../../src/application/synthetic-loop';
import type { LoopFamilyId } from '../../src/application/synthetic-loop';
import type { ExactPoint } from '../../src/domain/geometry/scene';
import type { RationalDto } from '../../src/domain/math/rational';
import { defaultLanguagePreferences } from '../../src/presentation/localisation';
import { ChildTaskView } from '../../src/ui/synthetic-loop/ChildTaskView';
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
    throw new Error(`Synthetic child contract: ${result.error?.code}`);
  return result.value;
}

function integer(dto: RationalDto): bigint {
  expect(dto.denominator).toBe('1');
  return BigInt(dto.numerator);
}

function point(dto: ExactPoint) {
  return { x: integer(dto.x), y: integer(dto.y) };
}

/** Independent exact public-coordinate oracle; no production geometry predicates. */
function shapeClasses(presentation: LoopPresentation): readonly string[] {
  const task = presentation.task;
  if (task.kind !== 'classifyGeometry') throw new Error('Expected geometry');
  const polygon = task.scene.objects.find(
    (object) => object.kind === 'polygon',
  );
  if (!polygon || polygon.kind !== 'polygon' || polygon.vertices.length !== 4)
    throw new Error('Expected bounded quadrilateral');
  const corners = polygon.vertices.map(point);
  const edges = corners.map((corner, index) => {
    const next = corners[(index + 1) % 4];
    if (!next) throw new Error('Missing corner');
    return { x: next.x - corner.x, y: next.y - corner.y };
  });
  const squares = edges.map((edge) => edge.x ** 2n + edge.y ** 2n);
  const allRight = edges.every((edge, index) => {
    const next = edges[(index + 1) % 4];
    return next && edge.x * next.x + edge.y * next.y === 0n;
  });
  const answer = ['geometry.parallelogram'];
  if (allRight) answer.push('geometry.rectangle');
  if (allRight && squares.every((square) => square === squares[0]))
    answer.push('geometry.square');
  return answer;
}

function presentation(family: LoopFamilyId, ordinal: number): LoopPresentation {
  const seed = value(
    syntheticLoopTaskSeed('SYNTHETIC-PLAYER-1', family, ordinal),
  );
  if (
    family === 'number.addition' ||
    family === 'geometry.quadrilateral' ||
    family === 'measurement.unit-length'
  )
    return value(createFamilyProof(family, seed));
  return value(createSliceFamily(family, seed));
}

/** Test-only varied words; does not replace the preserved workflow seed mapping. */
function variedGeometryPresentation(ordinal: number): LoopPresentation {
  const mask = (1n << 64n) - 1n;
  let state = BigInt(ordinal) + 0x243f6a8885a308d3n;
  const words: string[] = [];
  for (let word = 0; word < 4; word += 1) {
    state = (state + 0x9e3779b97f4a7c15n) & mask;
    let mixed = state;
    mixed = ((mixed ^ (mixed >> 30n)) * 0xbf58476d1ce4e5b9n) & mask;
    mixed = ((mixed ^ (mixed >> 27n)) * 0x94d049bb133111ebn) & mask;
    mixed ^= mixed >> 31n;
    words.push((mixed & 0xffffffffn).toString(16).padStart(8, '0'));
  }
  return value(createFamilyProof('geometry.quadrilateral', words.join('')));
}

function expectedNumber(presentation: LoopPresentation): string {
  const task = presentation.task;
  if (task.kind === 'evaluateExpression') {
    const root = task.expression.root;
    if (
      root.kind !== 'add' ||
      root.left.kind !== 'literal' ||
      root.right.kind !== 'literal'
    )
      throw new Error('Expected bounded addition');
    return String(integer(root.left.value) + integer(root.right.value));
  }
  if (task.kind === 'measureGeometry') {
    const segment = task.scene.objects.find(
      (object) => object.kind === 'segment',
    );
    if (!segment || segment.kind !== 'segment')
      throw new Error('Expected line');
    const start = point(segment.start),
      end = point(segment.end);
    const difference = start.x === end.x ? end.y - start.y : end.x - start.x;
    return String(difference < 0n ? -difference : difference);
  }
  if (task.kind === 'numeralRecognition') return task.numeral.numerator;
  if (task.kind === 'countItems') return String(task.items.length);
  if (task.kind === 'subtractItems')
    return String(
      task.items.filter((item) => !task.removedIds.includes(item.id)).length,
    );
  if (task.kind === 'missingNumber') {
    if (task.unknownPosition === 'total' && task.left && task.right)
      return String(integer(task.left) + integer(task.right));
    if (task.unknownPosition === 'left' && task.total && task.right)
      return String(integer(task.total) - integer(task.right));
    if (task.unknownPosition === 'right' && task.total && task.left)
      return String(integer(task.total) - integer(task.left));
  }
  throw new Error('Expected numeric child activity');
}

function render(
  task: LoopPresentation,
  extra: Partial<ComponentProps<typeof ChildTaskView>> = {},
): string {
  return renderToStaticMarkup(
    createElement(ChildTaskView, {
      task,
      preferences: {
        ...defaultLanguagePreferences,
        uiLocale: 'en-GB',
        instructionLocale: 'en-GB',
      },
      feedback: 'none',
      hintTier: 0,
      onAnswer: () => undefined,
      onHint: () => undefined,
      onRetry: () => undefined,
      ...extra,
    }),
  );
}

describe('independent direct child card contracts', () => {
  it.each([
    'number.addition',
    'geometry.quadrilateral',
    'measurement.unit-length',
    'number.numeral',
    'number.counting',
    'number.comparison',
    'number.subtraction',
    'number.missing',
  ] as const)(
    '%s child single-choice markup requires no select/check/radio convention or developer diagnostic knowledge',
    (family) => {
      const html = render(presentation(family, 0));
      expect(html).not.toMatch(/<select\b|type="(?:checkbox|radio|submit)"/u);
      expect(html).toContain('data-child-answer=');
      expect(html).toContain('data-child-help=');
      expect(html.match(/role="status"/gu)).toHaveLength(1);
      expect(html).not.toMatch(
        /SYNTHETIC-PLAYER|answerContract|expectedClassIds|sideLengthSquares|rightAngles|slice-attributes|squared|non-right/iu,
      );
      expect(html).not.toMatch(
        /aria-pressed="true"|data-(?:correct|expected)=/u,
      );
      if (family === 'geometry.quadrilateral')
        expect(html).not.toContain('<text');
    },
  );

  it('keeps instruction and UI language roles distinct for direct answers, help and outcome feedback', () => {
    const html = render(presentation('number.counting', 0), {
      preferences: {
        uiLocale: 'de-DE',
        instructionLocale: 'en-GB',
        numberSpeechLocale: 'el-GR',
      },
      feedback: 'incorrect',
      hintTier: 2,
    });
    expect(html).toContain('lang="en-GB"');
    expect(html).toContain('How many dots?');
    expect(html).toContain('lang="de-DE"');
    expect(html).toContain('Zeig es mir');
    expect(html).toContain('Noch einmal');
    expect(html).not.toContain('lang="el-GR"');
  });

  it('retains equivalent nonvisual unit traversal without exposing a pre-answer total', () => {
    const task = presentation('measurement.unit-length', 0);
    const html = render(task);
    const units = Number(expectedNumber(task));
    expect(html.match(/data-child-unit-control=/gu)).toHaveLength(units);
    expect(
      html.match(
        /data-child-unit-control=[^>]*aria-label="One step"[^>]*aria-pressed="false"/gu,
      ),
    ).toHaveLength(units);
    expect(html).toMatch(
      /<p aria-live="polite" aria-atomic="true" data-unit-navigation=/u,
    );
    const navigation = /<p[^>]*data-unit-navigation=[^>]*>(.*?)<\/p>/su.exec(
      html,
    )?.[1];
    expect(navigation).toContain('Start here');
    expect(navigation).not.toMatch(/\d|(?:total|answer)/iu);
    expect(html.match(/role="status"/gu)).toHaveLength(1);
  });

  it('keeps child-controlled help reachable at its maximum mathematical support tier', () => {
    for (const family of [
      'number.addition',
      'geometry.quadrilateral',
      'measurement.unit-length',
      'number.numeral',
      'number.counting',
      'number.comparison',
      'number.subtraction',
      'number.missing',
    ] as const) {
      const html = render(presentation(family, 0), { hintTier: 3 });
      const helpButton = /<button[^>]*data-child-help=[^>]*>/u.exec(html)?.[0];
      expect(helpButton).toBeDefined();
      expect(helpButton).not.toContain('disabled');
      expect(html).toContain('data-child-hint-tier="3"');
    }
  });

  it.each([
    'number.addition',
    'geometry.quadrilateral',
    'measurement.unit-length',
    'number.numeral',
    'number.counting',
    'number.comparison',
    'number.subtraction',
    'number.missing',
  ] as const)(
    '%s visual help keeps immutable public task data and never preselects an answer',
    (family) => {
      const task = presentation(family, 0);
      const before = JSON.stringify(task);
      for (const hintTier of [1, 2, 3] as const) {
        const html = render(task, { hintTier });
        expect(html).toContain(`data-child-hint-tier="${hintTier}"`);
        expect(html).not.toMatch(
          /aria-pressed="true"|data-(?:correct|expected)=|answerContract|expectedClassIds/u,
        );
        expect(JSON.stringify(task)).toBe(before);
      }
    },
  );

  it('never resolves the unknown missing part or completed equation in any help stage', () => {
    const positions = new Set<string>();
    for (let ordinal = 0; ordinal < 24; ordinal += 1) {
      const task = presentation('number.missing', ordinal);
      if (task.task.kind !== 'missingNumber')
        throw new Error('Expected missing task');
      positions.add(task.task.unknownPosition);
      for (const hintTier of [0, 1, 2, 3] as const) {
        const html = render(task, { hintTier });
        expect(html).toContain(
          `data-unknown-part="${task.task.unknownPosition}"`,
        );
        // Every unknown-part element remains a question placeholder; all answer
        // cards still exist, so a matching numeral elsewhere is not leakage.
        const blank =
          /<[^>]*data-unknown-part="(?:left|right|total)"[^>]*>(.*?)<\/[^>]+>/su.exec(
            html,
          )?.[1];
        expect(blank).toContain('?');
        expect(blank).not.toMatch(/\d/u);
      }
    }
    expect(positions).toEqual(new Set(['left', 'right', 'total']));
  });

  it('uses static inclusive shape sets without deciding the task classification in UI', () => {
    const expected = {
      square: [
        'geometry.parallelogram',
        'geometry.rectangle',
        'geometry.square',
      ],
      rectangle: ['geometry.parallelogram', 'geometry.rectangle'],
      parallelogram: ['geometry.parallelogram'],
    };
    expect(CHILD_SHAPE_CHOICES).toHaveLength(3);
    for (const [key, classIds] of Object.entries(expected)) {
      const card = CHILD_SHAPE_CHOICES.find((choice) => choice.key === key);
      expect(card?.answer).toEqual({ kind: 'classification', classIds });
    }
    const source = readFileSync(
      'src/ui/synthetic-loop/child-answers.ts',
      'utf8',
    );
    expect(source).not.toMatch(
      /inspectQuadrilateral|unitLengthTruth|additionTruth|generateProof|generateSlice|answerContract|expectedClassIds/,
    );
  });

  it('validates exactly one static shape card for each bounded rotated/sheared task', () => {
    const classifications = new Set<string>();
    const quadrants = new Set<string>();
    const winding = new Set<string>();
    for (let ordinal = 0; ordinal < 96; ordinal += 1) {
      const task = variedGeometryPresentation(ordinal);
      const expected = shapeClasses(task);
      classifications.add(expected.join('|'));
      if (task.task.kind !== 'classifyGeometry')
        throw new Error('Expected quadrilateral');
      const polygon = task.task.scene.objects.find(
        (object) => object.kind === 'polygon',
      );
      if (!polygon || polygon.kind !== 'polygon')
        throw new Error('Expected polygon');
      const corners = polygon.vertices.map(point);
      const away = corners.find((corner) => corner.x !== 0n && corner.y !== 0n);
      if (!away) throw new Error('Expected rotated opposite corner');
      quadrants.add(`${away.x > 0n ? '+' : '-'}${away.y > 0n ? '+' : '-'}`);
      const doubledArea = corners.reduce((area, corner, index) => {
        const next = corners[(index + 1) % 4];
        if (!next) throw new Error('Missing corner');
        return area + corner.x * next.y - corner.y * next.x;
      }, 0n);
      winding.add(doubledArea > 0n ? 'counterclockwise' : 'clockwise');
      let accepted = 0;
      for (const card of CHILD_SHAPE_CHOICES) {
        const answer = value(submitFamilyProof(task.replay, card.answer));
        const classes: readonly string[] = card.answer.classIds;
        const agrees =
          card.answer.kind === 'classification' &&
          classes.length === expected.length &&
          expected.every((classId) => classes.includes(classId));
        expect(answer.correct).toBe(agrees);
        if (answer.correct) accepted += 1;
      }
      expect(accepted).toBe(1);
    }
    expect(classifications).toEqual(
      new Set([
        'geometry.parallelogram',
        'geometry.parallelogram|geometry.rectangle',
        'geometry.parallelogram|geometry.rectangle|geometry.square',
      ]),
    );
    expect(quadrants).toEqual(new Set(['++', '+-', '--', '-+']));
    expect(winding).toEqual(new Set(['clockwise', 'counterclockwise']));
  });

  it.each([
    ['evaluateExpression', 0, 10],
    ['measureGeometry', 1, 8],
    ['numeralRecognition', 0, 5],
    ['countItems', 0, 5],
    ['subtractItems', 0, 5],
    ['missingNumber', 0, 10],
  ] as const)(
    'maps every %s number card to its exact structured answer and bounds',
    (kind, minimum, maximum) => {
      for (let candidate = minimum; candidate <= maximum; candidate += 1) {
        const answer = childNumberAnswer(kind, String(candidate));
        const exact = {
          schema: 'rational-v1',
          numerator: String(candidate),
          denominator: '1',
        };
        expect(answer).toEqual(
          kind === 'measureGeometry'
            ? {
                kind: 'quantity',
                quantity: {
                  schema: 'quantity-v1',
                  kind: 'exact',
                  magnitude: exact,
                  unitId: 'unit.length-step',
                  dimension: 'length',
                },
              }
            : { kind: 'exactValue', value: exact },
        );
      }
      for (const invalid of [
        '',
        '-1',
        '01',
        '1.0',
        ' 1',
        'NaN',
        String(maximum + 1),
      ])
        expect(childNumberAnswer(kind, invalid)).toBeNull();
      if (minimum === 1) expect(childNumberAnswer(kind, '0')).toBeNull();
    },
  );

  it.each([
    'number.addition',
    'measurement.unit-length',
    'number.numeral',
    'number.counting',
    'number.subtraction',
    'number.missing',
  ] as const)(
    'preserves %s truth when a public-task number card is pressed',
    (family) => {
      for (let ordinal = 0; ordinal < 24; ordinal += 1) {
        const task = presentation(family, ordinal);
        const expected = expectedNumber(task);
        const answer = childNumberAnswer(task.task.kind, expected);
        expect(answer).not.toBeNull();
        const result =
          family === 'number.addition' || family === 'measurement.unit-length'
            ? submitFamilyProof(task.replay, answer)
            : submitSliceFamily(task.replay, answer);
        expect(value(result).correct).toBe(true);
        const wrongNumber = expected === '1' ? '2' : '1';
        const wrongAnswer = childNumberAnswer(task.task.kind, wrongNumber);
        expect(wrongAnswer).not.toBeNull();
        const wrong =
          family === 'number.addition' || family === 'measurement.unit-length'
            ? submitFamilyProof(task.replay, wrongAnswer)
            : submitSliceFamily(task.replay, wrongAnswer);
        expect(value(wrong).correct).toBe(false);
      }
    },
  );

  it('maps left/equal/right comparison cards to domain relations without an extra check action', () => {
    const mapped = CHILD_RELATION_CHOICES.map((choice) => choice.answer);
    expect(mapped).toHaveLength(3);
    for (const relation of [
      'comparison.less',
      'comparison.equal',
      'comparison.greater',
    ])
      expect(mapped).toContainEqual({
        kind: 'classification',
        classIds: [relation],
      });
    for (let ordinal = 0; ordinal < 36; ordinal += 1) {
      const task = presentation('number.comparison', ordinal);
      if (task.task.kind !== 'compareQuantities')
        throw new Error('Expected comparison');
      const left = task.task.left.length,
        right = task.task.right.length;
      const expected =
        left < right
          ? 'comparison.less'
          : left > right
            ? 'comparison.greater'
            : 'comparison.equal';
      for (const answer of mapped) {
        const result = value(submitSliceFamily(task.replay, answer));
        expect(result.correct).toBe(
          answer.kind === 'classification' && answer.classIds[0] === expected,
        );
      }
    }
    expect(childNumberAnswer('classifyGeometry', '1')).toBeNull();
    expect(childNumberAnswer('compareQuantities', '1')).toBeNull();
  });
});
