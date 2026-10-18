import { describe, expect, it } from 'vitest';
import {
  createChapterTask,
  deriveChapterHelp,
  validateChapterAnswer,
} from '../../../src/application/growing-world';
import type { DomainResult } from '../../../src/domain/core/result';
import {
  CHAPTER_CONTENT_VERSION,
  CHAPTER_FAMILY_IDS,
  CHAPTER_GENERATOR_IDS,
  chapterEvidence,
  chapterEvidenceFromInput,
  createChapterReplay,
  generateChapter,
} from '../../../src/domain/growing-world/content';
import {
  arrayRelationship,
  changeArray,
  changeSplit,
  splitRelationship,
} from '../../../src/domain/growing-world/explore';
import type {
  ArrayAction,
  SplitAction,
} from '../../../src/domain/growing-world/explore';
import {
  ORACLE_CHAPTER_FAMILIES,
  chapterCaseKey,
  chapterSeedWitnesses,
  enumerateChapterCases,
  oracleChapterCase,
  referenceChapterCase,
} from '../../oracle/growing-world';
import type { OracleChapterCase } from '../../oracle/growing-world';

const SYNTHETIC_SEED = '00000001000000020000000300000004';
const CASE_COUNTS = [52, 580, 32, 32, 32, 12] as const;
const FINGERPRINT_COUNTS = [4, 145, 10, 16, 10, 6] as const;
const GENERATOR_IDS = [
  'make-ten-crossing-v1',
  'missing-part-eleven-twenty-v1',
  'equal-groups-two-five-v1',
  'missing-group-two-five-v1',
  'array-unit-area-two-five-v1',
  'principal-square-side-one-six-v1',
] as const;

function value<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(`Independent proof: ${result.error.code}`);
  return result.value;
}

function wireAnswer(row: OracleChapterCase, number = row.answer): unknown {
  const magnitude = {
    schema: 'rational-v1',
    numerator: String(number),
    denominator: '1',
  };
  return row.family === 'measurement.array-area'
    ? {
        kind: 'quantity',
        quantity: {
          schema: 'quantity-v1',
          kind: 'exact',
          magnitude,
          unitId: 'unit.square-step',
          dimension: 'area',
        },
      }
    : { kind: 'exactValue', value: magnitude };
}

function rejects(result: DomainResult<unknown>): void {
  expect(result.ok).toBe(false);
}

