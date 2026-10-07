import { describe, expect, it } from 'vitest';
import {
  createSliceFamily,
  submitSliceFamily,
} from '../../../src/application/slice-family';
import type { DomainResult } from '../../../src/domain/core/result';
import {
  createSliceReplay,
  deriveSliceHint,
  generateSlice,
  SLICE_CONTENT_VERSION,
  SLICE_FAMILY_IDS,
  SLICE_GENERATORS,
  SLICE_RELATIONS,
  sliceEvidenceFingerprint,
  sliceInstanceFromDto,
  submitSlice,
  validateSlice,
} from '../../../src/domain/families/slice';
import type { SliceFamilyId } from '../../../src/domain/families/slice';
import {
  canonicalize,
  parseCanonicalData,
} from '../../../src/domain/replay/canonical';
import {
  enumerateSliceCases,
  oracleSliceCase,
  referenceSliceDimensions,
  sliceSeedWitnesses,
} from '../../oracle/slice-families';

const lowSeed = '00000001000000020000000300000004';
const mixedSeed = '0123456789abcdefdeadbeeffedcba98';

function value<T>(result: DomainResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok)
    throw new Error(`Unexpected domain failure ${result.error.code}`);
  return result.value;
}

function exact(number: number) {
  return {
    kind: 'exactValue',
    value: {
      schema: 'rational-v1',
      numerator: String(number),
      denominator: '1',
    },
  };
}

function answer(input: number | string) {
  return typeof input === 'number'
    ? exact(input)
    : { kind: 'classification', classIds: [input] };
}

function generated(family: SliceFamilyId, seed = lowSeed) {
  return value(generateSlice(value(createSliceReplay(family, seed))));
}

