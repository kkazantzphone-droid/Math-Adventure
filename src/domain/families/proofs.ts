import { dataRecord, hasKeys } from '../core/data';
import { identifier } from '../core/identifiers';
import type { Identifier, IdentifierKind } from '../core/identifiers';
import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import { geometrySceneFromDto } from '../geometry/scene';
import type { ExactPoint, GeometryScene } from '../geometry/scene';
import { addIntegers, naturalSafeInteger } from '../math/integer';
import { rationalFromDto, rationalToSafeInteger } from '../math/rational';
import type { RationalDto } from '../math/rational';
import { boundedChoice, parseSeed } from '../random/xoshiro';
import { canonicalize } from '../replay/canonical';
import { replayFromDto, requireReplaySupport } from '../replay/descriptor';
import type { ReplayDescriptor } from '../replay/descriptor';
import {
  puzzleInstanceFromDto,
  semanticTaskFromDto,
  structuredAnswerFromDto,
} from '../puzzles/contracts';
import type {
  AnswerContract,
  PuzzleInstance,
  SemanticHint,
  SemanticTask,
} from '../puzzles/contracts';
import type { FamilyMetadata, PuzzleFamily } from '../puzzles/family';
import { PHASE2_CONCEPT_GRAPH } from './concepts';

export const PROOF_FAMILY_IDS = Object.freeze([
  'number.addition',
  'geometry.quadrilateral',
  'measurement.unit-length',
] as const);
export type ProofFamilyId = (typeof PROOF_FAMILY_IDS)[number];
export const PROOF_CONTENT_VERSION = 'phase2-content-v1';
export const PROOF_GENERATORS = Object.freeze([
  'addition-bounded-v1',
  'quadrilateral-bounded-v1',
  'unit-length-bounded-v1',
] as const);
export const LENGTH_UNIT_ID = 'unit.length-step';
const limits = [5, 3, 8] as const;
const minimums = [0, 1, 1] as const;
const concepts = [
  'addition.part-whole',
  'geometry.quadrilateral.attributes',
  'measurement.length.unit-iteration',
] as const;
const representations = [
  'representation.addition-groups',
  'representation.geometry-attributes',
  'representation.unit-iteration',
] as const;

function id<K extends IdentifierKind>(kind: K, value: string): Identifier<K> {
  const checked = identifier(kind, value);
  if (!checked.ok) throw new Error('Invalid static family identifier');
  return checked.value;
}

function integerDto(value: number): RationalDto {
  return {
    schema: 'rational-v1',
    numerator: String(value === 0 ? 0 : value),
    denominator: '1',
  };
}

function boundedInteger(
  input: unknown,
  minimum: number,
  maximum: number,
): input is number {
  return (
    typeof input === 'number' &&
    Number.isSafeInteger(input) &&
    input >= minimum &&
    input <= maximum
  );
}

function coordinate(input: RationalDto): DomainResult<number> {
  const value = rationalFromDto(input);
  if (!value.ok) return value;
  const integer = rationalToSafeInteger(value.value);
  return integer.ok && boundedInteger(integer.value, -8, 8)
    ? success(integer.value)
    : failure('invalid_input');
}

export function additionTruth(
  left: unknown,
  right: unknown,
): DomainResult<RationalDto> {
  if (!boundedInteger(left, 0, 5) || !boundedInteger(right, 0, 5))
    return failure('invalid_input');
  const a = naturalSafeInteger(left);
  const b = naturalSafeInteger(right);
  if (!a.ok || !b.ok) return failure('invalid_input');
  const total = addIntegers(a.value, b.value);
  return total.ok ? success(integerDto(total.value)) : total;
}

export interface QuadrilateralAttributes {
  readonly classIds: readonly string[];
  readonly sideLengthSquares: readonly number[];
  readonly rightAngles: readonly boolean[];
}

