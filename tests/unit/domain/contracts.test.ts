import { describe, expect, it } from 'vitest';
import {
  conceptGraphFromDto,
  GRAPH_LIMITS,
  MATHEMATICAL_DOMAINS,
} from '../../../src/domain/concepts/graph';
import {
  expressionFromDto,
  EXPRESSION_LIMITS,
} from '../../../src/domain/expressions/expression';
import {
  geometrySceneFromDto,
  GEOMETRY_LIMITS,
  pointFromDto,
} from '../../../src/domain/geometry/scene';
import { quantityFromDto } from '../../../src/domain/measurement/quantity';
import {
  answerContractFromDto,
  evidenceScopeFromDto,
  puzzleInstanceFromDto,
  semanticTaskFromDto,
} from '../../../src/domain/puzzles/contracts';
import type {
  AssessmentEvidenceScope,
  ExploratoryExposure,
} from '../../../src/domain/puzzles/contracts';
import {
  canonicalize,
  parseCanonicalData,
} from '../../../src/domain/replay/canonical';
import {
  syntheticCrossDomainGraph,
  syntheticRootExposure,
  syntheticSquarePuzzle,
  syntheticSquareScene,
} from '../../fixtures/synthetic/cross-domain';

const literal = {
  schema: 'rational-v1',
  numerator: '16',
  denominator: '1',
} as const;
const rootExpression = {
  schema: 'expression-v1',
  root: {
    kind: 'principalSquareRoot',
    radicand: { kind: 'literal', value: literal },
  },
} as const;
const exactArea = {
  schema: 'quantity-v1',
  kind: 'exact',
  magnitude: literal,
  unitId: 'unit.square_metre',
  dimension: 'area',
} as const;

// Compiler-checked assignability proof without suppression directives.
const exposureIsNotAssessment: ExploratoryExposure extends AssessmentEvidenceScope
  ? false
  : true = true;
const assessmentIsNotExposure: AssessmentEvidenceScope extends ExploratoryExposure
  ? false
  : true = true;

function roundTrip(input: unknown): unknown {
  const serialized = canonicalize(input);
  if (!serialized.ok) throw new Error('Synthetic contract must serialize.');
  const parsed = parseCanonicalData(serialized.value);
  if (!parsed.ok) throw new Error('Synthetic contract must parse.');
  return parsed.value;
}

describe('bounded concept contracts without learner state', () => {
  it('declares all twelve independent mathematical domains', () => {
    expect(MATHEMATICAL_DOMAINS).toHaveLength(12);
    expect(new Set(MATHEMATICAL_DOMAINS).size).toBe(12);
    for (const required of [
      'geometry_spatial',
      'measurement',
      'powers_roots',
      'fractions',
      'algebra',
    ])
      expect(MATHEMATICAL_DOMAINS).toContain(required);
  });

  it('supports canonical concepts in several domains and cyclic non-gating links', () => {
    const graph = conceptGraphFromDto(roundTrip(syntheticCrossDomainGraph));
    expect(graph.ok).toBe(true);
    if (!graph.ok) return;
    const arrays = graph.value.concepts.filter(
      (concept) => concept.id === 'multiplication.rectangular_arrays',
    );
    expect(arrays).toHaveLength(1);
    expect(arrays[0]?.domains).toHaveLength(3);
    expect(graph.value).toEqual(syntheticCrossDomainGraph);
    expect(Object.keys(graph.value).sort()).toEqual([
      'concepts',
      'edges',
      'schema',
    ]);
  });

  it('rejects cycles only when recommended relations become necessary prerequisites', () => {
    const edges = syntheticCrossDomainGraph.edges.map((edge) =>
      edge.kind === 'prerequisite'
        ? { ...edge, requirement: 'necessary' }
        : edge,
    );
    expect(
      conceptGraphFromDto({ ...syntheticCrossDomainGraph, edges }).ok,
    ).toBe(false);
  });

  it('rejects duplicate concepts, dangling/self-gating/conflicting edges and malformed membership', () => {
    const base = syntheticCrossDomainGraph;
    const first = base.concepts[0];
    const necessary = base.edges[6];
    const invalid = [
      { ...base, concepts: [...base.concepts, first] },
      {
        ...base,
        concepts: [{ ...first, domains: [] }, ...base.concepts.slice(1)],
      },
      {
        ...base,
        concepts: [
          { ...first, domains: ['unknown_domain'] },
          ...base.concepts.slice(1),
        ],
      },
      {
        ...base,
        concepts: [
          { ...first, domains: ['measurement', 'measurement'] },
          ...base.concepts.slice(1),
        ],
      },
      {
        ...base,
        edges: [
          ...base.edges,
          { kind: 'related', from: first.id, to: 'missing.concept' },
        ],
      },
      { ...base, edges: [{ ...necessary, to: necessary.from }] },
      {
        ...base,
        edges: [...base.edges, { ...necessary, requirement: 'recommended' }],
      },
      {
        ...base,
        concepts: Array.from(
          { length: GRAPH_LIMITS.concepts + 1 },
          () => first,
        ),
      },
      {
        ...base,
        edges: Array.from({ length: GRAPH_LIMITS.edges + 1 }, () => necessary),
      },
    ];
    for (const graph of invalid)
      expect(conceptGraphFromDto(graph).ok).toBe(false);
  });
});

