import { describe, expect, it } from 'vitest';
import type { DomainResult } from '../../../src/domain/core/result';
import {
  createSliceReplay,
  generateSlice,
  SLICE_FAMILY_IDS,
  SLICE_GENERATORS,
  sliceEvidenceFingerprint,
  sliceInstanceFromDto,
  validateSlice,
} from '../../../src/domain/families/slice';
import type {
  SliceFamilyId,
  SliceTask,
} from '../../../src/domain/families/slice';
import { sliceSeedWitnesses } from '../../oracle/slice-families';

const seed = '0123456789abcdefdeadbeeffedcba98';
const relations = [
  'comparison.less',
  'comparison.equal',
  'comparison.greater',
] as const;

function value<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(`Independent probe: ${result.error.code}`);
  return result.value;
}

function generated(family: SliceFamilyId, seedHex = seed) {
  return value(generateSlice(value(createSliceReplay(family, seedHex))));
}

function exact(numerator: number | string, denominator = '1') {
  return {
    kind: 'exactValue',
    value: {
      schema: 'rational-v1',
      numerator: String(numerator),
      denominator,
    },
  };
}

/** Fresh task-based oracle. Never reads a production answer contract or verdict.
 * Semantic IDs, token pairing/removal and unique equation search decide truth.
 */
function semanticAnswer(task: SliceTask): number | string {
  if (task.kind === 'numeralRecognition') {
    const matching = task.choices.filter(
      (choice) => choice.value.numerator === task.numeral.numerator,
    );
    if (matching.length !== 1 || !matching[0])
      throw new Error('Numeral needs one matching quantity');
    return new Set(matching[0].items.map((item) => item.id)).size;
  }
  if (task.kind === 'countItems')
    return new Set(task.items.map((item) => item.id)).size;
  if (task.kind === 'compareQuantities') {
    const left = new Set(task.left.map((item) => item.id));
    const right = new Set(task.right.map((item) => item.id));
    while (left.size && right.size) {
      const leftFirst = left.values().next().value;
      const rightFirst = right.values().next().value;
      if (leftFirst === undefined || rightFirst === undefined)
        throw new Error('Pairing lost a token');
      left.delete(leftFirst);
      right.delete(rightFirst);
    }
    return left.size
      ? 'comparison.greater'
      : right.size
        ? 'comparison.less'
        : 'comparison.equal';
  }
  if (task.kind === 'subtractItems') {
    const remaining = new Set(task.items.map((item) => item.id));
    for (const removed of task.removedIds) {
      if (!remaining.delete(removed))
        throw new Error('Removal must identify a distinct existing token');
    }
    return remaining.size;
  }
  const solutions: number[] = [];
  for (let candidate = 0; candidate <= 10; candidate += 1) {
    const left = Number(task.left?.numerator ?? candidate);
    const right = Number(task.right?.numerator ?? candidate);
    const total = Number(task.total?.numerator ?? candidate);
    const combined = [
      ...Array.from({ length: left }, () => 'token'),
      ...Array.from({ length: right }, () => 'token'),
    ];
    if (combined.length === Array.from({ length: total }).length)
      solutions.push(candidate);
  }
  if (solutions.length !== 1 || solutions[0] === undefined)
    throw new Error('Equation needs exactly one bounded solution');
  return solutions[0];
}