/** Bounded exact convex parallelograms only; no general geometry claim. */
export function inspectQuadrilateral(
  input: unknown,
): DomainResult<QuadrilateralAttributes> {
  const scene = geometrySceneFromDto(input);
  if (!scene.ok || scene.value.objects.length !== 1)
    return failure('invalid_input');
  const polygon = scene.value.objects[0];
  if (!polygon || polygon.kind !== 'polygon' || polygon.vertices.length !== 4)
    return failure('invalid_input');
  const points: { x: number; y: number }[] = [];
  for (const point of polygon.vertices) {
    const x = coordinate(point.x);
    const y = coordinate(point.y);
    if (!x.ok || !y.ok) return failure('invalid_input');
    points.push({ x: x.value, y: y.value });
  }
  const edges = points.map((point, index) => {
    const next = points[(index + 1) % 4];
    return next ? { x: next.x - point.x, y: next.y - point.y } : { x: 0, y: 0 };
  });
  const [a, b, c, d] = edges;
  if (
    !a ||
    !b ||
    !c ||
    !d ||
    a.x !== -c.x ||
    a.y !== -c.y ||
    b.x !== -d.x ||
    b.y !== -d.y ||
    a.x * b.y - a.y * b.x === 0
  )
    return failure('invalid_input');
  const sideLengthSquares = edges.map(
    (edge) => edge.x * edge.x + edge.y * edge.y,
  );
  const rightAngles = edges.map((edge, index) => {
    const next = edges[(index + 1) % 4];
    return next !== undefined && edge.x * next.x + edge.y * next.y === 0;
  });
  const rectangle = rightAngles.every(Boolean);
  const square =
    rectangle &&
    sideLengthSquares.every((value) => value === sideLengthSquares[0]);
  return success({
    classIds: [
      'geometry.parallelogram',
      ...(rectangle ? ['geometry.rectangle'] : []),
      ...(square ? ['geometry.square'] : []),
    ],
    sideLengthSquares,
    rightAngles,
  });
}

/** One declared unit is one logical coordinate step, never a device length. */
export function unitLengthTruth(input: unknown): DomainResult<number> {
  const scene = geometrySceneFromDto(input);
  if (!scene.ok || scene.value.objects.length !== 1)
    return failure('invalid_input');
  const segment = scene.value.objects[0];
  if (!segment || segment.kind !== 'segment') return failure('invalid_input');
  const sx = coordinate(segment.start.x),
    sy = coordinate(segment.start.y);
  const ex = coordinate(segment.end.x),
    ey = coordinate(segment.end.y);
  if (!sx.ok || !sy.ok || !ex.ok || !ey.ok) return failure('invalid_input');
  const dx = ex.value - sx.value,
    dy = ey.value - sy.value;
  if (dx !== 0 && dy !== 0) return failure('invalid_input');
  const length = Math.abs(dx) + Math.abs(dy);
  return boundedInteger(length, 1, 8)
    ? success(length)
    : failure('invalid_input');
}

export function unitSegments(
  input: unknown,
): DomainResult<
  readonly { readonly start: ExactPoint; readonly end: ExactPoint }[]
> {
  const length = unitLengthTruth(input);
  const scene = geometrySceneFromDto(input);
  if (!length.ok) return length;
  if (!scene.ok) return scene;
  const segment = scene.value.objects[0];
  if (!segment || segment.kind !== 'segment') return failure('invalid_input');
  const sx = coordinate(segment.start.x),
    sy = coordinate(segment.start.y);
  const ex = coordinate(segment.end.x),
    ey = coordinate(segment.end.y);
  if (!sx.ok || !sy.ok || !ex.ok || !ey.ok) return failure('invalid_input');
  const dx = Math.sign(ex.value - sx.value),
    dy = Math.sign(ey.value - sy.value);
  const point = (i: number): ExactPoint => ({
    x: integerDto(sx.value + dx * i),
    y: integerDto(sy.value + dy * i),
  });
  return success(
    Array.from({ length: length.value }, (_, i) => ({
      start: point(i),
      end: point(i + 1),
    })),
  );
}

