import { describe, expect, it } from 'vitest';
import {
  createChapterTask,
  deriveChapterHelp,
  validateChapterAnswer,
} from '../../../src/application/growing-world';
import type { DomainResult } from '../../../src/domain/core/result';
import { identifier } from '../../../src/domain/core/identifiers';
import {
  CHAPTER_CONTENT_VERSION,
  CHAPTER_FAMILY_IDS,
  CHAPTER_GENERATOR_IDS,
  chapterEvidence,
  chapterEvidenceFromInput,
  createChapterReplay,
  generateChapter,
  isChapterFamilyId,
} from '../../../src/domain/growing-world/content';
import type {
  ChapterFamilyId,
  ChapterTask,
} from '../../../src/domain/growing-world/content';
import type { StructuredAnswer } from '../../../src/domain/puzzles/contracts';

function value<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(`Chapter author test: ${result.error.code}`);
  return result.value;
}

function seedAt(index: number): string {
  return [index + 1, index + 17, index + 101, index + 1009]
    .map((word) =>
      (Math.imul(word, 2654435761) >>> 0).toString(16).padStart(8, '0'),
    )
    .join('');
}

function numericAnswer(task: ChapterTask): number {
  if (task.kind === 'makeTen')
    return Array.from({ length: 10 }).slice(task.first).length;
  if (task.kind === 'missingPart')
    return Array.from({ length: task.total }).slice(task.known).length;
  if (task.kind === 'equalGroups')
    return Array.from({ length: task.groups }, () =>
      Array.from({ length: task.each }),
    ).flat().length;
  if (task.kind === 'arrayArea')
    return Array.from({ length: task.rows }, () =>
      Array.from({ length: task.columns }),
    ).flat().length;
  if (task.kind === 'missingGroup') {
    const buckets = Array.from({ length: task.groups }, () => [] as number[]);
    for (let item = 0; item < task.total; item += 1)
      buckets[item % task.groups]?.push(item);
    if (!buckets.every((bucket) => bucket.length === buckets[0]?.length))
      throw new Error('Unequal sharing is outside this chapter');
    return buckets[0]?.length ?? -1;
  }
  for (let side = 1; side <= 6; side += 1) {
    const square = Array.from({ length: side }, () =>
      Array.from({ length: side }),
    ).flat();
    if (square.length === task.total) return side;
  }
  throw new Error('A nonperfect square is outside this chapter');
}

function answer(
  task: ChapterTask,
  numeric = numericAnswer(task),
): StructuredAnswer {
  const magnitude = {
    schema: 'rational-v1',
    numerator: String(numeric),
    denominator: '1',
  } as const;
  if (task.kind !== 'arrayArea')
    return { kind: 'exactValue', value: magnitude };
  return {
    kind: 'quantity',
    quantity: {
      schema: 'quantity-v1',
      kind: 'exact',
      magnitude,
      unitId: value(identifier('unit', 'unit.square-step')),
      dimension: 'area',
    },
  };
}

