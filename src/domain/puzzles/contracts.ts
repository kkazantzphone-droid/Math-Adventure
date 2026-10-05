import { dataArray, dataRecord, hasKeys } from '../core/data';
import { identifier } from '../core/identifiers';
import type {
  ConceptId,
  InstanceId,
  RepresentationId,
  SemanticObjectId,
} from '../core/identifiers';
import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import { expressionFromDto } from '../expressions/expression';
import type { ExpressionDto } from '../expressions/expression';
import { geometrySceneFromDto, pointFromDto } from '../geometry/scene';
import type { ExactPoint, GeometryScene } from '../geometry/scene';
import { rationalFromDto, rationalToDto } from '../math/rational';
import type { RationalDto } from '../math/rational';
import { quantityFromDto } from '../measurement/quantity';
import type { ExactQuantityDto } from '../measurement/quantity';
import { canonicalize, parseCanonicalData } from '../replay/canonical';
import { replayFromDto } from '../replay/descriptor';
import type { ReplayDescriptor } from '../replay/descriptor';

export interface ConceptEvidenceScope {
  readonly conceptId: ConceptId;
  readonly representationId: RepresentationId;
}

// Eligibility describes a future candidate scope, never an accumulated result.
export interface AssessmentEvidenceScope {
  readonly kind: 'assessment';
  readonly mode: 'practice' | 'diagnostic';
  readonly eligibleForMastery: true;
  readonly scopes: readonly ConceptEvidenceScope[];
}

export interface ExploratoryExposure {
  readonly kind: 'exploratoryExposure';
  readonly mode: 'exploration' | 'numberLab';
  readonly eligibleForMastery: false;
  readonly retention: 'sessionOnly';
  readonly scopes: readonly ConceptEvidenceScope[];
}

export type EvidenceScope = AssessmentEvidenceScope | ExploratoryExposure;

export type SemanticTask =
  | { readonly kind: 'evaluateExpression'; readonly expression: ExpressionDto }
  | {
      readonly kind: 'equation';
      readonly left: ExpressionDto;
      readonly right: ExpressionDto;
    }
  | {
      readonly kind: 'classifyGeometry';
      readonly scene: GeometryScene;
      readonly objectId: SemanticObjectId;
      readonly classIds: readonly string[];
    }
  | {
      readonly kind: 'measureGeometry';
      readonly scene: GeometryScene;
      readonly objectId: SemanticObjectId;
      readonly attribute: 'length' | 'perimeter' | 'area';
    };

// Class IDs are nonexclusive semantic predicates: square and rectangle can
// occur together. Future finite-pattern tasks must add an explicit rule.
export type AtomicAnswer =
  | { readonly kind: 'exactValue'; readonly value: RationalDto }
  | { readonly kind: 'classification'; readonly classIds: readonly string[] }
  | { readonly kind: 'quantity'; readonly quantity: ExactQuantityDto }
  | { readonly kind: 'coordinate'; readonly point: ExactPoint }
  | { readonly kind: 'expression'; readonly expression: ExpressionDto };

export type AnswerContract =
  | { readonly kind: 'exactValue'; readonly expected: RationalDto }
  | {
      readonly kind: 'classification';
      readonly expectedClassIds: readonly string[];
      readonly selection: 'allApplicable' | 'mostSpecific';
    }
  | {
      readonly kind: 'quantity';
      readonly expected: ExactQuantityDto;
      readonly unitPolicy: 'requiredExact';
    }
  | { readonly kind: 'coordinate'; readonly expected: ExactPoint }
  | {
      readonly kind: 'expression';
      readonly expected: ExpressionDto;
      readonly equivalence: 'structural';
    }
  | { readonly kind: 'oneOf'; readonly options: readonly AtomicAnswer[] }
  | {
      readonly kind: 'orderedSequence';
      readonly items: readonly AtomicAnswer[];
    }
  | {
      readonly kind: 'unorderedCollection';
      readonly items: readonly AtomicAnswer[];
      readonly multiplicity: 'set' | 'multiset';
    };

export type StructuredAnswer =
  | AtomicAnswer
  | {
      readonly kind: 'sequence' | 'collection';
      readonly items: readonly AtomicAnswer[];
    };

export type SemanticHint =
  | {
      readonly kind: 'representationChange';
      readonly representationId: RepresentationId;
    }
  | { readonly kind: 'focus'; readonly objectIds: readonly SemanticObjectId[] }
  | { readonly kind: 'constraintReminder'; readonly constraintId: string }
  | { readonly kind: 'structuralStep'; readonly expression: ExpressionDto }
  | {
      readonly kind: 'workedExample';
      readonly expression: ExpressionDto;
      readonly solutionExposure: true;
    };