function rotate(x: number, y: number, turn: number): ExactPoint {
  const pair =
    turn === 0
      ? [x, y]
      : turn === 1
        ? [-y, x]
        : turn === 2
          ? [-x, -y]
          : [y, -x];
  return { x: integerDto(pair[0] ?? 0), y: integerDto(pair[1] ?? 0) };
}

function semantic(
  index: number,
  dimensions: readonly number[],
): DomainResult<{ task: SemanticTask; answer: AnswerContract }> {
  const [a, b, shear, turn, scale, start, winding] = dimensions;
  if (a === undefined) return failure('invalid_input');
  if (index === 0) {
    const expected = additionTruth(a, b);
    if (!expected.ok || b === undefined) return failure('invalid_input');
    return success({
      task: {
        kind: 'evaluateExpression',
        expression: {
          schema: 'expression-v1',
          root: {
            kind: 'add',
            left: { kind: 'literal', value: integerDto(a) },
            right: { kind: 'literal', value: integerDto(b) },
          },
        },
      },
      answer: { kind: 'exactValue', expected: expected.value },
    });
  }
  if (index === 1) {
    if (
      b === undefined ||
      shear === undefined ||
      turn === undefined ||
      scale === undefined ||
      start === undefined ||
      winding === undefined
    )
      return failure('invalid_input');
    const base = [
      [0, 0],
      [a, 0],
      [a + shear, b],
      [shear, b],
    ];
    const transformed = base.map((point) =>
      rotate((point[0] ?? 0) * scale, (point[1] ?? 0) * scale, turn),
    );
    const vertices = transformed
      .map((_, i) => transformed[(start + (winding === 0 ? i : -i) + 4) % 4])
      .filter((point): point is ExactPoint => point !== undefined);
    const scene: GeometryScene = {
      schema: 'geometry-scene-v1',
      objects: [
        { kind: 'polygon', id: id('semanticObject', 'outline'), vertices },
      ],
    };
    const attributes = inspectQuadrilateral(scene);
    if (!attributes.ok) return attributes;
    return success({
      task: {
        kind: 'classifyGeometry',
        scene,
        objectId: id('semanticObject', 'outline'),
        classIds: [
          'geometry.parallelogram',
          'geometry.rectangle',
          'geometry.square',
        ],
      },
      answer: {
        kind: 'classification',
        expectedClassIds: attributes.value.classIds,
        selection: 'allApplicable',
      },
    });
  }
  const scene: GeometryScene = {
    schema: 'geometry-scene-v1',
    objects: [
      {
        kind: 'segment',
        id: id('semanticObject', 'length'),
        start: rotate(0, 0, b ?? 0),
        end: rotate(a, 0, b ?? 0),
      },
    ],
  };
  const length = unitLengthTruth(scene);
  if (!length.ok) return length;
  return success({
    task: {
      kind: 'measureGeometry',
      scene,
      objectId: id('semanticObject', 'length'),
      attribute: 'length',
    },
    answer: {
      kind: 'quantity',
      expected: {
        schema: 'quantity-v1',
        kind: 'exact',
        magnitude: integerDto(length.value),
        unitId: id('unit', LENGTH_UNIT_ID),
        dimension: 'length',
      },
      unitPolicy: 'requiredExact',
    },
  });
}

function hints(index: number): readonly SemanticHint[] {
  if (index === 0)
    return [
      {
        kind: 'representationChange',
        representationId: id(
          'representation',
          'representation.addition-groups',
        ),
      },
      { kind: 'constraintReminder', constraintId: 'addition.join-groups' },
    ];
  return [
    {
      kind: 'focus',
      objectIds: [id('semanticObject', index === 1 ? 'outline' : 'length')],
    },
    {
      kind: 'constraintReminder',
      constraintId:
        index === 1
          ? 'geometry.equal-sides-right-angles'
          : 'measurement.same-unit-no-gaps',
    },
  ];
}