describe('Phase 3C standalone bounded catalog and independent finite oracle', () => {
  it('freezes behavior IDs, fixed bound, content version and low-word anchors', () => {
    expect(SLICE_FAMILY_IDS).toEqual([
      'number.numeral',
      'number.counting',
      'number.comparison',
      'number.subtraction',
      'number.missing',
    ]);
    expect(SLICE_GENERATORS).toEqual([
      'numeral-zero-five-v1',
      'counting-zero-five-v1',
      'comparison-zero-five-v1',
      'subtraction-zero-five-v1',
      'missing-addend-zero-five-v1',
    ]);
    expect(SLICE_CONTENT_VERSION).toBe('phase3c-content-v1');
    const numeral = generated('number.numeral');
    expect(numeral.task.kind).toBe('numeralRecognition');
    if (numeral.task.kind !== 'numeralRecognition')
      throw new Error('Wrong anchor task');
    expect(numeral.task.numeral).toEqual(exact(0).value);
    expect(numeral.task.choices.map((choice) => choice.items.length)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(generated('number.counting').task).toEqual({
      kind: 'countItems',
      layout: 'row',
      items: [],
    });
    expect(generated('number.comparison').task).toEqual({
      kind: 'compareQuantities',
      left: [],
      right: [],
    });
    expect(generated('number.comparison').answerContract).toEqual({
      kind: 'classification',
      expectedClassIds: ['comparison.equal'],
      selection: 'allApplicable',
    });
    expect(generated('number.subtraction').task).toEqual({
      kind: 'subtractItems',
      items: [],
      removedIds: [],
    });
    expect(generated('number.missing').task).toEqual({
      kind: 'missingNumber',
      left: null,
      right: exact(0).value,
      total: exact(0).value,
      unknownPosition: 'left',
    });
    for (const family of SLICE_FAMILY_IDS) {
      const instance = generated(family);
      expect(Object.isFrozen(instance)).toBe(true);
      expect(Object.isFrozen(instance.task)).toBe(true);
      expect(Object.isFrozen(instance.hintPlan)).toBe(true);
      expect(instance.replay.spec).toEqual({ maximum: 5 });
      expect(instance.instanceId).toBe(
        `p3c-${SLICE_FAMILY_IDS.indexOf(family)}-v1-c1-5-${lowSeed}`,
      );
    }
  });

  it.each(SLICE_FAMILY_IDS)(
    'exhausts every generated bounded parameter tuple with independent token truth: %s',
    (family) => {
      const cases = enumerateSliceCases(family);
      const counts = [6, 12, 36, 21, 108];
      expect(cases).toHaveLength(counts[SLICE_FAMILY_IDS.indexOf(family)] ?? 0);
      const witnesses = sliceSeedWitnesses(family);
      expect(witnesses.size).toBe(cases.length);
      for (const independent of cases) {
        const seed = witnesses.get(independent.parameters.join(','));
        if (!seed) throw new Error('Missing independent tuple witness');
        const instance = generated(family, seed);
        const [first, second, position] = independent.parameters;
        if (first === undefined) throw new Error('Missing independent value');
        const task = instance.task;
        if (task.kind === 'numeralRecognition') {
          expect(task.numeral).toEqual(exact(first).value);
          expect(task.choices).toHaveLength(6);
          for (const [choice, alternative] of task.choices.entries()) {
            expect(alternative.value).toEqual(exact(choice).value);
            expect(alternative.items).toHaveLength(choice);
          }
        } else if (task.kind === 'countItems') {
          expect(task.items).toHaveLength(first);
          expect(task.layout).toBe(second === 0 ? 'row' : 'pairs');
          expect(
            new Set(task.items.map((item) => `${item.column},${item.row}`))
              .size,
          ).toBe(first);
          expect(task.items.map((item) => [item.column, item.row])).toEqual(
            Array.from({ length: first }, (_, index) =>
              second === 0 ? [index, 0] : [index % 2, Math.floor(index / 2)],
            ),
          );
        } else if (task.kind === 'compareQuantities') {
          expect(task.left).toHaveLength(first);
          expect(task.right).toHaveLength(second ?? -1);
        } else if (task.kind === 'subtractItems') {
          expect(task.items).toHaveLength(first);
          expect(task.removedIds).toHaveLength(second ?? -1);
          expect(
            task.removedIds.every((id) =>
              task.items.some((item) => item.id === id),
            ),
          ).toBe(true);
        } else {
          const total = [
            ...Array.from({ length: first }, () => 'left-token'),
            ...Array.from({ length: second ?? 0 }, () => 'right-token'),
          ].length;
          expect(task).toEqual({
            kind: 'missingNumber',
            left: position === 0 ? null : exact(first).value,
            right: position === 1 ? null : exact(second ?? 0).value,
            total: position === 2 ? null : exact(total).value,
            unknownPosition:
              position === 0 ? 'left' : position === 1 ? 'right' : 'total',
          });
        }
        expect(validateSlice(instance, answer(independent.answer))).toEqual({
          ok: true,
          value: { correct: true },
        });
        const wrong =
          typeof independent.answer === 'number'
            ? independent.answer + 1
            : SLICE_RELATIONS.find(
                (relation) => relation !== independent.answer,
              );
        if (wrong === undefined)
          throw new Error('Missing wrong-answer counterexample');
        expect(validateSlice(instance, answer(wrong))).toEqual({
          ok: true,
          value: { correct: false },
        });
      }
    },
  );

  it('retains a fixed nonzero mixed-word replay anchor for all five families', () => {
    const numeral = generated('number.numeral', mixedSeed);
    if (numeral.task.kind !== 'numeralRecognition')
      throw new Error('Wrong mixed-word numeral task');
    expect(numeral.task.numeral).toEqual(exact(2).value);
    const counting = generated('number.counting', mixedSeed);
    expect(counting.task).toEqual({
      kind: 'countItems',
      layout: 'pairs',
      items: [
        { id: 'item.0', column: 0, row: 0 },
        { id: 'item.1', column: 1, row: 0 },
      ],
    });
    expect(generated('number.comparison', mixedSeed).answerContract).toEqual({
      kind: 'classification',
      expectedClassIds: ['comparison.less'],
      selection: 'allApplicable',
    });
    expect(generated('number.subtraction', mixedSeed).answerContract).toEqual({
      kind: 'exactValue',
      expected: exact(2).value,
    });
    expect(generated('number.missing', mixedSeed).task).toEqual({
      kind: 'missingNumber',
      left: exact(2).value,
      right: null,
      total: exact(5).value,
      unknownPosition: 'right',
    });
    expect(generated('number.missing', mixedSeed).answerContract).toEqual({
      kind: 'exactValue',
      expected: exact(3).value,
    });
  });

  it('rejects unsupported families, invalid seeds and accessor-bearing instance data', () => {
    const replay = generated('number.numeral').replay;
    expect(generateSlice({ ...replay, familyId: 'unknown.family' })).toEqual({
      ok: false,
      error: { code: 'unsupported_domain' },
    });
    for (const seedHex of [
      '',
      '0'.repeat(32),
      'g'.repeat(32),
      lowSeed.slice(1),
    ])
      expect(generateSlice({ ...replay, seedHex }).ok).toBe(false);
    for (const malformed of [
      null,
      {},
      [],
      0,
      'replay',
      { ...replay, extra: true },
    ])
      expect(generateSlice(malformed).ok).toBe(false);
    let accessorCalls = 0;
    const accessor = Object.defineProperty({}, 'replay', {
      enumerable: true,
      get() {
        accessorCalls += 1;
        return replay;
      },
    });
    expect(sliceInstanceFromDto(accessor).ok).toBe(false);
    expect(accessorCalls).toBe(0);
  });

  it.each(SLICE_FAMILY_IDS)(
    'agrees with independent seeded draws and preserves canonical detached replay: %s',
    (family) => {
      for (const seed of [
        lowSeed,
        mixedSeed,
        'ffffffffffffffffffffffffffffffff',
      ]) {
        const instance = generated(family, seed);
        const truth = oracleSliceCase(
          family,
          referenceSliceDimensions(family, seed),
        );
        expect(submitSlice(instance.replay, answer(truth.answer))).toEqual({
          ok: true,
          value: { correct: true },
        });
        const replay = value(
          parseCanonicalData(value(canonicalize(instance.replay))),
        );
        expect(value(generateSlice(replay))).toEqual(instance);
        expect(
          value(
            generateSlice({ ...instance.replay, seedHex: seed.toUpperCase() }),
          ),
        ).toEqual(instance);
        expect(
          value(
            sliceInstanceFromDto(
              value(parseCanonicalData(value(canonicalize(instance)))),
            ),
          ),
        ).toEqual(instance);
      }
    },
  );

  it.each(SLICE_FAMILY_IDS)(
    'rejects changed task, answer, hints, evidence, modality, identity and replay: %s',
    (family) => {
      const instance = generated(family);
      for (const changed of [
        { ...instance, task: { ...instance.task, injected: true } },
        {
          ...instance,
          answerContract: { kind: 'exactValue', expected: exact(99).value },
        },
        { ...instance, hintPlan: [] },
        {
          ...instance,
          evidenceScope: { ...instance.evidenceScope, scopes: [] },
        },
        { ...instance, evidenceModalities: ['visual', 'semantic'] },
        { ...instance, instanceId: 'forged.instance' },
        { ...instance, schema: 'slice-puzzle-v2' },
        { ...instance, replay: { ...instance.replay, spec: { maximum: 4 } } },
      ])
        expect(validateSlice(changed, exact(0)).ok).toBe(false);
      for (const changed of [
        { ...instance.replay, generatorVersion: 'other-generator-v1' },
        { ...instance.replay, contentVersion: 'other-content-v1' },
        { ...instance.replay, semanticVersion: 'semantic-v2' },
        { ...instance.replay, rngAlgorithm: 'other-rng-v1' },
      ])
        expect(generateSlice(changed)).toEqual({
          ok: false,
          error: { code: 'unsupported_version' },
        });
      for (const spec of [
        { maximum: 4 },
        { maximum: 6 },
        { maximum: '5' },
        { maximum: 5, injected: true },
        {},
      ])
        expect(generateSlice({ ...instance.replay, spec }).ok).toBe(false);
    },
  );

  it('rejects malformed structured answers without accepting noncanonical exact spellings', () => {
    const count = generated('number.counting');
    for (const input of [
      null,
      {},
      0,
      '0',
      { ...exact(0), injected: true },
      { kind: 'exactValue', value: { ...exact(0).value, numerator: '00' } },
      { kind: 'exactValue', value: { ...exact(0).value, denominator: '0' } },
      {
        kind: 'exactValue',
        value: { ...exact(0).value, numerator: '2', denominator: '2' },
      },
      { kind: 'classification', classIds: ['comparison.equal'] },
    ])
      expect(validateSlice(count, input).ok).toBe(false);
    const comparison = generated('number.comparison');
    for (const input of [
      exact(0),
      { kind: 'classification', classIds: [] },
      {
        kind: 'classification',
        classIds: ['comparison.equal', 'comparison.less'],
      },
      { kind: 'classification', classIds: ['foreign.relation'] },
      {
        kind: 'classification',
        classIds: ['comparison.equal', 'comparison.equal'],
      },
    ])
      expect(validateSlice(comparison, input).ok).toBe(false);
  });

  it('keeps hints semantic, evidence per concept/modality and count layouts out of diversity', () => {
    const concepts = new Set<string>();
    for (const family of SLICE_FAMILY_IDS) {
      const instance = generated(family);
      expect(instance.evidenceScope.scopes).toHaveLength(1);
      concepts.add(instance.evidenceScope.scopes[0]?.conceptId ?? '');
      for (const level of [0, 1])
        expect(value(deriveSliceHint(instance, level))).toEqual(
          instance.hintPlan[level],
        );
      for (const level of [-1, 2, 0.5, '0'])
        expect(deriveSliceHint(instance, level).ok).toBe(false);
      expect(JSON.stringify(instance.hintPlan)).not.toMatch(
        /solutionExposure|workedExample|expected|answer/,
      );
      expect(instance.evidenceModalities).toEqual(
        family === 'number.numeral' || family === 'number.counting'
          ? ['visual']
          : ['semantic'],
      );
    }
    expect(concepts.size).toBe(5);
    const witnesses = sliceSeedWitnesses('number.counting');
    const fingerprints = new Set<string>();
    for (const [parameters, seed] of witnesses) {
      const instance = generated('number.counting', seed);
      const count = parameters.split(',')[0];
      expect(value(sliceEvidenceFingerprint(instance))).toBe(`count:${count}`);
      fingerprints.add(value(sliceEvidenceFingerprint(instance)));
    }
    expect(fingerprints.size).toBe(6);
  });

  it.each(SLICE_FAMILY_IDS)(
    'application presentation omits expected answers and delegates validation: %s',
    (family) => {
      const presentation = value(createSliceFamily(family, mixedSeed));
      expect(Object.keys(presentation).sort()).toEqual([
        'familyId',
        'hint',
        'replay',
        'task',
      ]);
      expect(JSON.stringify(presentation)).not.toMatch(
        /answerContract|expected|evidenceScope|eligibleForMastery/,
      );
      const truth = oracleSliceCase(
        family,
        referenceSliceDimensions(family, mixedSeed),
      );
      expect(
        submitSliceFamily(presentation.replay, answer(truth.answer)),
      ).toEqual({ ok: true, value: { correct: true } });
    },
  );
});
