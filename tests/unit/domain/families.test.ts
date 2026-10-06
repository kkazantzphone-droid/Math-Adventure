import { describe, expect, it } from 'vitest';
import {
  additionTruth,
  createProofReplay,
  generateProof,
  inspectQuadrilateral,
  LENGTH_UNIT_ID,
  PROOF_CATALOG_STATUS,
  PROOF_CONTENT_VERSION,
  PROOF_FAMILIES,
  PROOF_FAMILY_IDS,
  PROOF_GENERATORS,
  unitLengthTruth,
  unitSegments,
  validateProof,
  validateProofCatalog,
} from '../../../src/domain/families/proofs';
import type { ProofFamilyId } from '../../../src/domain/families/proofs';
import { PHASE2_CONCEPT_GRAPH } from '../../../src/domain/families/concepts';
import type { DomainResult } from '../../../src/domain/core/result';
import type { RationalDto } from '../../../src/domain/math/rational';
import {
  integerPower,
  perfectSquareRoot,
} from '../../../src/domain/math/powers';
import {
  answerContractFromDto,
  puzzleInstanceFromDto,
  semanticTaskFromDto,
} from '../../../src/domain/puzzles/contracts';
import type { PuzzleInstance } from '../../../src/domain/puzzles/contracts';
import {
  canonicalize,
  parseCanonicalData,
} from '../../../src/domain/replay/canonical';
import { replayFromDto } from '../../../src/domain/replay/descriptor';
import {
  createFamilyProof,
  submitFamilyProof,
} from '../../../src/application/family-proof';
import {
  countCombinedTokens,
  countUnitIntervals,
  enumerateAdditionPairs,
  enumerateQuadrilaterals,
  enumerateUnitSegments,
  ORACLE_CASE_COUNTS,
  QUADRILATERAL_HAND_FIXTURES,
  quadrilateralClasses,
} from '../../oracle/family-proof';
import type { OraclePoint } from '../../oracle/family-proof';

const seed = '00000001000000020000000300000004';
const mixedSeed = '0123456789abcdefdeadbeeffedcba98';

function value<T>(result: DomainResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok)
    throw new Error(`Unexpected test failure: ${result.error.code}`);
  return result.value;
}

function rational(numerator: number | string, denominator = '1'): RationalDto {
  return { schema: 'rational-v1', numerator: String(numerator), denominator };
}

function point(input: OraclePoint) {
  return { x: rational(input.x), y: rational(input.y) };
}

function polygon(vertices: readonly OraclePoint[]) {
  return {
    schema: 'geometry-scene-v1',
    objects: [
      { kind: 'polygon', id: 'outline', vertices: vertices.map(point) },
    ],
  };
}

function segment(start: OraclePoint, end: OraclePoint) {
  return {
    schema: 'geometry-scene-v1',
    objects: [
      { kind: 'segment', id: 'length', start: point(start), end: point(end) },
    ],
  };
}

function instance(
  familyId: ProofFamilyId,
  inputSeed = seed,
  maximum?: number,
): PuzzleInstance {
  return value(
    generateProof(value(createProofReplay(familyId, inputSeed, maximum))),
  );
}

function quantity(
  magnitude: number,
  dimension = 'length',
  unitId = LENGTH_UNIT_ID,
) {
  return {
    kind: 'quantity',
    quantity: {
      schema: 'quantity-v1',
      kind: 'exact',
      magnitude: rational(magnitude),
      unitId,
      dimension,
    },
  };
}

function assertRejected(result: DomainResult<unknown>, code?: string): void {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(Object.keys(result.error)).toEqual(['code']);
    if (code) expect(result.error.code).toBe(code);
  }
}