function freezeStatic<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value)) freezeStatic(nested);
    Object.freeze(value);
  }
  return value;
}

function metadata(index: number, familyId: ProofFamilyId): FamilyMetadata {
  const minimum = naturalSafeInteger(minimums[index]);
  const maximum = naturalSafeInteger(limits[index]);
  if (!minimum.ok || !maximum.ok || minimum.value > maximum.value)
    throw new Error('Invalid static family bounds');
  return freezeStatic({
    familyId: id('family', familyId),
    generatorVersion: id('generatorVersion', PROOF_GENERATORS[index] ?? ''),
    contentVersion: id('contentVersion', PROOF_CONTENT_VERSION),
    conceptCoverage: [id('concept', concepts[index] ?? '')],
    difficultyDimensions: [
      {
        kind: 'naturalBound',
        id: id('representation', 'dimension.maximum'),
        minimum: minimum.value,
        maximum: maximum.value,
      },
    ],
    representationCapabilities: [
      id('representation', representations[index] ?? ''),
    ],
    accessibilityEvidence: 'declaredPerInstance',
    localisationKeyReferences: [
      'proof.heading',
      'proof.intro',
      index === 0
        ? 'proof.additionPrompt'
        : index === 1
          ? 'proof.geometryPrompt'
          : 'proof.measurementPrompt',
      index === 0
        ? 'proof.hintAddition'
        : index === 1
          ? 'proof.hintGeometry'
          : 'proof.hintMeasurement',
    ],
  });
}

function generate(index: number, input: unknown): DomainResult<PuzzleInstance> {
  if (!PROOF_CATALOG_STATUS.ok) return PROOF_CATALOG_STATUS;
  const replay = replayFromDto(input);
  if (!replay.ok) return replay;
  const familyId = PROOF_FAMILY_IDS[index];
  if (!familyId) return failure('unsupported_domain');
  const supported = requireReplaySupport(replay.value, [
    metadata(index, familyId),
  ]);
  if (!supported.ok) return supported;
  const spec = dataRecord(replay.value.spec);
  if (
    !spec ||
    !hasKeys(spec, ['maximum']) ||
    !boundedInteger(spec.maximum, minimums[index] ?? 0, limits[index] ?? 0)
  )
    return failure('invalid_input');
  const seed = parseSeed(replay.value.seedHex);
  if (!seed.ok) return seed;
  let state = seed.value;
  const bounds =
    index === 0
      ? [spec.maximum + 1, spec.maximum + 1]
      : index === 1
        ? [spec.maximum, spec.maximum, 2, 4, 2, 4, 2]
        : [spec.maximum, 4];
  const dimensions: number[] = [];
  for (const [position, bound] of bounds.entries()) {
    const draw = boundedChoice(state, bound);
    if (!draw.ok) return failure(draw.error.code);
    state = draw.state;
    const offset =
      (index === 1 && (position < 2 || position === 4)) ||
      (index === 2 && position === 0)
        ? 1
        : 0;
    dimensions.push(draw.value + offset);
  }
  const value = semantic(index, dimensions);
  if (!value.ok) return value;
  // The prefix identifies this exact supported generator/content tuple; bound and
  // canonical seed distinguish every supported spec without lossy hashing.
  return puzzleInstanceFromDto({
    schema: 'puzzle-instance-v1',
    semanticVersion: 'semantic-v1',
    instanceId: `p2-${index}-v1-c1-${spec.maximum}-${replay.value.seedHex}`,
    replay: replay.value,
    task: value.value.task,
    answerContract: value.value.answer,
    hintPlan: hints(index),
    evidenceScope: {
      kind: 'assessment',
      mode: 'practice',
      eligibleForMastery: true,
      scopes: [
        {
          conceptId: concepts[index],
          representationId: representations[index],
        },
      ],
    },
  });
}