export interface PuzzleInstance {
  readonly schema: 'puzzle-instance-v1';
  readonly semanticVersion: 'semantic-v1';
  readonly instanceId: InstanceId;
  readonly replay: ReplayDescriptor;
  readonly task: SemanticTask;
  readonly answerContract: AnswerContract;
  readonly hintPlan: readonly SemanticHint[];
  readonly evidenceScope: EvidenceScope;
}

export const PUZZLE_LIMITS = Object.freeze({
  scopes: 16,
  hints: 16,
  answers: 32,
  classes: 32,
});

function keysFromDto(
  input: unknown,
  max: number,
): DomainResult<readonly string[]> {
  const raw = dataArray(input, max);
  if (!raw || raw.length === 0) return failure('invalid_input');
  const values: string[] = [];
  for (const item of raw) {
    const key = identifier('representation', item);
    if (!key.ok || values.includes(key.value)) return failure('invalid_input');
    values.push(key.value);
  }
  return success(values);
}

export function evidenceScopeFromDto(
  input: unknown,
): DomainResult<EvidenceScope> {
  const record = dataRecord(input);
  if (!record) return failure('invalid_input');
  const raw = dataArray(record.scopes, PUZZLE_LIMITS.scopes);
  if (!raw || raw.length === 0) return failure('invalid_input');
  const scopes: ConceptEvidenceScope[] = [];
  const keys = new Set<string>();
  for (const item of raw) {
    const scope = dataRecord(item);
    if (!scope || !hasKeys(scope, ['conceptId', 'representationId']))
      return failure('invalid_input');
    const concept = identifier('concept', scope.conceptId);
    const representation = identifier('representation', scope.representationId);
    if (!concept.ok || !representation.ok) return failure('invalid_input');
    const key = `${concept.value}:${representation.value}`;
    if (keys.has(key)) return failure('invalid_input');
    keys.add(key);
    scopes.push({
      conceptId: concept.value,
      representationId: representation.value,
    });
  }
  if (
    record.kind === 'assessment' &&
    record.eligibleForMastery === true &&
    (record.mode === 'practice' || record.mode === 'diagnostic') &&
    hasKeys(record, ['kind', 'mode', 'eligibleForMastery', 'scopes'])
  ) {
    return success({
      kind: 'assessment',
      mode: record.mode,
      eligibleForMastery: true,
      scopes,
    });
  }
  if (
    record.kind === 'exploratoryExposure' &&
    record.eligibleForMastery === false &&
    record.retention === 'sessionOnly' &&
    (record.mode === 'exploration' || record.mode === 'numberLab') &&
    hasKeys(record, [
      'kind',
      'mode',
      'eligibleForMastery',
      'retention',
      'scopes',
    ])
  ) {
    return success({
      kind: 'exploratoryExposure',
      mode: record.mode,
      eligibleForMastery: false,
      retention: 'sessionOnly',
      scopes,
    });
  }
  return failure('invalid_input');
}

export function semanticTaskFromDto(
  input: unknown,
): DomainResult<SemanticTask> {
  const record = dataRecord(input);
  if (!record) return failure('invalid_input');
  if (
    record.kind === 'evaluateExpression' &&
    hasKeys(record, ['kind', 'expression'])
  ) {
    const expression = expressionFromDto(record.expression);
    return expression.ok
      ? success({ kind: 'evaluateExpression', expression: expression.value })
      : expression;
  }
  if (
    record.kind === 'equation' &&
    hasKeys(record, ['kind', 'left', 'right'])
  ) {
    const left = expressionFromDto(record.left);
    const right = expressionFromDto(record.right);
    if (!left.ok || !right.ok) return failure('invalid_input');
    return success({ kind: 'equation', left: left.value, right: right.value });
  }
  if (record.kind !== 'classifyGeometry' && record.kind !== 'measureGeometry')
    return failure('unsupported_domain');
  const scene = geometrySceneFromDto(record.scene);
  const object = identifier('semanticObject', record.objectId);
  if (
    !scene.ok ||
    !object.ok ||
    !scene.value.objects.some((item) => item.id === object.value)
  )
    return failure('invalid_input');
  if (
    record.kind === 'classifyGeometry' &&
    hasKeys(record, ['kind', 'scene', 'objectId', 'classIds'])
  ) {
    const classes = keysFromDto(record.classIds, PUZZLE_LIMITS.classes);
    return classes.ok
      ? success({
          kind: 'classifyGeometry',
          scene: scene.value,
          objectId: object.value,
          classIds: classes.value,
        })
      : classes;
  }
  if (
    record.kind === 'measureGeometry' &&
    hasKeys(record, ['kind', 'scene', 'objectId', 'attribute']) &&
    (record.attribute === 'length' ||
      record.attribute === 'perimeter' ||
      record.attribute === 'area')
  ) {
    return success({
      kind: 'measureGeometry',
      scene: scene.value,
      objectId: object.value,
      attribute: record.attribute,
    });
  }
  return failure('invalid_input');
}

