import { dataRecord, hasKeys } from '../core/data';
import { identifier } from '../core/identifiers';
import type { UnitId } from '../core/identifiers';
import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import type { RationalDto } from '../math/rational';
import { boundedChoice, parseSeed } from '../random/xoshiro';
import { replayFromDto } from '../replay/descriptor';
import type { ReplayDescriptor } from '../replay/descriptor';
import { structuredAnswerFromDto } from '../puzzles/contracts';
import type { AnswerContract, StructuredAnswer } from '../puzzles/contracts';

/** All six tuples are new. No Phase 2/3 family, generator or evidence is replaced. */
export const CHAPTER_FAMILY_IDS = Object.freeze([
  'number.make-ten',
  'number.part-whole',
  'groups.equal',
  'groups.missing',
  'measurement.array-area',
  'powers.square-side',
] as const);
export type ChapterFamilyId = (typeof CHAPTER_FAMILY_IDS)[number];
export const CHAPTER_CONTENT_VERSION = 'growing-world-content-v1';
export const CHAPTER_GENERATOR_IDS = Object.freeze([
  'make-ten-crossing-v1',
  'missing-part-eleven-twenty-v1',
  'equal-groups-two-five-v1',
  'missing-group-two-five-v1',
  'array-unit-area-two-five-v1',
  'principal-square-side-one-six-v1',
] as const);
export const CHAPTER_ID = 'build-and-take-apart-v1';
export const CHAPTER_AREA_UNIT = 'unit.square-step';
export type ChapterRepresentation = 'concrete' | 'relational';

interface ChapterTaskContext {
  /** A representation changes the question's visible mathematical organisation. */
  readonly representation: ChapterRepresentation;
  /** Connections invite another question; they never transfer evidence. */
  readonly connections: readonly ChapterFamilyId[];
}

/** Bounded logical data. No expected answer or hidden missing part is presented. */
type ChapterTaskData =
  | {
      readonly kind: 'makeTen';
      readonly first: number;
      readonly second: number;
      readonly target: 10;
    }
  | {
      readonly kind: 'missingPart';
      readonly known: number;
      readonly total: number;
      readonly unknownPosition: 'first' | 'second';
    }
  | {
      readonly kind: 'equalGroups';
      readonly groups: number;
      readonly each: number;
    }
  | {
      readonly kind: 'missingGroup';
      readonly groups: number;
      readonly total: number;
    }
  | {
      readonly kind: 'arrayArea';
      readonly rows: number;
      readonly columns: number;
      readonly unitId: typeof CHAPTER_AREA_UNIT;
      readonly dimension: 'area';
    }
  | { readonly kind: 'squareSide'; readonly total: number };

export type ChapterTask = ChapterTaskContext & ChapterTaskData;

export interface ChapterInstance {
  readonly schema: 'growing-world-instance-v1';
  readonly semanticVersion: 'semantic-v1';
  readonly instanceId: string;
  readonly familyId: ChapterFamilyId;
  readonly replay: ReplayDescriptor;
  readonly task: ChapterTask;
  readonly answerContract: AnswerContract;
}

export interface ChapterEvidence {
  readonly concept: string;
  readonly representation: string;
  readonly fingerprint: string;
  readonly generatorVersion: string;
}

export interface ChapterHelp {
  readonly tier: 1 | 2 | 3;
  readonly task: ChapterTask;
  /** The solution is deliberately available only after explicit worked help. */
  readonly workedAnswer: StructuredAnswer | null;
}

const connections: Readonly<
  Record<ChapterFamilyId, readonly ChapterFamilyId[]>
> = Object.freeze({
  'number.make-ten': Object.freeze(['number.part-whole'] as const),
  'number.part-whole': Object.freeze([
    'number.make-ten',
    'groups.equal',
  ] as const),
  'groups.equal': Object.freeze([
    'groups.missing',
    'measurement.array-area',
  ] as const),
  'groups.missing': Object.freeze(['groups.equal'] as const),
  'measurement.array-area': Object.freeze([
    'groups.equal',
    'powers.square-side',
  ] as const),
  'powers.square-side': Object.freeze(['measurement.array-area'] as const),
});

