import { dataRecord, hasKeys } from '../core/data';
import { identifier } from '../core/identifiers';
import type {
  Identifier,
  IdentifierKind,
  InstanceId,
} from '../core/identifiers';
import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import type { RationalDto } from '../math/rational';
import { boundedChoice, parseSeed } from '../random/xoshiro';
import { canonicalize } from '../replay/canonical';
import { replayFromDto } from '../replay/descriptor';
import type { ReplayDescriptor } from '../replay/descriptor';
import { structuredAnswerFromDto } from '../puzzles/contracts';
import type {
  AnswerContract,
  AssessmentEvidenceScope,
  SemanticHint,
} from '../puzzles/contracts';

/** New behavior IDs: none replace the three immutable Phase 2 generators. */
export const SLICE_FAMILY_IDS = Object.freeze([
  'number.numeral',
  'number.counting',
  'number.comparison',
  'number.subtraction',
  'number.missing',
] as const);
export type SliceFamilyId = (typeof SLICE_FAMILY_IDS)[number];
export const SLICE_CONTENT_VERSION = 'phase3c-content-v1';
export const SLICE_GENERATORS = Object.freeze([
  'numeral-zero-five-v1',
  'counting-zero-five-v1',
  'comparison-zero-five-v1',
  'subtraction-zero-five-v1',
  'missing-addend-zero-five-v1',
] as const);
export const SLICE_RELATIONS = Object.freeze([
  'comparison.less',
  'comparison.equal',
  'comparison.greater',
] as const);
export type SliceRelation = (typeof SLICE_RELATIONS)[number];
export type MissingPosition = 'left' | 'right' | 'total';
export type CountingLayout = 'row' | 'pairs';

/** Logical slots declare one-to-one traversal; coordinates never decide truth. */
export interface QuantityItem {
  readonly id: string;
  readonly column: number;
  readonly row: number;
}

export type SliceTask =
  | {
      readonly kind: 'numeralRecognition';
      readonly numeral: RationalDto;
      readonly choices: readonly {
        readonly value: RationalDto;
        readonly items: readonly QuantityItem[];
      }[];
    }
  | {
      readonly kind: 'countItems';
      readonly layout: CountingLayout;
      readonly items: readonly QuantityItem[];
    }
  | {
      readonly kind: 'compareQuantities';
      readonly left: readonly QuantityItem[];
      readonly right: readonly QuantityItem[];
    }
  | {
      readonly kind: 'subtractItems';
      readonly items: readonly QuantityItem[];
      readonly removedIds: readonly string[];
    }
  | {
      readonly kind: 'missingNumber';
      readonly left: RationalDto | null;
      readonly right: RationalDto | null;
      readonly total: RationalDto | null;
      readonly unknownPosition: MissingPosition;
    };

export interface SlicePuzzleInstance {
  readonly schema: 'slice-puzzle-v1';
  readonly semanticVersion: 'semantic-v1';
  readonly instanceId: InstanceId;
  readonly replay: ReplayDescriptor;
  readonly task: SliceTask;
  readonly answerContract: AnswerContract;
  readonly hintPlan: readonly SemanticHint[];
  readonly evidenceScope: AssessmentEvidenceScope;
  /** Accessible quantity descriptions cannot be credited as visual counting. */
  readonly evidenceModalities: readonly ('visual' | 'semantic')[];
}

const concepts = [
  'numeral.quantity-relationship',
  'counting.cardinality',
  'comparison.quantity-order',
  'subtraction.take-away',
  'missing-number.part-whole',
] as const;
const representations = [
  'representation.numeral-quantity',
  'representation.counting-items',
  'representation.quantity-comparison',
  'representation.removed-items',
  'representation.missing-number-equation',
] as const;
const reminders = [
  'numeral.match-quantity',
  'counting.one-to-one-last-number',
  'comparison.match-one-to-one',
  'subtraction.count-remaining',
  'missing-number.parts-make-total',
] as const;

function id<K extends IdentifierKind>(kind: K, text: string): Identifier<K> {
  const result = identifier(kind, text);
  if (!result.ok) throw new Error('Invalid static slice identifier');
  return result.value;
}

function exact(value: number): RationalDto {
  return { schema: 'rational-v1', numerator: String(value), denominator: '1' };
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value)) freeze(nested);
    Object.freeze(value);
  }
  return value;
}