function atomicAnswerFromDto(input: unknown): DomainResult<AtomicAnswer> {
  const record = dataRecord(input);
  if (!record) return failure('invalid_input');
  if (record.kind === 'exactValue' && hasKeys(record, ['kind', 'value'])) {
    const value = rationalFromDto(record.value);
    return value.ok
      ? success({ kind: 'exactValue', value: rationalToDto(value.value) })
      : value;
  }
  if (
    record.kind === 'classification' &&
    hasKeys(record, ['kind', 'classIds'])
  ) {
    const classes = keysFromDto(record.classIds, PUZZLE_LIMITS.classes);
    return classes.ok
      ? success({ kind: 'classification', classIds: classes.value })
      : classes;
  }
  if (record.kind === 'quantity' && hasKeys(record, ['kind', 'quantity'])) {
    const quantity = quantityFromDto(record.quantity);
    return quantity.ok
      ? success({ kind: 'quantity', quantity: quantity.value })
      : quantity;
  }
  if (record.kind === 'coordinate' && hasKeys(record, ['kind', 'point'])) {
    const point = pointFromDto(record.point);
    return point.ok
      ? success({ kind: 'coordinate', point: point.value })
      : point;
  }
  if (record.kind === 'expression' && hasKeys(record, ['kind', 'expression'])) {
    const expression = expressionFromDto(record.expression);
    return expression.ok
      ? success({ kind: 'expression', expression: expression.value })
      : expression;
  }
  return failure('invalid_input');
}

function answersFromDto(input: unknown): DomainResult<readonly AtomicAnswer[]> {
  const raw = dataArray(input, PUZZLE_LIMITS.answers);
  if (!raw || raw.length === 0) return failure('invalid_input');
  const answers: AtomicAnswer[] = [];
  for (const item of raw) {
    const answer = atomicAnswerFromDto(item);
    if (!answer.ok) return answer;
    answers.push(answer.value);
  }
  return success(answers);
}

export function answerContractFromDto(
  input: unknown,
): DomainResult<AnswerContract> {
  const record = dataRecord(input);
  if (!record) return failure('invalid_input');
  if (record.kind === 'exactValue' && hasKeys(record, ['kind', 'expected'])) {
    const value = rationalFromDto(record.expected);
    return value.ok
      ? success({ kind: 'exactValue', expected: rationalToDto(value.value) })
      : value;
  }
  if (
    record.kind === 'classification' &&
    hasKeys(record, ['kind', 'expectedClassIds', 'selection']) &&
    (record.selection === 'allApplicable' ||
      record.selection === 'mostSpecific')
  ) {
    const classes = keysFromDto(record.expectedClassIds, PUZZLE_LIMITS.classes);
    if (
      !classes.ok ||
      (record.selection === 'mostSpecific' && classes.value.length !== 1)
    )
      return failure('invalid_input');
    return success({
      kind: 'classification',
      expectedClassIds: classes.value,
      selection: record.selection,
    });
  }
  if (
    record.kind === 'quantity' &&
    hasKeys(record, ['kind', 'expected', 'unitPolicy']) &&
    record.unitPolicy === 'requiredExact'
  ) {
    const quantity = quantityFromDto(record.expected);
    return quantity.ok
      ? success({
          kind: 'quantity',
          expected: quantity.value,
          unitPolicy: 'requiredExact',
        })
      : quantity;
  }
  if (record.kind === 'coordinate' && hasKeys(record, ['kind', 'expected'])) {
    const point = pointFromDto(record.expected);
    return point.ok
      ? success({ kind: 'coordinate', expected: point.value })
      : point;
  }
  if (
    record.kind === 'expression' &&
    hasKeys(record, ['kind', 'expected', 'equivalence']) &&
    record.equivalence === 'structural'
  ) {
    const expression = expressionFromDto(record.expected);
    return expression.ok
      ? success({
          kind: 'expression',
          expected: expression.value,
          equivalence: 'structural',
        })
      : expression;
  }
  if (record.kind === 'oneOf' && hasKeys(record, ['kind', 'options'])) {
    const options = answersFromDto(record.options);
    return options.ok
      ? success({ kind: 'oneOf', options: options.value })
      : options;
  }
  if (record.kind === 'orderedSequence' && hasKeys(record, ['kind', 'items'])) {
    const items = answersFromDto(record.items);
    return items.ok
      ? success({ kind: 'orderedSequence', items: items.value })
      : items;
  }
  if (
    record.kind === 'unorderedCollection' &&
    hasKeys(record, ['kind', 'items', 'multiplicity']) &&
    (record.multiplicity === 'set' || record.multiplicity === 'multiset')
  ) {
    const items = answersFromDto(record.items);
    return items.ok
      ? success({
          kind: 'unorderedCollection',
          items: items.value,
          multiplicity: record.multiplicity,
        })
      : items;
  }
  return failure('invalid_input');
}