describe('independent exhaustive mathematical truth for the three bounded families', () => {
  it('matches disjoint-token cardinality for all 36 addition pairs and 91 supported-spec cases', () => {
    const cases = enumerateAdditionPairs();
    expect(cases).toHaveLength(ORACLE_CASE_COUNTS.addition);
    let checked = 0;
    for (let maximum = 0; maximum <= 5; maximum += 1) {
      for (const fixture of cases.filter(
        ({ left, right }) => left <= maximum && right <= maximum,
      )) {
        expect(value(additionTruth(fixture.left, fixture.right))).toEqual(
          rational(fixture.expected),
        );
        checked += 1;
      }
    }
    expect(checked).toBe(91);
    for (const [a, b, expected] of [
      [0, 0, 0],
      [0, 5, 5],
      [2, 3, 5],
      [5, 5, 10],
    ]) {
      expect(value(additionTruth(a, b))).toEqual(rational(expected ?? -1));
    }
  });

  it('matches independent diagonal classification for all 1152 transform states and 1792 supported-spec cases', () => {
    const cases = enumerateQuadrilaterals();
    expect(cases).toHaveLength(ORACLE_CASE_COUNTS.quadrilateral);
    let checked = 0;
    for (let maximum = 1; maximum <= 3; maximum += 1) {
      for (const fixture of cases.filter(
        ({ state }) => state.width <= maximum && state.height <= maximum,
      )) {
        expect(quadrilateralClasses(fixture.vertices)).toEqual(
          fixture.expectedClasses,
        );
        expect(
          value(inspectQuadrilateral(polygon(fixture.vertices))).classIds,
        ).toEqual(fixture.expectedClasses.map((id) => `geometry.${id}`));
        checked += 1;
      }
    }
    expect(checked).toBe(1792);
  });

  it.each(QUADRILATERAL_HAND_FIXTURES)(
    'independently checks hand-derived geometry: $name',
    (fixture) => {
      expect(quadrilateralClasses(fixture.vertices)).toEqual(
        fixture.expectedClasses,
      );
      const actual = inspectQuadrilateral(polygon(fixture.vertices));
      if (fixture.expectedClasses.length === 0) assertRejected(actual);
      else
        expect(value(actual).classIds).toEqual(
          fixture.expectedClasses.map((id) => `geometry.${id}`),
        );
    },
  );

  it('matches walked unit intervals for all 32 oriented segments and 144 supported-spec cases', () => {
    const cases = enumerateUnitSegments();
    expect(cases).toHaveLength(ORACLE_CASE_COUNTS.unitSegment);
    let checked = 0;
    for (let maximum = 1; maximum <= 8; maximum += 1) {
      for (const fixture of cases.filter(({ length }) => length <= maximum)) {
        expect(countUnitIntervals(fixture.start, fixture.end)).toBe(
          fixture.expected,
        );
        const scene = segment(fixture.start, fixture.end);
        expect(value(unitLengthTruth(scene))).toBe(fixture.expected);
        const units = value(unitSegments(scene));
        expect(units).toHaveLength(fixture.expected);
        expect(units[0]?.start).toEqual(point(fixture.start));
        expect(units.at(-1)?.end).toEqual(point(fixture.end));
        units.forEach((unit, index) => {
          const start = {
            x: Number(unit.start.x.numerator),
            y: Number(unit.start.y.numerator),
          };
          const end = {
            x: Number(unit.end.x.numerator),
            y: Number(unit.end.y.numerator),
          };
          expect(countUnitIntervals(start, end)).toBe(1);
          if (index > 0) expect(unit.start).toEqual(units[index - 1]?.end);
        });
        checked += 1;
      }
    }
    expect(checked).toBe(144);
  });

  it('rejects out-of-bound and noninteger mathematical inputs without float tolerance', () => {
    for (const invalid of [-1, 6, 0.5, NaN, Infinity, '2', null, 2n]) {
      assertRejected(additionTruth(invalid, 1));
      assertRejected(additionTruth(1, invalid));
    }
    for (const [start, end] of [
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
      [
        { x: 0, y: 0 },
        { x: 9, y: 0 },
      ],
      [
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
      ],
    ] as const)
      assertRejected(unitLengthTruth(segment(start, end)));
    assertRejected(
      inspectQuadrilateral(
        polygon([
          { x: 0, y: 0 },
          { x: 9, y: 0 },
          { x: 9, y: 1 },
          { x: 0, y: 1 },
        ]),
      ),
    );
  });
});