function freeze<T>(input: T): T {
  if (input !== null && typeof input === 'object') {
    for (const nested of Object.values(input)) freeze(nested);
    Object.freeze(input);
  }
  return input;
}

function exact(value: number): RationalDto {
  return { schema: 'rational-v1', numerator: String(value), denominator: '1' };
}

function areaUnit(): UnitId {
  const unit = identifier('unit', CHAPTER_AREA_UNIT);
  if (!unit.ok) throw new Error('Invalid static chapter area unit');
  return unit.value;
}

export function isChapterFamilyId(input: unknown): input is ChapterFamilyId {
  return CHAPTER_FAMILY_IDS.some((familyId) => familyId === input);
}

export function createChapterReplay(
  familyId: ChapterFamilyId,
  seedHex: string,
): DomainResult<ReplayDescriptor> {
  if (!isChapterFamilyId(familyId)) return failure('unsupported_domain');
  return replayFromDto({
    schema: 'replay-v1',
    canonicalization: 'canonical-json-v1',
    semanticVersion: 'semantic-v1',
    familyId,
    generatorVersion:
      CHAPTER_GENERATOR_IDS[CHAPTER_FAMILY_IDS.indexOf(familyId)],
    contentVersion: CHAPTER_CONTENT_VERSION,
    rngAlgorithm: 'xoshiro128ss-v1',
    seedHex,
    spec: { chapter: CHAPTER_ID },
  });
}

/** Draw order and the fixed content bounds are part of each named generator. */
export function generateChapter(input: unknown): DomainResult<ChapterInstance> {
  const replay = replayFromDto(input);
  if (!replay.ok) return replay;
  const familyId = CHAPTER_FAMILY_IDS.find(
    (candidate) => candidate === replay.value.familyId,
  );
  if (!familyId) return failure('unsupported_domain');
  const index = CHAPTER_FAMILY_IDS.indexOf(familyId);
  if (
    replay.value.generatorVersion !== CHAPTER_GENERATOR_IDS[index] ||
    replay.value.contentVersion !== CHAPTER_CONTENT_VERSION
  )
    return failure('unsupported_version');
  const spec = dataRecord(replay.value.spec);
  if (!spec || !hasKeys(spec, ['chapter']) || spec.chapter !== CHAPTER_ID)
    return failure('invalid_input');
  const seed = parseSeed(replay.value.seedHex);
  if (!seed.ok) return seed;
  let state = seed.value;
  const draw = (bound: number): DomainResult<number> => {
    const selected = boundedChoice(state, bound);
    if (!selected.ok) return failure(selected.error.code);
    state = selected.state;
    return success(selected.value);
  };
  let taskData: ChapterTaskData;
  let answer: number;
  if (familyId === 'number.make-ten') {
    const firstDraw = draw(4);
    if (!firstDraw.ok) return firstDraw;
    const first = firstDraw.value + 6;
    const gap = 10 - first;
    // Crossing ten leaves at least one counter after filling the first frame.
    const secondDraw = draw(9 - gap);
    if (!secondDraw.ok) return secondDraw;
    taskData = {
      kind: 'makeTen',
      first,
      second: gap + 1 + secondDraw.value,
      target: 10,
    };
    answer = gap;
  } else if (familyId === 'number.part-whole') {
    const totalDraw = draw(10);
    if (!totalDraw.ok) return totalDraw;
    const total = 11 + totalDraw.value;
    const knownDraw = draw(total - 1);
    if (!knownDraw.ok) return knownDraw;
    const positionDraw = draw(2);
    if (!positionDraw.ok) return positionDraw;
    const known = knownDraw.value + 1;
    taskData = {
      kind: 'missingPart',
      known,
      total,
      unknownPosition: positionDraw.value === 0 ? 'first' : 'second',
    };
    answer = total - known;
  } else if (familyId === 'powers.square-side') {
    const sideDraw = draw(6);
    if (!sideDraw.ok) return sideDraw;
    const side = sideDraw.value + 1;
    taskData = { kind: 'squareSide', total: side * side };
    // A side length is nonnegative: this is the principal perfect square root.
    answer = side;
  } else {
    const firstDraw = draw(4);
    if (!firstDraw.ok) return firstDraw;
    const secondDraw = draw(4);
    if (!secondDraw.ok) return secondDraw;
    const a = firstDraw.value + 2;
    const b = secondDraw.value + 2;
    if (familyId === 'groups.equal') {
      taskData = { kind: 'equalGroups', groups: a, each: b };
      answer = a * b;
    } else if (familyId === 'groups.missing') {
      taskData = { kind: 'missingGroup', groups: a, total: a * b };
      answer = b;
    } else {
      taskData = {
        kind: 'arrayArea',
        rows: a,
        columns: b,
        unitId: CHAPTER_AREA_UNIT,
        dimension: 'area',
      };
      answer = a * b;
    }
  }
  const representationDraw = draw(2);
  if (!representationDraw.ok) return representationDraw;
  const representation: ChapterRepresentation =
    representationDraw.value === 0 ? 'concrete' : 'relational';
  const task: ChapterTask = {
    ...taskData,
    representation,
    connections: connections[familyId],
  };
  const answerContract: AnswerContract =
    task.kind === 'arrayArea'
      ? {
          kind: 'quantity',
          expected: {
            schema: 'quantity-v1',
            kind: 'exact',
            magnitude: exact(answer),
            unitId: areaUnit(),
            dimension: 'area',
          },
          unitPolicy: 'requiredExact',
        }
      : { kind: 'exactValue', expected: exact(answer) };
  return success(
    freeze({
      schema: 'growing-world-instance-v1',
      semanticVersion: 'semantic-v1',
      instanceId: `gw-${index}-v1-c1-${replay.value.seedHex}`,
      familyId,
      replay: replay.value,
      task,
      answerContract,
    }),
  );
}