function hintFromDto(input: unknown): DomainResult<SemanticHint> {
  const record = dataRecord(input);
  if (!record) return failure('invalid_input');
  if (
    record.kind === 'representationChange' &&
    hasKeys(record, ['kind', 'representationId'])
  ) {
    const representation = identifier(
      'representation',
      record.representationId,
    );
    return representation.ok
      ? success({
          kind: 'representationChange',
          representationId: representation.value,
        })
      : representation;
  }
  if (
    record.kind === 'constraintReminder' &&
    hasKeys(record, ['kind', 'constraintId'])
  ) {
    const constraint = identifier('representation', record.constraintId);
    return constraint.ok
      ? success({ kind: 'constraintReminder', constraintId: constraint.value })
      : constraint;
  }
  if (record.kind === 'focus' && hasKeys(record, ['kind', 'objectIds'])) {
    const raw = dataArray(record.objectIds, 32);
    if (!raw || raw.length === 0) return failure('invalid_input');
    const ids: SemanticObjectId[] = [];
    for (const item of raw) {
      const id = identifier('semanticObject', item);
      if (!id.ok || ids.includes(id.value)) return failure('invalid_input');
      ids.push(id.value);
    }
    return success({ kind: 'focus', objectIds: ids });
  }
  if (
    (record.kind === 'structuralStep' &&
      hasKeys(record, ['kind', 'expression'])) ||
    (record.kind === 'workedExample' &&
      hasKeys(record, ['kind', 'expression', 'solutionExposure']) &&
      record.solutionExposure === true)
  ) {
    const expression = expressionFromDto(record.expression);
    if (!expression.ok) return expression;
    return record.kind === 'workedExample'
      ? success({
          kind: 'workedExample',
          expression: expression.value,
          solutionExposure: true,
        })
      : success({ kind: 'structuralStep', expression: expression.value });
  }
  return failure('invalid_input');
}

function compatible(
  task: SemanticTask,
  answer: AnswerContract,
  hints: readonly SemanticHint[],
): boolean {
  if (task.kind === 'measureGeometry') {
    if (answer.kind !== 'quantity') return false;
    const expectedDimension = task.attribute === 'area' ? 'area' : 'length';
    if (answer.expected.dimension !== expectedDimension) return false;
  }
  if (task.kind === 'classifyGeometry') {
    if (
      answer.kind !== 'classification' ||
      !answer.expectedClassIds.every((id) => task.classIds.includes(id))
    )
      return false;
  }
  for (const hint of hints) {
    if (hint.kind === 'focus') {
      if (task.kind !== 'classifyGeometry' && task.kind !== 'measureGeometry')
        return false;
      if (
        !hint.objectIds.every((id) =>
          task.scene.objects.some((object) => object.id === id),
        )
      )
        return false;
    }
  }
  return true;
}

export function puzzleInstanceFromDto(
  input: unknown,
): DomainResult<PuzzleInstance> {
  const canonical = canonicalize(input);
  if (!canonical.ok) return canonical;
  const detached = parseCanonicalData(canonical.value);
  if (!detached.ok) return detached;
  const record = dataRecord(detached.value);
  if (
    !record ||
    !hasKeys(record, [
      'schema',
      'semanticVersion',
      'instanceId',
      'replay',
      'task',
      'answerContract',
      'hintPlan',
      'evidenceScope',
    ])
  )
    return failure('invalid_input');
  if (
    record.schema !== 'puzzle-instance-v1' ||
    record.semanticVersion !== 'semantic-v1'
  )
    return failure('unsupported_version');
  const instance = identifier('instance', record.instanceId);
  const replay = replayFromDto(record.replay);
  const task = semanticTaskFromDto(record.task);
  const answer = answerContractFromDto(record.answerContract);
  const evidence = evidenceScopeFromDto(record.evidenceScope);
  const rawHints = dataArray(record.hintPlan, PUZZLE_LIMITS.hints);
  if (
    !instance.ok ||
    !replay.ok ||
    !task.ok ||
    !answer.ok ||
    !evidence.ok ||
    !rawHints
  )
    return failure('invalid_input');
  const hints: SemanticHint[] = [];
  for (const item of rawHints) {
    const hint = hintFromDto(item);
    if (!hint.ok) return hint;
    hints.push(hint.value);
  }
  if (!compatible(task.value, answer.value, hints))
    return failure('invalid_input');
  return success({
    schema: 'puzzle-instance-v1',
    semanticVersion: 'semantic-v1',
    instanceId: instance.value,
    replay: replay.value,
    task: task.value,
    answerContract: answer.value,
    hintPlan: hints,
    evidenceScope: evidence.value,
  });
}