describe('versioned generation, answer integrity and golden replay', () => {
  it('keeps known independent-reference seeds mapped to exact semantic instances', () => {
    for (const [inputSeed, a, b] of [
      [seed, 0, 0],
      [mixedSeed, 2, 3],
    ] as const) {
      const addition = instance('number.addition', inputSeed);
      expect(addition.task).toEqual({
        kind: 'evaluateExpression',
        expression: {
          schema: 'expression-v1',
          root: {
            kind: 'add',
            left: { kind: 'literal', value: rational(a) },
            right: { kind: 'literal', value: rational(b) },
          },
        },
      });
      expect(addition.answerContract).toEqual({
        kind: 'exactValue',
        expected: rational(countCombinedTokens(a, b)),
      });
    }
    expect(instance('geometry.quadrilateral').task).toEqual({
      kind: 'classifyGeometry',
      scene: polygon([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 2 },
        { x: 0, y: 2 },
      ]),
      objectId: 'outline',
      classIds: [
        'geometry.parallelogram',
        'geometry.rectangle',
        'geometry.square',
      ],
    });
    expect(instance('geometry.quadrilateral', mixedSeed).task).toEqual({
      kind: 'classifyGeometry',
      scene: polygon([
        { x: -6, y: -2 },
        { x: -6, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: -2 },
      ]),
      objectId: 'outline',
      classIds: [
        'geometry.parallelogram',
        'geometry.rectangle',
        'geometry.square',
      ],
    });
    expect(instance('measurement.unit-length').task).toEqual({
      kind: 'measureGeometry',
      scene: segment({ x: 0, y: 0 }, { x: 1, y: 0 }),
      objectId: 'length',
      attribute: 'length',
    });
    expect(instance('measurement.unit-length', mixedSeed).task).toEqual({
      kind: 'measureGeometry',
      scene: segment({ x: 0, y: 0 }, { x: 0, y: -1 }),
      objectId: 'length',
      attribute: 'length',
    });
    for (const family of PROOF_FAMILY_IDS) {
      for (const inputSeed of [
        seed,
        mixedSeed,
        'ffffffffffffffffffffffffffffffff',
      ]) {
        const generated = instance(family, inputSeed);
        const encoded = value(canonicalize(generated.replay));
        const detached = value(parseCanonicalData(encoded));
        expect(value(generateProof(detached))).toEqual(generated);
        expect(value(replayFromDto(detached))).toEqual(generated.replay);
        expect(
          value(
            generateProof({
              ...generated.replay,
              seedHex: inputSeed.toUpperCase(),
            }),
          ),
        ).toEqual(generated);
      }
    }
  });

  it('validates number answers against independent counting and rejects malformed answers', () => {
    const generated = instance('number.addition', mixedSeed);
    expect(
      validateProof(generated, { kind: 'exactValue', value: rational(5) }),
    ).toEqual({ ok: true, value: { correct: true } });
    expect(
      validateProof(generated, { kind: 'exactValue', value: rational(6) }),
    ).toEqual({ ok: true, value: { correct: false } });
    // Exact DTOs admit only the canonical reduced spelling, including answers.
    assertRejected(
      validateProof(generated, {
        kind: 'exactValue',
        value: rational(10, '2'),
      }),
    );
    for (const answer of [
      null,
      {},
      5,
      '5',
      { kind: 'exactValue', value: rational('05') },
      { kind: 'exactValue', value: rational(5, '0') },
      { kind: 'exactValue', value: rational(5), extra: true },
      { kind: 'classification', classIds: ['geometry.square'] },
    ])
      assertRejected(validateProof(generated, answer));
  });

  it('retains inclusive square classification with unordered exact sets and rejects duplicates', () => {
    const generated = instance('geometry.quadrilateral');
    const classes = [
      'geometry.parallelogram',
      'geometry.rectangle',
      'geometry.square',
    ];
    for (const classIds of [
      classes,
      [...classes].reverse(),
      [classes[1], classes[2], classes[0]],
    ]) {
      expect(
        validateProof(generated, { kind: 'classification', classIds }),
      ).toEqual({ ok: true, value: { correct: true } });
    }
    expect(
      validateProof(generated, {
        kind: 'classification',
        classIds: ['geometry.square'],
      }),
    ).toEqual({ ok: true, value: { correct: false } });
    for (const classIds of [
      [],
      [...classes, 'geometry.square'],
      ['geometry.triangle'],
    ])
      assertRejected(
        validateProof(generated, { kind: 'classification', classIds }),
      );
  });

  it('requires exact length dimension and declared unit, never area or a same-number substitute unit', () => {
    const generated = instance('measurement.unit-length');
    expect(validateProof(generated, quantity(1))).toEqual({
      ok: true,
      value: { correct: true },
    });
    expect(validateProof(generated, quantity(2))).toEqual({
      ok: true,
      value: { correct: false },
    });
    assertRejected(validateProof(generated, quantity(1, 'area')));
    assertRejected(
      validateProof(generated, quantity(1, 'length', 'unit.metre')),
    );
    assertRejected(
      validateProof(generated, quantity(1, 'length', 'unit.square-step')),
    );
    assertRejected(
      validateProof(generated, { kind: 'exactValue', value: rational(1) }),
    );
  });

  it.each(PROOF_FAMILY_IDS)(
    'rejects changed task, contract, hint, evidence or identity for genuine replay %s',
    (familyId) => {
      const generated = instance(familyId);
      const submitted =
        familyId === 'number.addition'
          ? { kind: 'exactValue', value: rational(0) }
          : familyId === 'geometry.quadrilateral'
            ? {
                kind: 'classification',
                classIds: [
                  'geometry.parallelogram',
                  'geometry.rectangle',
                  'geometry.square',
                ],
              }
            : quantity(1);
      const other = instance(familyId, mixedSeed);
      const changes = [
        { ...generated, instanceId: 'forged.instance' },
        { ...generated, task: other.task },
        {
          ...generated,
          answerContract: { kind: 'exactValue', expected: rational(99) },
        },
        { ...generated, hintPlan: [] },
        {
          ...generated,
          hintPlan: [
            { kind: 'constraintReminder', constraintId: 'foreign.reminder' },
          ],
        },
        {
          ...generated,
          evidenceScope: {
            kind: 'assessment',
            mode: 'diagnostic',
            eligibleForMastery: true,
            scopes: [
              {
                conceptId: 'counting.cardinality',
                representationId: 'representation.foreign',
              },
            ],
          },
        },
        {
          ...generated,
          evidenceScope: {
            kind: 'exploratoryExposure',
            mode: 'exploration',
            eligibleForMastery: false,
            retention: 'sessionOnly',
            scopes: generated.evidenceScope.scopes,
          },
        },
      ];
      for (const altered of changes)
        assertRejected(validateProof(altered, submitted));
      expect(validateProof(generated, submitted)).toEqual({
        ok: true,
        value: { correct: true },
      });
    },
  );

  it.each(PROOF_FAMILY_IDS)(
    'rejects malformed specs and incompatible replay versions for %s',
    (familyId) => {
      const replay = instance(familyId).replay;
      const maximum =
        familyId === 'number.addition'
          ? 5
          : familyId === 'geometry.quadrilateral'
            ? 3
            : 8;
      const minimum = familyId === 'number.addition' ? 0 : 1;
      for (const spec of [
        {},
        { maximum: minimum - 1 },
        { maximum: maximum + 1 },
        { maximum: '2' },
        { maximum: 1.5 },
        { maximum: null },
        { maximum, extra: true },
      ])
        assertRejected(generateProof({ ...replay, spec }));
      for (const changed of [
        { ...replay, generatorVersion: 'other-generator-v1' },
        { ...replay, contentVersion: 'other-content-v1' },
        { ...replay, semanticVersion: 'semantic-v2' },
        { ...replay, rngAlgorithm: 'other-rng-v1' },
        { ...replay, canonicalization: 'canonical-json-v2' },
      ])
        assertRejected(generateProof(changed), 'unsupported_version');
      assertRejected(
        generateProof({
          ...replay,
          seedHex: '00000000000000000000000000000000',
        }),
      );
      assertRejected(
        generateProof({ ...replay, familyId: 'unknown.family' }),
        'unsupported_domain',
      );
      for (const invalid of [
        null,
        {},
        3,
        'seed',
        { ...replay, injected: true },
      ])
        assertRejected(generateProof(invalid));
    },
  );

  it('makes distinct maxima distinct identities even when the semantic task happens to match', () => {
    const small = instance('number.addition', seed, 0);
    const large = instance('number.addition', seed, 5);
    expect(small.task).toEqual(large.task);
    expect(small.instanceId).not.toBe(large.instanceId);
    expect(small.replay).not.toEqual(large.replay);
  });
});