describe('exact geometry, measurement and expression data', () => {
  it('round-trips exact points and ordered logical polygon objects', () => {
    const scene = geometrySceneFromDto(roundTrip(syntheticSquareScene));
    expect(scene).toEqual({ ok: true, value: syntheticSquareScene });
    expect(
      pointFromDto(roundTrip(syntheticSquareScene.objects[0].vertices[0])).ok,
    ).toBe(true);
    expect(pointFromDto({ x: 0.1, y: 1 }).ok).toBe(false);
  });

  it('rejects scene bounds, duplicate identities, malformed vertices and presentation fields', () => {
    const object = syntheticSquareScene.objects[0];
    for (const scene of [
      { ...syntheticSquareScene, objects: [object, object] },
      {
        ...syntheticSquareScene,
        objects: [{ ...object, vertices: object.vertices.slice(0, 2) }],
      },
      {
        ...syntheticSquareScene,
        objects: [
          {
            ...object,
            vertices: Array.from(
              { length: GEOMETRY_LIMITS.vertices + 1 },
              () => object.vertices[0],
            ),
          },
        ],
      },
      {
        ...syntheticSquareScene,
        objects: Array.from(
          { length: GEOMETRY_LIMITS.objects + 1 },
          () => object,
        ),
      },
      { ...syntheticSquareScene, viewBox: '0 0 100 100' },
      { ...syntheticSquareScene, objects: [{ ...object, cssWidth: 100 }] },
    ])
      expect(geometrySceneFromDto(scene).ok).toBe(false);
  });

  it('represents exact area distinctly from length without hidden conversion or tolerance', () => {
    expect(quantityFromDto(roundTrip(exactArea))).toEqual({
      ok: true,
      value: exactArea,
    });
    expect(
      quantityFromDto({ ...exactArea, kind: 'approximate', epsilon: 0.01 }).ok,
    ).toBe(false);
    expect(quantityFromDto({ ...exactArea, dimension: 'temperature' }).ok).toBe(
      false,
    );
    expect(
      quantityFromDto({
        ...exactArea,
        magnitude: { ...literal, denominator: '0' },
      }).ok,
    ).toBe(false);
  });

  it('preserves the principal-root node independently of equation solution sets', () => {
    expect(expressionFromDto(roundTrip(rootExpression))).toEqual({
      ok: true,
      value: rootExpression,
    });
    const equation = {
      kind: 'equation',
      left: {
        schema: 'expression-v1',
        root: {
          kind: 'power',
          base: { kind: 'unknown', symbolId: 'unknown.x' },
          exponent: 2,
        },
      },
      right: {
        schema: 'expression-v1',
        root: { kind: 'literal', value: literal },
      },
    };
    expect(semanticTaskFromDto(equation).ok).toBe(true);
    expect(
      answerContractFromDto({
        kind: 'unorderedCollection',
        multiplicity: 'set',
        items: [
          { kind: 'exactValue', value: { ...literal, numerator: '-4' } },
          { kind: 'exactValue', value: { ...literal, numerator: '4' } },
        ],
      }).ok,
    ).toBe(true);
  });

  it('rejects unsupported exponent forms, raw BigInt, arbitrary executable data and excessive AST work', () => {
    const base = { kind: 'literal', value: literal };
    for (const exponent of [-1, 0.5, '2', Infinity, NaN])
      expect(
        expressionFromDto({
          schema: 'expression-v1',
          root: { kind: 'power', base, exponent },
        }).ok,
      ).toBe(false);
    expect(
      expressionFromDto({
        schema: 'expression-v1',
        root: { kind: 'literal', value: 16n },
      }).ok,
    ).toBe(false);
    expect(
      expressionFromDto({
        schema: 'expression-v1',
        root: { kind: 'javascript', source: '16' },
      }).ok,
    ).toBe(false);
    let deep: unknown = base;
    for (let i = 0; i < EXPRESSION_LIMITS.depth; i += 1)
      deep = { kind: 'principalSquareRoot', radicand: deep };
    expect(expressionFromDto({ schema: 'expression-v1', root: deep }).ok).toBe(
      false,
    );
    let wide: unknown = base;
    for (let i = 0; i < 7; i += 1)
      wide = { kind: 'add', left: wide, right: wide };
    expect(expressionFromDto({ schema: 'expression-v1', root: wide }).ok).toBe(
      false,
    );
  });
});