function validate(
  index: number,
  input: unknown,
  submitted: unknown,
): DomainResult<{ readonly correct: boolean }> {
  const instance = puzzleInstanceFromDto(input);
  if (!instance.ok) return instance;
  const regenerated = generate(index, instance.value.replay);
  if (!regenerated.ok) return regenerated;
  const original = canonicalize(instance.value),
    rebuilt = canonicalize(regenerated.value);
  if (!original.ok || !rebuilt.ok || original.value !== rebuilt.value)
    return failure('invalid_input');
  const answer = structuredAnswerFromDto(submitted);
  if (!answer.ok) return answer;
  const expected = regenerated.value.answerContract;
  if (expected.kind === 'exactValue') {
    if (answer.value.kind !== 'exactValue') return failure('invalid_input');
    return success({
      correct:
        answer.value.value.numerator === expected.expected.numerator &&
        answer.value.value.denominator === expected.expected.denominator,
    });
  }
  if (expected.kind === 'classification') {
    if (
      answer.value.kind !== 'classification' ||
      !answer.value.classIds.every((value) =>
        [
          'geometry.parallelogram',
          'geometry.rectangle',
          'geometry.square',
        ].includes(value),
      )
    )
      return failure('invalid_input');
    return success({
      correct:
        answer.value.classIds.length === expected.expectedClassIds.length &&
        expected.expectedClassIds.every(
          (value) =>
            answer.value.kind === 'classification' &&
            answer.value.classIds.includes(value),
        ),
    });
  }
  if (expected.kind !== 'quantity' || answer.value.kind !== 'quantity')
    return failure('invalid_input');
  const quantity = answer.value.quantity;
  if (quantity.dimension !== 'length' || quantity.unitId !== LENGTH_UNIT_ID)
    return failure('invalid_input');
  return success({
    correct:
      quantity.magnitude.numerator === expected.expected.magnitude.numerator &&
      quantity.magnitude.denominator ===
        expected.expected.magnitude.denominator,
  });
}

export const PROOF_FAMILIES: readonly PuzzleFamily[] = Object.freeze(
  PROOF_FAMILY_IDS.map((familyId, index) =>
    Object.freeze({
      metadata: metadata(index, familyId),
      generate: (replay: ReplayDescriptor) => generate(index, replay),
      validate: (
        instance: PuzzleInstance,
        answer: Parameters<PuzzleFamily['validate']>[1],
      ) => validate(index, instance, answer),
      deriveHint: (task: SemanticTask, level: number) => {
        const parsed = semanticTaskFromDto(task);
        if (!parsed.ok || !boundedInteger(level, 0, 1))
          return failure('invalid_input');
        if (
          (index === 0 && parsed.value.kind !== 'evaluateExpression') ||
          (index === 1 && parsed.value.kind !== 'classifyGeometry') ||
          (index === 2 && parsed.value.kind !== 'measureGeometry')
        )
          return failure('invalid_input');
        if (parsed.value.kind === 'evaluateExpression') {
          const root = parsed.value.expression.root;
          if (
            root.kind !== 'add' ||
            root.left.kind !== 'literal' ||
            root.right.kind !== 'literal'
          )
            return failure('invalid_input');
          const left = rationalFromDto(root.left.value),
            right = rationalFromDto(root.right.value);
          if (!left.ok || !right.ok) return failure('invalid_input');
          const a = rationalToSafeInteger(left.value),
            b = rationalToSafeInteger(right.value);
          if (!a.ok || !b.ok || !additionTruth(a.value, b.value).ok)
            return failure('invalid_input');
        }
        if (
          parsed.value.kind === 'classifyGeometry' &&
          (parsed.value.objectId !== 'outline' ||
            !inspectQuadrilateral(parsed.value.scene).ok ||
            parsed.value.classIds.length !== 3 ||
            ![
              'geometry.parallelogram',
              'geometry.rectangle',
              'geometry.square',
            ].every(
              (value) =>
                parsed.value.kind === 'classifyGeometry' &&
                parsed.value.classIds.includes(value),
            ))
        )
          return failure('invalid_input');
        if (
          parsed.value.kind === 'measureGeometry' &&
          (parsed.value.attribute !== 'length' ||
            parsed.value.objectId !== 'length' ||
            !unitLengthTruth(parsed.value.scene).ok)
        )
          return failure('invalid_input');
        const hint = hints(index)[level];
        return hint ? success(hint) : failure('invalid_input');
      },
    }),
  ),
);

