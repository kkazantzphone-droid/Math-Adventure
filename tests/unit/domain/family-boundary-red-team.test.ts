import { describe, expect, it } from 'vitest';
import {
  createProofReplay,
  generateProof,
  inspectQuadrilateral,
  PROOF_FAMILIES,
  PROOF_FAMILY_IDS,
  unitLengthTruth,
  unitSegments,
  validateProof,
} from '../../../src/domain/families/proofs';
import type { ProofFamilyId } from '../../../src/domain/families/proofs';
import type { DomainResult } from '../../../src/domain/core/result';
import {
  puzzleInstanceFromDto,
  structuredAnswerFromDto,
} from '../../../src/domain/puzzles/contracts';
import type { PuzzleInstance } from '../../../src/domain/puzzles/contracts';
import { canonicalize } from '../../../src/domain/replay/canonical';

const seed = '0123456789abcdefdeadbeeffedcba98';

function value<T>(result: DomainResult<T>): T {
  if (!result.ok)
    throw new Error(`Unexpected setup error: ${result.error.code}`);
  return result.value;
}

function reject(result: DomainResult<unknown>): void {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(Object.keys(result.error)).toEqual(['code']);
    expect(typeof result.error.code).toBe('string');
  }
}

function instance(family: ProofFamilyId): PuzzleInstance {
  return value(generateProof(value(createProofReplay(family, seed))));
}

function answer(input: PuzzleInstance): unknown {
  const contract = input.answerContract;
  if (contract.kind === 'exactValue')
    return { kind: 'exactValue', value: contract.expected };
  if (contract.kind === 'classification')
    return { kind: 'classification', classIds: contract.expectedClassIds };
  if (contract.kind === 'quantity')
    return { kind: 'quantity', quantity: contract.expected };
  throw new Error('Unexpected proof contract.');
}

function accessor(source: object, key: string, read: () => unknown): object {
  const payload = { ...source };
  Object.defineProperty(payload, key, { enumerable: true, get: read });
  return payload;
}