describe('Growing world independent finite mathematical proof', () => {
  it('anchors cardinalities, missing parts, inverse groups and principal roots independently', () => {
    expect(
      oracleChapterCase('number.make-ten', [9, 2], 'concrete').answer,
    ).toBe(1);
    expect(
      oracleChapterCase('number.make-ten', [6, 9], 'relational').answer,
    ).toBe(4);
    expect(
      oracleChapterCase('number.part-whole', [19, 20, 0], 'concrete').answer,
    ).toBe(1);
    expect(
      oracleChapterCase('number.part-whole', [1, 20, 1], 'relational').answer,
    ).toBe(19);
    expect(oracleChapterCase('groups.equal', [5, 4], 'concrete').answer).toBe(
      20,
    );
    expect(
      oracleChapterCase('groups.missing', [5, 4], 'relational').answer,
    ).toBe(4);
    expect(
      oracleChapterCase('measurement.array-area', [2, 5], 'concrete').answer,
    ).toBe(10);
    expect(
      oracleChapterCase('powers.square-side', [4], 'relational').answer,
    ).toBe(4);
    // The square-side family is not the real equation x² = 16.
    expect([-4, 4].filter((candidate) => candidate * candidate === 16)).toEqual(
      [-4, 4],
    );
    expect(() =>
      oracleChapterCase('powers.square-side', [0], 'concrete'),
    ).toThrow();
    expect(() =>
      oracleChapterCase('number.make-ten', [6, 4], 'concrete'),
    ).toThrow();
    expect(() =>
      oracleChapterCase('groups.missing', [1, 3], 'concrete'),
    ).toThrow();
  });

  it('fixes all six new replay identities independently of production constants', () => {
    expect(CHAPTER_FAMILY_IDS).toEqual(ORACLE_CHAPTER_FAMILIES);
    expect(CHAPTER_GENERATOR_IDS).toEqual(GENERATOR_IDS);
    expect(CHAPTER_CONTENT_VERSION).toBe('growing-world-content-v1');
    const anchors = [
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
    for (const [index, family] of ORACLE_CHAPTER_FAMILIES.entries()) {
      const replay = value(createChapterReplay(family, SYNTHETIC_SEED));
      expect(replay).toEqual({
        schema: 'replay-v1',
        canonicalization: 'canonical-json-v1',
        semanticVersion: 'semantic-v1',
        familyId: family,
        generatorVersion: GENERATOR_IDS[index],
        contentVersion: 'growing-world-content-v1',
        rngAlgorithm: 'xoshiro128ss-v1',
        seedHex: SYNTHETIC_SEED,
        spec: { chapter: 'build-and-take-apart-v1' },
      });
      const generated = value(generateChapter(replay));
      expect(generated.instanceId).toBe(`gw-${index}-v1-c1-${SYNTHETIC_SEED}`);
      expect(generated.schema).toBe('growing-world-instance-v1');
      expect(generated.semanticVersion).toBe('semantic-v1');
      expect(generated.task).toMatchObject({
        ...anchors[index],
        representation: 'concrete',
      });
      expect(
        value(generateChapter(JSON.parse(JSON.stringify(replay)))),
      ).toEqual(generated);
      expect(
        value(
          generateChapter({ ...replay, seedHex: SYNTHETIC_SEED.toUpperCase() }),
        ),
      ).toEqual(generated);
    }
  });

  it.each(ORACLE_CHAPTER_FAMILIES)(
    'exhausts independent parameter/representation witnesses: %s',
    (family) => {
      const index = ORACLE_CHAPTER_FAMILIES.indexOf(family);
      const expectedCases = enumerateChapterCases(family);
      const witnesses = chapterSeedWitnesses(family);
      expect(expectedCases.length).toBe(CASE_COUNTS[index]);
      expect([...witnesses.keys()].sort()).toEqual(
        expectedCases.map(chapterCaseKey).sort(),
      );
      const fingerprints = new Set<string>();
      for (const { seed, expected } of witnesses.values()) {
        const presentation = value(createChapterTask(family, seed));
        const generated = value(generateChapter(presentation.replay));
        const { connections, ...visibleTask } = presentation.task;
        expect(visibleTask).toEqual({
          ...expected.task,
          representation: expected.representation,
        });
        expect(
          connections.every((connection) =>
            ORACLE_CHAPTER_FAMILIES.some(
              (candidate) => candidate === connection,
            ),
          ),
        ).toBe(true);
        expect(Object.keys(presentation).sort()).toEqual([
          'familyId',
          'replay',
          'task',
        ]);
        expect(Object.isFrozen(generated)).toBe(true);
        expect(Object.isFrozen(generated.task)).toBe(true);
        expect(Object.isFrozen(generated.answerContract)).toBe(true);
        expect(generated.replay.generatorVersion).toBe(GENERATOR_IDS[index]);
        expect(generated.replay.contentVersion).toBe(
          'growing-world-content-v1',
        );
        expect(
          validateChapterAnswer(presentation.replay, wireAnswer(expected)),
        ).toEqual({ ok: true, value: { correct: true } });
        expect(
          validateChapterAnswer(
            presentation.replay,
            wireAnswer(expected, expected.answer + 1),
          ),
        ).toEqual({ ok: true, value: { correct: false } });
        if (family === 'powers.square-side') {
          expect(
            validateChapterAnswer(
              presentation.replay,
              wireAnswer(expected, -expected.answer),
            ),
          ).toEqual({ ok: true, value: { correct: false } });
        }
        const evidence = value(chapterEvidence(presentation.replay));
        expect(evidence).toEqual({
          concept: `growth.${family}`,
          representation: `representation.growth.${family}.${expected.representation}`,
          fingerprint: expected.fingerprint,
          generatorVersion: GENERATOR_IDS[index],
        });
        fingerprints.add(evidence.fingerprint);
        expect(
          value(chapterEvidenceFromInput({ familyId: family, ...evidence })),
        ).toEqual(evidence);
        expect(
          value(deriveChapterHelp(presentation.replay, 1)).workedAnswer,
        ).toBeNull();
        expect(
          value(deriveChapterHelp(presentation.replay, 2)).workedAnswer,
        ).toBeNull();
        expect(
          value(deriveChapterHelp(presentation.replay, 3)).workedAnswer,
        ).toEqual(wireAnswer(expected));
      }
      expect(fingerprints.size).toBe(FINGERPRINT_COUNTS[index]);
    },
  );

  it('separates the 740 finite cases from semantic quotients and rejects invented evidence', () => {
    expect(CASE_COUNTS.reduce((sum, count) => sum + count, 0)).toBe(740);
    expect(FINGERPRINT_COUNTS.reduce((sum, count) => sum + count, 0)).toBe(191);
    for (const family of ORACLE_CHAPTER_FAMILIES) {
      const valid = value(
        chapterEvidence(value(createChapterReplay(family, SYNTHETIC_SEED))),
      );
      const row = { familyId: family, ...valid };
      for (const patch of [
        { fingerprint: `${valid.fingerprint}:extra` },
        { fingerprint: valid.fingerprint.replace(/\d+$/, '99') },
        { fingerprint: 'make-ten:5' },
        { fingerprint: 'square-side:2' },
        { fingerprint: 'missing-group:3:10' },
        { concept: 'growth.number.addition' },
        { representation: `representation.growth.${family}.translated` },
        { generatorVersion: 'addition-bounded-v1' },
        { extra: true },
      ])
        rejects(chapterEvidenceFromInput({ ...row, ...patch }));
    }
    // Changing a drawing/position cannot manufacture independent semantics.
    const makeTen = enumerateChapterCases('number.make-ten');
    expect(
      new Set(
        makeTen
          .filter((row) => row.parameters[0] === 6)
          .map((row) => row.fingerprint),
      ).size,
    ).toBe(1);
    const swapped = [
      oracleChapterCase('groups.equal', [2, 5], 'concrete'),
      oracleChapterCase('groups.equal', [5, 2], 'relational'),
    ];
    expect(swapped[0]?.fingerprint).toBe(swapped[1]?.fingerprint);
    expect(
      oracleChapterCase('groups.missing', [2, 5], 'concrete').fingerprint,
    ).not.toBe(
      oracleChapterCase('groups.missing', [5, 2], 'concrete').fingerprint,
    );
  });

  it('rejects malformed exact answers, forged contracts, unit changes and unsupported replay tuples', () => {
    for (const family of ORACLE_CHAPTER_FAMILIES) {
      const replay = value(createChapterReplay(family, SYNTHETIC_SEED));
      const expected = referenceChapterCase(family, SYNTHETIC_SEED);
      const canonicalAnswer = wireAnswer(expected);
      const scalar = {
        schema: 'rational-v1',
        numerator: String(expected.answer),
        denominator: '1',
      };
      for (const input of [
        null,
        {},
        4,
        String(expected.answer),
        {
          kind: 'exactValue',
          value: { ...scalar, numerator: expected.answer },
        },
        { kind: 'exactValue', value: { ...scalar, numerator: '04' } },
        { kind: 'exactValue', value: { ...scalar, numerator: '-0' } },
        { kind: 'exactValue', value: { ...scalar, numerator: '+4' } },
        { kind: 'exactValue', value: { ...scalar, numerator: '4.0' } },
        { kind: 'exactValue', value: { ...scalar, numerator: '4e0' } },
        { kind: 'exactValue', value: { ...scalar, denominator: '0' } },
        { kind: 'exactValue', value: { ...scalar, denominator: '-1' } },
        {
          kind: 'exactValue',
          value: {
            ...scalar,
            numerator: String(expected.answer * 2),
            denominator: '2',
          },
        },
        { kind: 'exactValue', value: { ...scalar, numerator: '9'.repeat(79) } },
        { kind: 'exactValue', value: { ...scalar, extra: true } },
        { kind: 'exactValue', value: { ...scalar, schema: 'rational-v2' } },
        { kind: 'sequence', items: [canonicalAnswer] },
        { kind: 'classification', classIds: ['geometry.square'] },
      ])
        rejects(validateChapterAnswer(replay, input));
      for (const patch of [
        { contentVersion: 'phase2-content-v1' },
        { generatorVersion: 'addition-bounded-v1' },
        { semanticVersion: 'semantic-v2' },
        { canonicalization: 'canonical-json-v2' },
        { rngAlgorithm: 'xoshiro128ss-v2' },
        { spec: { chapter: 'build-and-take-apart-v2' } },
        { spec: { chapter: 'build-and-take-apart-v1', answer: 4 } },
        { seedHex: '00000000000000000000000000000000' },
        { seedHex: 'x'.repeat(32) },
        { answerContract: { kind: 'exactValue', expected: scalar } },
      ]) {
        rejects(generateChapter({ ...replay, ...patch }));
        rejects(
          validateChapterAnswer({ ...replay, ...patch }, canonicalAnswer),
        );
      }
      rejects(
        validateChapterAnswer(value(generateChapter(replay)), canonicalAnswer),
      );
      for (const tier of [-1, 0, 4, 1.5, '3', null])
        rejects(deriveChapterHelp(replay, tier));
    }
    const replay = value(
      createChapterReplay('measurement.array-area', SYNTHETIC_SEED),
    );
    const magnitude = {
      schema: 'rational-v1',
      numerator: '4',
      denominator: '1',
    };
    rejects(
      validateChapterAnswer(replay, { kind: 'exactValue', value: magnitude }),
    );
    for (const patch of [
      { dimension: 'length' },
      { unitId: 'unit.length-step' },
      { unitId: 'unit.square-other' },
      { dimension: 'volume' },
    ])
      rejects(
        validateChapterAnswer(replay, {
          kind: 'quantity',
          quantity: {
            schema: 'quantity-v1',
            kind: 'exact',
            magnitude,
            unitId: 'unit.square-step',
            dimension: 'area',
            ...patch,
          },
        }),
      );
  });
});

describe('Growing world independent Explore transition proof', () => {
  it('exhausts all 231 split states and 924 single-action transitions', () => {
    const actions: readonly SplitAction[] = [
      'add',
      'remove',
      'moveLeft',
      'moveRight',
    ];
    let states = 0;
    let transitions = 0;
    for (let total = 0; total <= 20; total += 1) {
      for (let left = 0; left <= total; left += 1) {
        states += 1;
        const workspace = Object.freeze({
          kind: 'split' as const,
          total,
          left,
        });
        const relation = value(splitRelationship(workspace));
        const right = Array.from({ length: total }).slice(left).length;
        expect(relation).toEqual({
          total,
          left,
          right,
          tenAndRest: [total > 10 ? 10 : total, total > 10 ? total - 10 : 0],
        });
        for (const action of actions) {
          transitions += 1;
          const next = changeSplit(workspace, action);
          const blocked =
            action === 'add'
              ? total === 20
              : action === 'remove'
                ? total === 0
                : action === 'moveLeft'
                  ? right === 0
                  : left === 0;
          if (blocked)
            expect(next).toEqual({
              ok: false,
              error: { code: 'range_exceeded' },
            });
          else {
            const expectedTotal =
              action === 'add'
                ? total + 1
                : action === 'remove'
                  ? total - 1
                  : total;
            const expectedLeft =
              action === 'moveLeft'
                ? left + 1
                : action === 'moveRight'
                  ? left - 1
                  : Math.min(left, expectedTotal);
            expect(value(next)).toEqual({
              kind: 'split',
              total: expectedTotal,
              left: expectedLeft,
            });
            const nextRelation = value(splitRelationship(value(next)));
            expect(nextRelation.left + nextRelation.right).toBe(
              nextRelation.total,
            );
          }
        }
        expect(workspace).toEqual({ kind: 'split', total, left });
        if (right > 0)
          expect(
            value(
              changeSplit(
                value(changeSplit(workspace, 'moveLeft')),
                'moveRight',
              ),
            ),
          ).toEqual(workspace);
      }
    }
    expect(states).toBe(231);
    expect(transitions).toBe(924);
  });

  it('exhausts all 25 equal-unit arrays and 150 single-action transitions', () => {
    const actions: readonly ArrayAction[] = [
      'addRow',
      'removeRow',
      'addColumn',
      'removeColumn',
      'turn',
      'square',
    ];
    let states = 0;
    let transitions = 0;
    for (let rows = 1; rows <= 5; rows += 1) {
      for (let columns = 1; columns <= 5; columns += 1) {
        states += 1;
        const workspace = Object.freeze({
          kind: 'array' as const,
          rows,
          columns,
        });
        const cells = Array.from({ length: rows }, () =>
          Array.from({ length: columns }),
        ).flat();
        expect(value(arrayRelationship(workspace))).toEqual({
          rows,
          columns,
          total: cells.length,
          repeatedAddends: Array.from({ length: rows }, () => columns),
          isSquare: rows === columns,
          principalRoot: rows === columns ? rows : null,
        });
        expect(
          value(changeArray(value(changeArray(workspace, 'turn')), 'turn')),
        ).toEqual(workspace);
        const square = value(changeArray(workspace, 'square'));
        expect(value(arrayRelationship(square)).principalRoot).toBe(columns);
        for (const action of actions) {
          transitions += 1;
          const expectedRows =
            action === 'addRow'
              ? rows + 1
              : action === 'removeRow'
                ? rows - 1
                : action === 'turn' || action === 'square'
                  ? columns
                  : rows;
          const expectedColumns =
            action === 'addColumn'
              ? columns + 1
              : action === 'removeColumn'
                ? columns - 1
                : action === 'turn'
                  ? rows
                  : columns;
          const next = changeArray(workspace, action);
          if (
            expectedRows < 1 ||
            expectedRows > 5 ||
            expectedColumns < 1 ||
            expectedColumns > 5
          )
            expect(next).toEqual({
              ok: false,
              error: { code: 'range_exceeded' },
            });
          else
            expect(value(next)).toEqual({
              kind: 'array',
              rows: expectedRows,
              columns: expectedColumns,
            });
        }
        expect(workspace).toEqual({ kind: 'array', rows, columns });
      }
    }
    expect(states).toBe(25);
    expect(transitions).toBe(150);
  });

  it('rejects negative, nonintegral, unsafe and unsupported Explore inputs', () => {
    for (const total of [
      -1,
      21,
      1.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      rejects(splitRelationship({ kind: 'split', total, left: 0 }));
      rejects(changeSplit({ kind: 'split', total, left: 0 }, 'add'));
    }
    for (const left of [-1, 13, 0.5, NaN, Infinity])
      rejects(splitRelationship({ kind: 'split', total: 12, left }));
    for (const size of [
      -1,
      0,
      6,
      2.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      rejects(arrayRelationship({ kind: 'array', rows: size, columns: 3 }));
      rejects(arrayRelationship({ kind: 'array', rows: 3, columns: size }));
    }
    rejects(
      changeSplit({ kind: 'split', total: 12, left: 8 }, 'invented' as never),
    );
    rejects(
      changeArray({ kind: 'array', rows: 3, columns: 4 }, 'invented' as never),
    );
  });
});