/** One bounded catalog, not an extensibility/plugin framework. */
export function validateProofCatalog(): DomainResult<true> {
  if (!PHASE2_CONCEPT_GRAPH.ok) return failure('invalid_graph');
  const graphIds = new Set(
    PHASE2_CONCEPT_GRAPH.value.concepts.map((node) => node.id),
  );
  const familyIds = new Set<string>();
  for (const family of PROOF_FAMILIES) {
    const meta = family.metadata;
    if (
      familyIds.has(meta.familyId) ||
      meta.contentVersion !== PROOF_CONTENT_VERSION ||
      meta.accessibilityEvidence !== 'declaredPerInstance' ||
      meta.conceptCoverage.length === 0 ||
      meta.representationCapabilities.length === 0 ||
      meta.difficultyDimensions.length === 0 ||
      new Set(meta.conceptCoverage).size !== meta.conceptCoverage.length ||
      new Set(meta.representationCapabilities).size !==
        meta.representationCapabilities.length ||
      !meta.conceptCoverage.every((value) => graphIds.has(value)) ||
      new Set(meta.difficultyDimensions.map((value) => value.id)).size !==
        meta.difficultyDimensions.length
    )
      return failure('invalid_input');
    familyIds.add(meta.familyId);
    for (const dimension of meta.difficultyDimensions) {
      if (
        dimension.kind === 'naturalBound' &&
        (!naturalSafeInteger(dimension.minimum).ok ||
          !naturalSafeInteger(dimension.maximum).ok ||
          dimension.minimum > dimension.maximum)
      )
        return failure('invalid_input');
      if (
        dimension.kind === 'category' &&
        (dimension.allowed.length === 0 ||
          new Set(dimension.allowed).size !== dimension.allowed.length)
      )
        return failure('invalid_input');
    }
  }
  return success(true);
}

export const PROOF_CATALOG_STATUS = Object.freeze(validateProofCatalog());

export function createProofReplay(
  familyId: ProofFamilyId,
  seedHex: string,
  maximum?: number,
): DomainResult<ReplayDescriptor> {
  const index = PROOF_FAMILY_IDS.indexOf(familyId);
  if (index < 0) return failure('unsupported_domain');
  return replayFromDto({
    schema: 'replay-v1',
    canonicalization: 'canonical-json-v1',
    semanticVersion: 'semantic-v1',
    familyId,
    generatorVersion: PROOF_GENERATORS[index],
    contentVersion: PROOF_CONTENT_VERSION,
    rngAlgorithm: 'xoshiro128ss-v1',
    seedHex,
    spec: { maximum: maximum ?? limits[index] },
  });
}

export function generateProof(input: unknown): DomainResult<PuzzleInstance> {
  const replay = replayFromDto(input);
  if (!replay.ok) return replay;
  const index = PROOF_FAMILY_IDS.findIndex(
    (value) => value === replay.value.familyId,
  );
  return index < 0
    ? failure('unsupported_domain')
    : generate(index, replay.value);
}

export function validateProof(
  instance: unknown,
  answer: unknown,
): DomainResult<{ readonly correct: boolean }> {
  const parsed = puzzleInstanceFromDto(instance);
  if (!parsed.ok) return parsed;
  const index = PROOF_FAMILY_IDS.findIndex(
    (value) => value === parsed.value.replay.familyId,
  );
  return index < 0
    ? failure('unsupported_domain')
    : validate(index, parsed.value, answer);
}