function items(
  count: number,
  prefix = 'item',
  layout: CountingLayout = 'row',
): readonly QuantityItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}.${index}`,
    column: layout === 'row' ? index : index % 2,
    row: layout === 'row' ? 0 : Math.floor(index / 2),
  }));
}

function supportedFamily(input: unknown): SliceFamilyId | undefined {
  return SLICE_FAMILY_IDS.find((familyId) => familyId === input);
}

export function createSliceReplay(
  familyId: SliceFamilyId,
  seedHex: string,
): DomainResult<ReplayDescriptor> {
  const index = SLICE_FAMILY_IDS.indexOf(familyId);
  if (index < 0) return failure('unsupported_domain');
  return replayFromDto({
    schema: 'replay-v1',
    canonicalization: 'canonical-json-v1',
    semanticVersion: 'semantic-v1',
    familyId,
    generatorVersion: SLICE_GENERATORS[index],
    contentVersion: SLICE_CONTENT_VERSION,
    rngAlgorithm: 'xoshiro128ss-v1',
    seedHex,
    spec: { maximum: 5 },
  });
}

/** Draw order is part of each immutable generator ID, including layout draws. */
export function generateSlice(
  input: unknown,
): DomainResult<SlicePuzzleInstance> {
  const replay = replayFromDto(input);
  if (!replay.ok) return replay;
  const familyId = supportedFamily(replay.value.familyId);
  if (!familyId) return failure('unsupported_domain');
  const index = SLICE_FAMILY_IDS.indexOf(familyId);
  if (
    replay.value.generatorVersion !== SLICE_GENERATORS[index] ||
    replay.value.contentVersion !== SLICE_CONTENT_VERSION
  )
    return failure('unsupported_version');
  const spec = dataRecord(replay.value.spec);
  if (!spec || !hasKeys(spec, ['maximum']) || spec.maximum !== 5)
    return failure('invalid_input');
  const seed = parseSeed(replay.value.seedHex);
  if (!seed.ok) return seed;
  let state = seed.value;
  const draw = (bound: number): DomainResult<number> => {
    const result = boundedChoice(state, bound);
    if (!result.ok) return failure(result.error.code);
    state = result.state;
    return success(result.value);
  };
  const first = draw(6);
  if (!first.ok) return first;
  let task: SliceTask;
  let answer: AnswerContract;
  if (familyId === 'number.numeral') {
    task = {
      kind: 'numeralRecognition',
      numeral: exact(first.value),
      choices: Array.from({ length: 6 }, (_, value) => ({
        value: exact(value),
        items: items(value, `choice${value}`),
      })),
    };
    answer = { kind: 'exactValue', expected: exact(first.value) };
  } else if (familyId === 'number.counting') {
    const layoutDraw = draw(2);
    if (!layoutDraw.ok) return layoutDraw;
    const layout: CountingLayout = layoutDraw.value === 0 ? 'row' : 'pairs';
    task = {
      kind: 'countItems',
      layout,
      items: items(first.value, 'item', layout),
    };
    answer = { kind: 'exactValue', expected: exact(first.value) };
  } else if (familyId === 'number.comparison') {
    const second = draw(6);
    if (!second.ok) return second;
    task = {
      kind: 'compareQuantities',
      left: items(first.value, 'left'),
      right: items(second.value, 'right'),
    };
    const relation =
      first.value < second.value
        ? 'comparison.less'
        : first.value > second.value
          ? 'comparison.greater'
          : 'comparison.equal';
    answer = {
      kind: 'classification',
      expectedClassIds: [relation],
      selection: 'allApplicable',
    };
  } else if (familyId === 'number.subtraction') {
    const removed = draw(first.value + 1);
    if (!removed.ok) return removed;
    const whole = items(first.value);
    task = {
      kind: 'subtractItems',
      items: whole,
      removedIds: whole.slice(0, removed.value).map((item) => item.id),
    };
    answer = {
      kind: 'exactValue',
      expected: exact(first.value - removed.value),
    };
  } else {
    const second = draw(6);
    const position = draw(3);
    if (!second.ok) return second;
    if (!position.ok) return position;
    const unknownPosition: MissingPosition =
      position.value === 0 ? 'left' : position.value === 1 ? 'right' : 'total';
    const total = first.value + second.value;
    task = {
      kind: 'missingNumber',
      left: unknownPosition === 'left' ? null : exact(first.value),
      right: unknownPosition === 'right' ? null : exact(second.value),
      total: unknownPosition === 'total' ? null : exact(total),
      unknownPosition,
    };
    answer = {
      kind: 'exactValue',
      expected: exact(
        unknownPosition === 'left'
          ? first.value
          : unknownPosition === 'right'
            ? second.value
            : total,
      ),
    };
  }
  return success(
    freeze({
      schema: 'slice-puzzle-v1',
      semanticVersion: 'semantic-v1',
      instanceId: id(
        'instance',
        `p3c-${index}-v1-c1-5-${replay.value.seedHex}`,
      ),
      replay: replay.value,
      task,
      answerContract: answer,
      hintPlan: [
        {
          kind: 'representationChange',
          representationId: id('representation', representations[index] ?? ''),
        },
        { kind: 'constraintReminder', constraintId: reminders[index] ?? '' },
      ],
      evidenceScope: {
        kind: 'assessment',
        mode: 'practice',
        eligibleForMastery: true,
        scopes: [
          {
            conceptId: id('concept', concepts[index] ?? ''),
            representationId: id(
              'representation',
              representations[index] ?? '',
            ),
          },
        ],
      },
      evidenceModalities: index < 2 ? ['visual'] : ['semantic'],
    }),
  );
}

/** Bounded codec regenerates the entire task/hint/scope and rejects any change. */
export function sliceInstanceFromDto(
  input: unknown,
): DomainResult<SlicePuzzleInstance> {
  const record = dataRecord(input);
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
      'evidenceModalities',
    ])
  )
    return failure('invalid_input');
  const canonical = canonicalize(input);
  if (!canonical.ok) return canonical;
  const generated = generateSlice(record.replay);
  if (!generated.ok) return generated;
  const rebuilt = canonicalize(generated.value);
  return rebuilt.ok && canonical.value === rebuilt.value
    ? generated
    : failure('invalid_input');
}

export function validateSlice(
  instance: unknown,
  submitted: unknown,
): DomainResult<{ readonly correct: boolean }> {
  const checked = sliceInstanceFromDto(instance);
  if (!checked.ok) return checked;
  const answer = structuredAnswerFromDto(submitted);
  if (!answer.ok) return answer;
  const expected = checked.value.answerContract;
  if (expected.kind === 'classification') {
    if (
      answer.value.kind !== 'classification' ||
      answer.value.classIds.length !== 1 ||
      !SLICE_RELATIONS.some(
        (relation) =>
          answer.value.kind === 'classification' &&
          answer.value.classIds[0] === relation,
      )
    )
      return failure('invalid_input');
    return success({
      correct: answer.value.classIds[0] === expected.expectedClassIds[0],
    });
  }
  if (expected.kind !== 'exactValue' || answer.value.kind !== 'exactValue')
    return failure('invalid_input');
  return success({
    correct:
      answer.value.value.numerator === expected.expected.numerator &&
      answer.value.value.denominator === expected.expected.denominator,
  });
}

export function submitSlice(
  replay: unknown,
  answer: unknown,
): DomainResult<{ readonly correct: boolean }> {
  const generated = generateSlice(replay);
  return generated.ok ? validateSlice(generated.value, answer) : generated;
}

export function deriveSliceHint(
  instance: unknown,
  level: unknown,
): DomainResult<SemanticHint> {
  if (level !== 0 && level !== 1) return failure('invalid_input');
  const checked = sliceInstanceFromDto(instance);
  if (!checked.ok) return checked;
  const hint = checked.value.hintPlan[level];
  return hint ? success(hint) : failure('invalid_input');
}

/** Layouts never inflate cardinality variation; missing positions are explicit. */
export function sliceEvidenceFingerprint(
  instance: unknown,
): DomainResult<string> {
  const checked = sliceInstanceFromDto(instance);
  if (!checked.ok) return checked;
  const task = checked.value.task;
  if (task.kind === 'numeralRecognition')
    return success(`numeral:${task.numeral.numerator}`);
  if (task.kind === 'countItems') return success(`count:${task.items.length}`);
  if (task.kind === 'compareQuantities')
    return success(`compare:${task.left.length}:${task.right.length}`);
  if (task.kind === 'subtractItems')
    return success(`subtract:${task.items.length}:${task.removedIds.length}`);
  return success(
    `missing:${task.unknownPosition}:${task.left?.numerator ?? '_'}:${task.right?.numerator ?? '_'}:${task.total?.numerator ?? '_'}`,
  );
}