/** The public validator accepts a replay, never a caller's answer contract. */
export function validateChapter(
  replay: unknown,
  input: unknown,
): DomainResult<{ readonly correct: boolean }> {
  const generated = generateChapter(replay);
  if (!generated.ok) return generated;
  const submitted = structuredAnswerFromDto(input);
  if (!submitted.ok) return submitted;
  const contract = generated.value.answerContract;
  if (contract.kind === 'exactValue') {
    if (submitted.value.kind !== 'exactValue') return failure('invalid_input');
    return success({
      correct:
        submitted.value.value.numerator === contract.expected.numerator &&
        submitted.value.value.denominator === contract.expected.denominator,
    });
  }
  if (contract.kind !== 'quantity' || submitted.value.kind !== 'quantity')
    return failure('invalid_input');
  const quantity = submitted.value.quantity;
  if (quantity.unitId !== CHAPTER_AREA_UNIT || quantity.dimension !== 'area')
    return failure('invalid_input');
  return success({
    correct:
      quantity.magnitude.numerator === contract.expected.magnitude.numerator &&
      quantity.magnitude.denominator ===
        contract.expected.magnitude.denominator,
  });
}

export function deriveChapterHelp(
  replay: unknown,
  tier: unknown,
): DomainResult<ChapterHelp> {
  if (tier !== 1 && tier !== 2 && tier !== 3) return failure('invalid_input');
  const generated = generateChapter(replay);
  if (!generated.ok) return generated;
  const contract = generated.value.answerContract;
  const answer: StructuredAnswer | null =
    contract.kind === 'exactValue'
      ? { kind: 'exactValue', value: contract.expected }
      : contract.kind === 'quantity'
        ? { kind: 'quantity', quantity: contract.expected }
        : null;
  return success(
    freeze({
      tier,
      task: generated.value.task,
      workedAnswer: tier === 3 ? answer : null,
    }),
  );
}