describe('Independent five-family truth and adversarial boundary review', () => {
  it.each(SLICE_FAMILY_IDS)(
    'accepts exactly the task-derived solution across every bounded tuple: %s',
    (family) => {
      for (const seedHex of sliceSeedWitnesses(family).values()) {
        const instance = generated(family, seedHex);
        const solution = semanticAnswer(instance.task);
        if (typeof solution === 'string') {
          for (const relation of relations)
            expect(
              validateSlice(instance, {
                kind: 'classification',
                classIds: [relation],
              }),
            ).toEqual({ ok: true, value: { correct: relation === solution } });
        } else {
          for (let candidate = -1; candidate <= 11; candidate += 1)
            expect(validateSlice(instance, exact(candidate))).toEqual({
              ok: true,
              value: { correct: candidate === solution },
            });
          expect(validateSlice(instance, exact('1', '2'))).toEqual({
            ok: true,
            value: { correct: false },
          });
        }
      }
    },
  );

  it('uses distinct token identities and disjoint comparison groups', () => {
    for (const family of SLICE_FAMILY_IDS) {
      for (const seedHex of sliceSeedWitnesses(family).values()) {
        const task = generated(family, seedHex).task;
        const groups =
          task.kind === 'numeralRecognition'
            ? task.choices.map((choice) => choice.items)
            : task.kind === 'compareQuantities'
              ? [task.left, task.right]
              : task.kind === 'countItems' || task.kind === 'subtractItems'
                ? [task.items]
                : [];
        const allIds = groups.flat().map((item) => item.id);
        expect(new Set(allIds).size).toBe(allIds.length);
        for (const group of groups) {
          expect(group.length).toBeLessThanOrEqual(5);
          expect(
            new Set(group.map((item) => `${item.column}:${item.row}`)).size,
          ).toBe(group.length);
        }
        if (task.kind === 'subtractItems') {
          expect(new Set(task.removedIds).size).toBe(task.removedIds.length);
          expect(task.removedIds).toEqual(
            task.items.slice(0, task.removedIds.length).map((item) => item.id),
          );
        }
      }
    }
  });

  it('keeps counting layout cosmetic and fingerprints every declared semantic case', () => {
    const expectedCounts = [6, 6, 36, 21, 108];
    for (const [index, family] of SLICE_FAMILY_IDS.entries()) {
      const seen = new Set<string>();
      for (const [tuple, seedHex] of sliceSeedWitnesses(family)) {
        const instance = generated(family, seedHex);
        const parameters = tuple.split(',');
        const [first, second, position] = parameters;
        let expected: string;
        if (family === 'number.numeral') expected = `numeral:${first}`;
        else if (family === 'number.counting') expected = `count:${first}`;
        else if (family === 'number.comparison')
          expected = `compare:${first}:${second}`;
        else if (family === 'number.subtraction')
          expected = `subtract:${first}:${second}`;
        else {
          const total = Array.from({ length: Number(first) }).concat(
            Array.from({ length: Number(second) }),
          ).length;
          expected =
            position === '0'
              ? `missing:left:_:${second}:${total}`
              : position === '1'
                ? `missing:right:${first}:_:${total}`
                : `missing:total:${first}:${second}:_`;
        }
        expect(value(sliceEvidenceFingerprint(instance))).toBe(expected);
        seen.add(expected);
      }
      expect(seen.size).toBe(expectedCounts[index]);
    }
  });

  it('rejects cross-family generator pairs, invalid seeds and changed bounded metadata', () => {
    for (const [index, family] of SLICE_FAMILY_IDS.entries()) {
      const instance = generated(family);
      for (const [otherIndex, generatorVersion] of SLICE_GENERATORS.entries()) {
        if (index === otherIndex) continue;
        expect(generateSlice({ ...instance.replay, generatorVersion })).toEqual(
          {
            ok: false,
            error: { code: 'unsupported_version' },
          },
        );
      }
      for (const seedHex of [
        '',
        '00000000000000000000000000000000',
        `${seed}0`,
        ` ${seed}`,
        seed.replace('a', 'z'),
        null,
      ])
        expect(generateSlice({ ...instance.replay, seedHex }).ok).toBe(false);
      for (const maximum of [-1, 0, 6, 0.5, Number.MAX_SAFE_INTEGER, null])
        expect(
          generateSlice({ ...instance.replay, spec: { maximum } }).ok,
        ).toBe(false);
    }
  });

  it('rejects accessor, hidden, prototype, cycle and oversized input without invoking code', () => {
    const instance = generated('number.counting');
    let accesses = 0;
    const getterInstance = { ...instance };
    Object.defineProperty(getterInstance, 'task', {
      enumerable: true,
      get: () => {
        accesses += 1;
        throw new Error('Accessor must not execute');
      },
    });
    const getterAnswer = { ...exact(0) };
    Object.defineProperty(getterAnswer, 'value', {
      enumerable: true,
      get: () => {
        accesses += 1;
        throw new Error('Answer accessor must not execute');
      },
    });
    expect(sliceInstanceFromDto(getterInstance).ok).toBe(false);
    expect(validateSlice(instance, getterAnswer).ok).toBe(false);
    expect(accesses).toBe(0);
    const hidden = { ...instance };
    Object.defineProperty(hidden, 'hidden', { value: 'synthetic' });
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    for (const input of [
      hidden,
      Object.assign(Object.create({ inherited: true }) as object, instance),
      { ...instance, task: cycle },
      { ...instance, instanceId: 'x'.repeat(4097) },
      { ...instance, task: Array.from({ length: 10_001 }, () => 0) },
    ])
      expect(sliceInstanceFromDto(input).ok).toBe(false);
    for (const numerator of ['-0', '+0', ' 0', '0e0', '0.0', '0'.repeat(79)])
      expect(validateSlice(instance, exact(numerator)).ok).toBe(false);
  });
});