describe('Growing world authored content contracts', () => {
  it('anchors the new generator tuples without replacing historical identities', () => {
    // Independently established xoshiro words [1,2,3,4] draw 11520 then 0.
    const seed = '00000001000000020000000300000004';
    const expected = [
      { kind: 'makeTen', first: 6, second: 5, target: 10 },
      { kind: 'missingPart', known: 1, total: 11, unknownPosition: 'first' },
      { kind: 'equalGroups', groups: 2, each: 2 },
      { kind: 'missingGroup', groups: 2, total: 4 },
      {
        kind: 'arrayArea',
        rows: 2,
        columns: 2,
        unitId: 'unit.square-step',
        dimension: 'area',
      },
      { kind: 'squareSide', total: 1 },
    ];
    for (const [index, familyId] of CHAPTER_FAMILY_IDS.entries()) {
      const presentation = value(createChapterTask(familyId, seed));
      expect(presentation.task).toMatchObject({
        ...expected[index],
        representation: 'concrete',
      });
      expect(presentation.replay.generatorVersion).toBe(
        CHAPTER_GENERATOR_IDS[index],
      );
      expect(presentation.replay.contentVersion).toBe(CHAPTER_CONTENT_VERSION);
      expect(presentation.replay.spec).toEqual({
        chapter: 'build-and-take-apart-v1',
      });
      expect(presentation).not.toHaveProperty('answerContract');
      expect(presentation.task).not.toHaveProperty('expected');
      expect(presentation.task).not.toHaveProperty('side');
      expect(presentation.task).not.toHaveProperty('missing');
    }
  });

  it.each(CHAPTER_FAMILY_IDS)(
    'validates task-derived answers and both representations: %s',
    (familyId) => {
      const representations = new Set<string>();
      for (let index = 0; index < 300; index += 1) {
        const presentation = value(createChapterTask(familyId, seedAt(index)));
        const { task, replay } = presentation;
        representations.add(task.representation);
        expect(validateChapterAnswer(replay, answer(task))).toEqual({
          ok: true,
          value: { correct: true },
        });
        expect(
          validateChapterAnswer(replay, answer(task, numericAnswer(task) + 1)),
        ).toEqual({ ok: true, value: { correct: false } });
        const evidence = value(chapterEvidence(replay));
        expect(chapterEvidenceFromInput({ familyId, ...evidence })).toEqual({
          ok: true,
          value: evidence,
        });
        expect(task.connections.length).toBeGreaterThan(0);
        expect(task.connections.every(isChapterFamilyId)).toBe(true);
        expect(Object.isFrozen(task)).toBe(true);
        if (task.kind === 'makeTen') {
          expect(task.first).toBeGreaterThanOrEqual(6);
          expect(task.first).toBeLessThanOrEqual(9);
          expect(task.first + task.second).toBeGreaterThan(10);
          expect(task.second).toBeLessThanOrEqual(9);
        } else if (task.kind === 'missingPart') {
          expect(task.total).toBeGreaterThanOrEqual(11);
          expect(task.total).toBeLessThanOrEqual(20);
          expect(task.known).toBeGreaterThan(0);
          expect(task.known).toBeLessThan(task.total);
        } else if (task.kind === 'squareSide') {
          expect(numericAnswer(task)).toBeGreaterThanOrEqual(1);
          expect(numericAnswer(task)).toBeLessThanOrEqual(6);
          expect(
            validateChapterAnswer(replay, answer(task, -numericAnswer(task))),
          ).toEqual({ ok: true, value: { correct: false } });
        }
      }
      expect([...representations].sort()).toEqual(['concrete', 'relational']);
    },
  );

  it('replays canonical seed case and provides a solution only in explicit worked help', () => {
    const seed = '0123456789abcdefdeadbeeffedcba98';
    for (const familyId of CHAPTER_FAMILY_IDS) {
      expect(createChapterTask(familyId, seed.toUpperCase())).toEqual(
        createChapterTask(familyId, seed),
      );
      const presentation = value(createChapterTask(familyId, seed));
      for (const tier of [1, 2] as const)
        expect(
          value(deriveChapterHelp(presentation.replay, tier)).workedAnswer,
        ).toBeNull();
      expect(
        value(deriveChapterHelp(presentation.replay, 3)).workedAnswer,
      ).toEqual(answer(presentation.task));
      expect(deriveChapterHelp(presentation.replay, 0).ok).toBe(false);
      expect(deriveChapterHelp(presentation.replay, 4).ok).toBe(false);
    }
  });

  it('rejects cross-family generators, changed specs and malformed wire answers', () => {
    for (const [index, familyId] of CHAPTER_FAMILY_IDS.entries()) {
      const presentation = value(createChapterTask(familyId, seedAt(11)));
      for (const [
        otherIndex,
        generatorVersion,
      ] of CHAPTER_GENERATOR_IDS.entries()) {
        if (otherIndex !== index)
          expect(
            generateChapter({ ...presentation.replay, generatorVersion }).ok,
          ).toBe(false);
      }
      for (const spec of [
        { chapter: 'changed-v1' },
        { chapter: 'build-and-take-apart-v1', maximum: 99 },
        {},
        null,
      ])
        expect(generateChapter({ ...presentation.replay, spec }).ok).toBe(
          false,
        );
      for (const seedHex of [
        '',
        '00000000000000000000000000000000',
        'g'.repeat(32),
      ])
        expect(createChapterTask(familyId, seedHex).ok).toBe(false);
      for (const numerator of ['-0', '+1', '01', '1.0', ' 1', '1e0'])
        expect(
          validateChapterAnswer(presentation.replay, {
            kind: 'exactValue',
            value: { schema: 'rational-v1', numerator, denominator: '1' },
          }).ok,
        ).toBe(false);
      expect(
        validateChapterAnswer(presentation.replay, {
          kind: 'classification',
          classIds: ['geometry.square'],
        }).ok,
      ).toBe(false);
    }
    const area = value(createChapterTask('measurement.array-area', seedAt(0)));
    const correct = answer(area.task);
    if (correct.kind !== 'quantity') throw new Error('Area answer needs units');
    expect(
      validateChapterAnswer(area.replay, {
        ...correct,
        quantity: { ...correct.quantity, dimension: 'length' },
      }).ok,
    ).toBe(false);
    expect(
      validateChapterAnswer(area.replay, {
        ...correct,
        quantity: { ...correct.quantity, unitId: 'unit.length-step' },
      }).ok,
    ).toBe(false);
    expect(
      validateChapterAnswer(area.replay, {
        kind: 'exactValue',
        value: correct.quantity.magnitude,
      }).ok,
    ).toBe(false);
  });

  it('quotients transformed repetitions and rejects invented evidence', () => {
    const seen = new Map<ChapterFamilyId, Map<string, Set<string>>>();
    for (const familyId of CHAPTER_FAMILY_IDS) {
      const cases = new Map<string, Set<string>>();
      seen.set(familyId, cases);
      for (let index = 0; index < 1000; index += 1) {
        const presentation = value(createChapterTask(familyId, seedAt(index)));
        const evidence = value(chapterEvidence(presentation.replay));
        const representations =
          cases.get(evidence.fingerprint) ?? new Set<string>();
        representations.add(evidence.representation);
        cases.set(evidence.fingerprint, representations);
      }
      expect(
        [...cases.values()].some(
          (representations) => representations.size === 2,
        ),
      ).toBe(true);
      const evidence = value(
        chapterEvidence(value(createChapterReplay(familyId, seedAt(0)))),
      );
      for (const changed of [
        { fingerprint: 'invented:999' },
        { representation: `${evidence.representation}.other` },
        { concept: 'growth.invented' },
        { generatorVersion: 'changed-v2' },
        { extra: true },
      ])
        expect(
          chapterEvidenceFromInput({ familyId, ...evidence, ...changed }).ok,
        ).toBe(false);
    }
    expect(seen.get('number.make-ten')?.size).toBe(4);
    expect(seen.get('groups.equal')?.size).toBe(10);
    expect(seen.get('groups.missing')?.size).toBe(16);
    expect(seen.get('measurement.array-area')?.size).toBe(10);
    expect(seen.get('powers.square-side')?.size).toBe(6);
    expect(isChapterFamilyId('number.addition')).toBe(false);
    expect(isChapterFamilyId(null)).toBe(false);
  });
});