function fingerprint(task: ChapterTask): string {
  if (task.kind === 'makeTen') return `make-ten:${task.first}`;
  if (task.kind === 'missingPart')
    return `missing-part:${task.known}:${task.total}`;
  if (task.kind === 'missingGroup')
    return `missing-group:${task.groups}:${task.total}`;
  if (task.kind === 'squareSide') return `square-side:${task.total}`;
  const a = task.kind === 'equalGroups' ? task.groups : task.rows;
  const b = task.kind === 'equalGroups' ? task.each : task.columns;
  return `${task.kind === 'equalGroups' ? 'equal-groups' : 'array-area'}:${Math.min(a, b)}:${Math.max(a, b)}`;
}

function evidenceFor(
  familyId: ChapterFamilyId,
  task: ChapterTask,
): ChapterEvidence {
  return freeze({
    concept: `growth.${familyId}`,
    representation: `representation.growth.${familyId}.${task.representation}`,
    fingerprint: fingerprint(task),
    generatorVersion:
      CHAPTER_GENERATOR_IDS[CHAPTER_FAMILY_IDS.indexOf(familyId)] ?? '',
  });
}

export function chapterEvidence(
  replay: unknown,
): DomainResult<ChapterEvidence> {
  const generated = generateChapter(replay);
  return generated.ok
    ? success(evidenceFor(generated.value.familyId, generated.value.task))
    : generated;
}

function finiteFingerprints(familyId: ChapterFamilyId): ReadonlySet<string> {
  const cases = new Set<string>();
  if (familyId === 'number.make-ten') {
    for (let first = 6; first <= 9; first += 1) cases.add(`make-ten:${first}`);
  } else if (familyId === 'number.part-whole') {
    for (let total = 11; total <= 20; total += 1)
      for (let known = 1; known < total; known += 1)
        cases.add(`missing-part:${known}:${total}`);
  } else if (familyId === 'powers.square-side') {
    for (let side = 1; side <= 6; side += 1)
      cases.add(`square-side:${side * side}`);
  } else {
    for (let a = 2; a <= 5; a += 1)
      for (let b = 2; b <= 5; b += 1) {
        if (familyId === 'groups.missing')
          cases.add(`missing-group:${a}:${a * b}`);
        else
          cases.add(
            `${familyId === 'groups.equal' ? 'equal-groups' : 'array-area'}:${Math.min(a, b)}:${Math.max(a, b)}`,
          );
      }
  }
  return cases;
}

const evidenceCases = new Map(
  CHAPTER_FAMILY_IDS.map((familyId) => [
    familyId,
    finiteFingerprints(familyId),
  ]),
);

/** Wire evidence membership is certified against this finite semantic quotient.
 * No free-form fingerprint can enter a saved chapter event through this reader.
 */
export function chapterEvidenceFromInput(
  input: unknown,
): DomainResult<ChapterEvidence> {
  const row = dataRecord(input, 5);
  if (
    !row ||
    !hasKeys(row, [
      'familyId',
      'concept',
      'representation',
      'fingerprint',
      'generatorVersion',
    ]) ||
    !isChapterFamilyId(row.familyId)
  )
    return failure('invalid_input');
  const familyId = row.familyId;
  const representation = row.representation;
  const generatorVersion =
    CHAPTER_GENERATOR_IDS[CHAPTER_FAMILY_IDS.indexOf(familyId)];
  if (
    row.concept !== `growth.${familyId}` ||
    generatorVersion === undefined ||
    row.generatorVersion !== generatorVersion ||
    typeof row.fingerprint !== 'string' ||
    !evidenceCases.get(familyId)?.has(row.fingerprint) ||
    (representation !== `representation.growth.${familyId}.concrete` &&
      representation !== `representation.growth.${familyId}.relational`)
  )
    return failure('invalid_input');
  return success(
    freeze({
      concept: row.concept,
      representation,
      fingerprint: row.fingerprint,
      generatorVersion,
    }),
  );
}