describe('serializable puzzle and evidence contracts without families', () => {
  it('round-trips an inclusive square/rectangle contract with narrowly declared evidence', () => {
    const puzzle = puzzleInstanceFromDto(roundTrip(syntheticSquarePuzzle));
    expect(puzzle).toEqual({ ok: true, value: syntheticSquarePuzzle });
    if (!puzzle.ok) return;
    expect(puzzle.value.evidenceScope.scopes).toHaveLength(1);
    expect(puzzle.value.evidenceScope.scopes[0]?.conceptId).toBe(
      'geometry.shape.square',
    );
    expect(JSON.stringify(puzzle.value)).not.toContain('masteryState');
  });

  it('makes exploratory exposure structurally ineligible for assessment and refuses relabeling', () => {
    expect(exposureIsNotAssessment && assessmentIsNotExposure).toBe(true);
    expect(evidenceScopeFromDto(roundTrip(syntheticRootExposure))).toEqual({
      ok: true,
      value: syntheticRootExposure,
    });
    expect(
      evidenceScopeFromDto({
        ...syntheticRootExposure,
        eligibleForMastery: true,
      }).ok,
    ).toBe(false);
    expect(
      evidenceScopeFromDto({ ...syntheticRootExposure, kind: 'assessment' }).ok,
    ).toBe(false);
    expect(
      evidenceScopeFromDto({
        ...syntheticSquarePuzzle.evidenceScope,
        mode: 'numberLab',
      }).ok,
    ).toBe(false);
    expect(
      evidenceScopeFromDto({
        ...syntheticSquarePuzzle.evidenceScope,
        scopes: [
          ...syntheticSquarePuzzle.evidenceScope.scopes,
          ...syntheticSquarePuzzle.evidenceScope.scopes,
        ],
      }).ok,
    ).toBe(false);
  });

  it('supports coordinates, exact quantities and explicit order/multiplicity/multiple answers', () => {
    const point = syntheticSquareScene.objects[0].vertices[0];
    const atom = { kind: 'exactValue', value: literal };
    for (const contract of [
      { kind: 'coordinate', expected: point },
      { kind: 'quantity', expected: exactArea, unitPolicy: 'requiredExact' },
      {
        kind: 'expression',
        expected: rootExpression,
        equivalence: 'structural',
      },
      { kind: 'oneOf', options: [atom, { kind: 'coordinate', point }] },
      { kind: 'orderedSequence', items: [atom, atom] },
      {
        kind: 'unorderedCollection',
        multiplicity: 'multiset',
        items: [atom, atom],
      },
    ])
      expect(answerContractFromDto(roundTrip(contract))).toEqual({
        ok: true,
        value: contract,
      });
  });

  it('requires perimeter answers in length dimensions and area answers in area dimensions', () => {
    const task = {
      kind: 'measureGeometry',
      scene: syntheticSquareScene,
      objectId: 'synthetic.square',
      attribute: 'area',
    };
    const puzzle = {
      ...syntheticSquarePuzzle,
      task,
      answerContract: {
        kind: 'quantity',
        expected: exactArea,
        unitPolicy: 'requiredExact',
      },
    };
    expect(puzzleInstanceFromDto(puzzle).ok).toBe(true);
    expect(
      puzzleInstanceFromDto({
        ...puzzle,
        task: { ...task, attribute: 'perimeter' },
      }).ok,
    ).toBe(false);
    expect(
      puzzleInstanceFromDto({
        ...puzzle,
        task: { ...task, attribute: 'perimeter' },
        answerContract: {
          ...puzzle.answerContract,
          expected: { ...exactArea, dimension: 'length', unitId: 'unit.metre' },
        },
      }).ok,
    ).toBe(true);
  });

  it('rejects dangling semantic references, mismatched classes, leaking fields and unknown versions', () => {
    const base = syntheticSquarePuzzle;
    for (const puzzle of [
      { ...base, task: { ...base.task, objectId: 'missing.object' } },
      {
        ...base,
        answerContract: {
          ...base.answerContract,
          expectedClassIds: ['geometry.class.circle'],
        },
      },
      {
        ...base,
        answerContract: { ...base.answerContract, selection: 'mostSpecific' },
      },
      { ...base, hintPlan: [{ kind: 'focus', objectIds: ['missing.object'] }] },
      {
        ...base,
        hintPlan: [
          {
            kind: 'workedExample',
            expression: rootExpression,
            solutionExposure: false,
          },
        ],
      },
      { ...base, task: { ...base.task, translatedText: 'Square' } },
      { ...base, learnerId: 'synthetic-player-001' },
      { ...base, semanticVersion: 'semantic-v2' },
    ])
      expect(puzzleInstanceFromDto(puzzle).ok).toBe(false);
  });

  it('never invokes accessors or accepts cyclic/prototype-bearing DTOs', () => {
    let reads = 0;
    const accessor = {
      get schema() {
        reads += 1;
        return 'expression-v1';
      },
      root: rootExpression.root,
    };
    expect(expressionFromDto(accessor).ok).toBe(false);
    const array: unknown[] = [];
    Object.defineProperty(array, '0', {
      enumerable: true,
      get() {
        reads += 1;
        return syntheticCrossDomainGraph.concepts[0];
      },
    });
    expect(
      conceptGraphFromDto({ ...syntheticCrossDomainGraph, concepts: array }).ok,
    ).toBe(false);
    expect(reads).toBe(0);
    const cyclic: Record<string, unknown> = { schema: 'expression-v1' };
    cyclic.root = { kind: 'principalSquareRoot', radicand: cyclic };
    expect(expressionFromDto(cyclic).ok).toBe(false);
    expect(quantityFromDto(Object.create(exactArea)).ok).toBe(false);
  });
});