describe('independent adversarial decoded-data and replay boundaries', () => {
  it('does not dispatch supported generators under another supported family ID', () => {
    for (const familyId of PROOF_FAMILY_IDS) {
      const replay = value(createProofReplay(familyId, seed));
      for (const other of PROOF_FAMILIES) {
        if (other.metadata.familyId === familyId) continue;
        reject(
          generateProof({
            ...replay,
            generatorVersion: other.metadata.generatorVersion,
          }),
        );
        reject(other.generate(replay));
        const generated = instance(familyId);
        reject(
          other.validate(
            generated,
            value(structuredAnswerFromDto(answer(generated))),
          ),
        );
      }
    }
  });

  it('rejects getters throughout replay, instance, answer and geometry without invoking them', () => {
    let reads = 0;
    const read = () => {
      reads += 1;
      throw new Error('Accessor must not run.');
    };
    const addition = instance('number.addition');
    const geometry = instance('geometry.quadrilateral');
    const measurement = instance('measurement.unit-length');
    if (
      geometry.task.kind !== 'classifyGeometry' ||
      measurement.task.kind !== 'measureGeometry'
    )
      throw new Error('Unexpected task kinds.');
    reject(generateProof(accessor(addition.replay, 'seedHex', read)));
    reject(
      generateProof({
        ...addition.replay,
        spec: accessor({ maximum: 5 }, 'maximum', read),
      }),
    );
    reject(validateProof(accessor(addition, 'task', read), answer(addition)));
    reject(
      validateProof(addition, accessor({ kind: 'exactValue' }, 'value', read)),
    );
    reject(
      structuredAnswerFromDto({
        kind: 'exactValue',
        value: accessor(
          { schema: 'rational-v1', numerator: '7', denominator: '1' },
          'numerator',
          read,
        ),
      }),
    );
    reject(
      inspectQuadrilateral(accessor(geometry.task.scene, 'objects', read)),
    );
    reject(unitLengthTruth(accessor(measurement.task.scene, 'objects', read)));
    reject(unitSegments(accessor(measurement.task.scene, 'objects', read)));
    const objects = [...geometry.task.scene.objects];
    Object.defineProperty(objects, '0', { enumerable: true, get: read });
    reject(inspectQuadrilateral({ ...geometry.task.scene, objects }));
    reject(
      puzzleInstanceFromDto({
        ...geometry,
        task: { ...geometry.task, scene: { ...geometry.task.scene, objects } },
      }),
    );
    expect(reads).toBe(0);
  });

  it('treats dangerous own names as data and rejects inherited or decorated specs', () => {
    const replay = value(createProofReplay('number.addition', seed));
    const prototypeBefore = Object.getOwnPropertyDescriptors(Object.prototype);
    for (const key of ['__proto__', 'constructor', 'prototype', 'toJSON']) {
      const spec: Record<string, unknown> = Object.create(null) as Record<
        string,
        unknown
      >;
      spec.maximum = 5;
      spec[key] = { maximum: 5, polluted: true };
      reject(generateProof({ ...replay, spec }));
    }
    reject(
      generateProof({
        ...replay,
        spec: Object.create({ maximum: 5 }) as object,
      }),
    );
    const hidden = { maximum: 5 };
    Object.defineProperty(hidden, 'maximum', { enumerable: false, value: 5 });
    reject(generateProof({ ...replay, spec: hidden }));
    const symbolic = { maximum: 5, [Symbol('untrusted')]: true };
    reject(generateProof({ ...replay, spec: symbolic }));
    expect(Object.getOwnPropertyDescriptors(Object.prototype)).toEqual(
      prototypeBefore,
    );
  });

  it('never calls toJSON and fails bounded hostile data before family evaluation', () => {
    const generated = instance('number.addition');
    let calls = 0;
    const toJSON = () => {
      calls += 1;
      return generated;
    };
    reject(validateProof({ ...generated, toJSON }, answer(generated)));
    reject(structuredAnswerFromDto({ kind: 'exactValue', toJSON }));
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    let deep: unknown = 0;
    for (let depth = 0; depth < 34; depth += 1) deep = { nested: deep };
    for (const hostile of [
      cyclic,
      deep,
      'x'.repeat(4097),
      Array.from({ length: 10001 }, () => null),
    ]) {
      reject(
        generateProof({ ...generated.replay, spec: { maximum: 5, hostile } }),
      );
      reject(validateProof({ ...generated, hostile }, answer(generated)));
      reject(structuredAnswerFromDto({ kind: 'exactValue', value: hostile }));
    }
    expect(calls).toBe(0);
  });

  it('detaches replay and answer data rather than trusting aliases after decoding', () => {
    const descriptor = value(createProofReplay('number.addition', seed));
    const source = { ...descriptor, spec: { maximum: 5 } };
    const generated = value(generateProof(source));
    const before = value(canonicalize(generated));
    source.spec.maximum = 0;
    source.seedHex = '00000001000000020000000300000004';
    expect(value(canonicalize(generated))).toBe(before);
    const sourceAnswer = {
      kind: 'classification',
      classIds: [
        'geometry.square',
        'geometry.rectangle',
        'geometry.parallelogram',
      ],
    };
    const decoded = value(structuredAnswerFromDto(sourceAnswer));
    sourceAnswer.classIds.splice(0);
    expect(decoded).toEqual({
      kind: 'classification',
      classIds: [
        'geometry.square',
        'geometry.rectangle',
        'geometry.parallelogram',
      ],
    });
    expect(validateProof(generated, answer(generated))).toEqual({
      ok: true,
      value: { correct: true },
    });
  });

  it('rejects structurally valid attempts to alter immutable instance order and prospective evidence', () => {
    const generated = instance('geometry.quadrilateral');
    const submitted = answer(generated);
    const changes = [
      { ...generated, hintPlan: [...generated.hintPlan].reverse() },
      {
        ...generated,
        evidenceScope: {
          ...generated.evidenceScope,
          scopes: [
            ...generated.evidenceScope.scopes,
            {
              conceptId: 'powers.square-numbers',
              representationId: 'representation.square-array',
            },
          ],
        },
      },
      {
        ...generated,
        evidenceScope: { ...generated.evidenceScope, mode: 'diagnostic' },
      },
      {
        ...generated,
        evidenceScope: {
          ...generated.evidenceScope,
          scopes: [
            {
              conceptId: 'geometry.square.attributes',
              representationId: 'representation.geometry-attributes',
            },
          ],
        },
      },
    ];
    if (generated.task.kind !== 'classifyGeometry')
      throw new Error('Expected geometry.');
    changes.push({
      ...generated,
      task: {
        ...generated.task,
        classIds: [...generated.task.classIds].reverse(),
      },
    });
    for (const altered of changes) {
      expect(puzzleInstanceFromDto(altered).ok).toBe(true);
      reject(validateProof(altered, submitted));
    }
    expect(validateProof(generated, submitted)).toEqual({
      ok: true,
      value: { correct: true },
    });
  });
});