describe('bounded semantic hints, connected catalog and prospective evidence contracts', () => {
  it('derives only two semantic hints for each supported task without changing its mathematics', () => {
    for (const [index, family] of PROOF_FAMILIES.entries()) {
      const familyId = PROOF_FAMILY_IDS[index];
      if (!familyId) throw new Error('Missing static family.');
      const generated = instance(familyId);
      const before = value(canonicalize(generated.task));
      for (let level = 0; level <= 1; level += 1)
        expect(value(family.deriveHint(generated.task, level))).toEqual(
          generated.hintPlan[level],
        );
      for (const level of [-1, 2, 0.5, NaN, Infinity])
        assertRejected(family.deriveHint(generated.task, level));
      expect(value(canonicalize(generated.task))).toBe(before);
      expect(JSON.stringify(generated.hintPlan)).not.toMatch(
        /workedExample|solutionExposure|English|Greek|correct|answer/,
      );
      for (const otherId of PROOF_FAMILY_IDS.filter((id) => id !== familyId))
        assertRejected(family.deriveHint(instance(otherId).task, 0));
    }
  });

  it('rejects family-incompatible hint tasks even when their general DTO schema is valid', () => {
    const [addition, geometry, measurement] = PROOF_FAMILIES;
    if (!addition || !geometry || !measurement)
      throw new Error('Missing static families.');
    const expression = (left: number, right: number, kind = 'add') => ({
      kind: 'evaluateExpression',
      expression: {
        schema: 'expression-v1',
        root: {
          kind,
          left: { kind: 'literal', value: rational(left) },
          right: { kind: 'literal', value: rational(right) },
        },
      },
    });
    for (const task of [
      expression(6, 1),
      expression(-1, 1),
      expression(1, 1, 'multiply'),
      {
        kind: 'evaluateExpression',
        expression: {
          schema: 'expression-v1',
          root: {
            kind: 'add',
            left: { kind: 'literal', value: rational(1, '2') },
            right: { kind: 'literal', value: rational(1) },
          },
        },
      },
      {
        kind: 'evaluateExpression',
        expression: {
          schema: 'expression-v1',
          root: {
            kind: 'principalSquareRoot',
            radicand: { kind: 'literal', value: rational(16) },
          },
        },
      },
    ])
      assertRejected(addition.deriveHint(value(semanticTaskFromDto(task)), 0));
    const geometryTask = instance('geometry.quadrilateral').task;
    if (geometryTask.kind !== 'classifyGeometry')
      throw new Error('Unexpected geometry task.');
    for (const task of [
      { ...geometryTask, classIds: ['geometry.square'] },
      {
        ...geometryTask,
        objectId: 'foreign.outline',
        scene: {
          ...geometryTask.scene,
          objects: geometryTask.scene.objects.map((object) => ({
            ...object,
            id: 'foreign.outline',
          })),
        },
      },
      {
        ...geometryTask,
        scene: polygon([
          { x: 0, y: 0 },
          { x: 3, y: 0 },
          { x: 2, y: 2 },
          { x: 0, y: 2 },
        ]),
      },
    ])
      assertRejected(geometry.deriveHint(value(semanticTaskFromDto(task)), 0));
    const measureTask = instance('measurement.unit-length').task;
    if (measureTask.kind !== 'measureGeometry')
      throw new Error('Unexpected measurement task.');
    for (const task of [
      { ...measureTask, attribute: 'area' },
      { ...measureTask, scene: segment({ x: 0, y: 0 }, { x: 3, y: 4 }) },
      {
        ...measureTask,
        objectId: 'foreign.length',
        scene: {
          ...measureTask.scene,
          objects: measureTask.scene.objects.map((object) => ({
            ...object,
            id: 'foreign.length',
          })),
        },
      },
    ])
      assertRejected(
        measurement.deriveHint(value(semanticTaskFromDto(task)), 0),
      );
    const generated = instance('number.addition');
    assertRejected(
      puzzleInstanceFromDto({
        ...generated,
        hintPlan: [
          { kind: 'constraintReminder', constraintId: 'Join these groups now' },
        ],
      }),
    );
    assertRejected(
      puzzleInstanceFromDto({
        ...generated,
        hintPlan: [
          {
            kind: 'workedExample',
            expression: {
              schema: 'expression-v1',
              root: { kind: 'literal', value: rational(0) },
            },
            solutionExposure: false,
          },
        ],
      }),
    );
  });

  it('declares one immutable ordered catalog and one connected graph without age or prerequisite gates', () => {
    expect(PROOF_CATALOG_STATUS).toEqual({ ok: true, value: true });
    expect(validateProofCatalog()).toEqual(PROOF_CATALOG_STATUS);
    expect(PROOF_FAMILY_IDS).toEqual([
      'number.addition',
      'geometry.quadrilateral',
      'measurement.unit-length',
    ]);
    expect(PROOF_GENERATORS).toEqual([
      'addition-bounded-v1',
      'quadrilateral-bounded-v1',
      'unit-length-bounded-v1',
    ]);
    expect(PROOF_CONTENT_VERSION).toBe('phase2-content-v1');
    expect(PROOF_FAMILIES.map((family) => family.metadata.familyId)).toEqual(
      PROOF_FAMILY_IDS,
    );
    expect(Object.isFrozen(PROOF_FAMILIES)).toBe(true);
    for (const family of PROOF_FAMILIES) {
      expect(Object.isFrozen(family)).toBe(true);
      expect(Object.isFrozen(family.metadata)).toBe(true);
      expect(Object.isFrozen(family.metadata.conceptCoverage)).toBe(true);
      expect(family.metadata.difficultyDimensions).toHaveLength(1);
      expect(family.metadata.conceptCoverage).toHaveLength(1);
      expect(family.metadata.accessibilityEvidence).toBe('declaredPerInstance');
    }
    const graph = value(PHASE2_CONCEPT_GRAPH);
    expect(graph.concepts).toHaveLength(8);
    expect(graph.edges).toHaveLength(7);
    expect(graph.edges.every((edge) => edge.kind !== 'prerequisite')).toBe(
      true,
    );
    const seen = new Set<string>([graph.concepts[0]?.id ?? '']);
    for (let pass = 0; pass < graph.concepts.length; pass += 1) {
      for (const edge of graph.edges)
        if (seen.has(edge.from) || seen.has(edge.to)) {
          seen.add(edge.from);
          seen.add(edge.to);
        }
    }
    expect(seen.size).toBe(graph.concepts.length);
    expect(
      graph.concepts.find(({ id }) => id === 'geometry.square-unit-array')
        ?.domains,
    ).toEqual(['geometry_spatial', 'measurement']);
    expect(graph.edges).toContainEqual({
      kind: 'inverseOf',
      from: 'powers.square-numbers',
      to: 'roots.perfect-square',
    });
    expect(JSON.stringify(graph)).not.toMatch(/age|year|grade|global.level/);
  });

  it('keeps each evidence declaration prospective and singular and omits expected answers from presentation data', () => {
    for (const [index, familyId] of PROOF_FAMILY_IDS.entries()) {
      const generated = instance(familyId);
      expect(generated.evidenceScope).toEqual({
        kind: 'assessment',
        mode: 'practice',
        eligibleForMastery: true,
        scopes: [
          {
            conceptId: PROOF_FAMILIES[index]?.metadata.conceptCoverage[0],
            representationId:
              PROOF_FAMILIES[index]?.metadata.representationCapabilities[0],
          },
        ],
      });
      const proof = value(createFamilyProof(familyId, seed));
      expect(proof.task).toEqual(generated.task);
      expect(Object.keys(proof)).not.toContain('answerContract');
      expect(Object.keys(proof)).not.toContain('evidenceScope');
      expect(JSON.stringify(proof)).not.toMatch(
        /expectedClassIds|eligibleForMastery|learner|profile|observation|history|mastery/,
      );
      expect(Object.keys(generated).sort()).toEqual([
        'answerContract',
        'evidenceScope',
        'hintPlan',
        'instanceId',
        'replay',
        'schema',
        'semanticVersion',
        'task',
      ]);
      const answer =
        familyId === 'number.addition'
          ? { kind: 'exactValue', value: rational(0) }
          : familyId === 'geometry.quadrilateral'
            ? {
                kind: 'classification',
                classIds: [
                  'geometry.parallelogram',
                  'geometry.rectangle',
                  'geometry.square',
                ],
              }
            : quantity(1);
      expect(submitFamilyProof(proof.replay, answer)).toEqual({
        ok: true,
        value: { correct: true },
      });
      expect(value(createFamilyProof(familyId, seed))).toEqual(proof);
    }
  });

  it('preserves typed square/principal-root readiness distinctly from an equation with two real solutions', () => {
    const rootTask = value(
      semanticTaskFromDto({
        kind: 'evaluateExpression',
        expression: {
          schema: 'expression-v1',
          root: {
            kind: 'principalSquareRoot',
            radicand: { kind: 'literal', value: rational(16) },
          },
        },
      }),
    );
    expect(rootTask.kind).toBe('evaluateExpression');
    expect(
      value(
        answerContractFromDto({ kind: 'exactValue', expected: rational(4) }),
      ),
    ).toEqual({ kind: 'exactValue', expected: rational(4) });
    expect(perfectSquareRoot(16n)).toEqual({ ok: true, value: 4n });
    expect(integerPower(4n, 2)).toEqual({ ok: true, value: 16n });
    expect(integerPower(-4n, 2)).toEqual({ ok: true, value: 16n });
    const equation = value(
      semanticTaskFromDto({
        kind: 'equation',
        left: {
          schema: 'expression-v1',
          root: {
            kind: 'power',
            base: { kind: 'unknown', symbolId: 'x' },
            exponent: 2,
          },
        },
        right: {
          schema: 'expression-v1',
          root: { kind: 'literal', value: rational(16) },
        },
      }),
    );
    expect(equation.kind).toBe('equation');
    expect(
      value(
        answerContractFromDto({
          kind: 'oneOf',
          options: [
            { kind: 'exactValue', value: rational(-4) },
            { kind: 'exactValue', value: rational(4) },
          ],
        }),
      ),
    ).toEqual({
      kind: 'oneOf',
      options: [
        { kind: 'exactValue', value: rational(-4) },
        { kind: 'exactValue', value: rational(4) },
      ],
    });
    expect(PROOF_FAMILY_IDS).toHaveLength(3);
  });
});
