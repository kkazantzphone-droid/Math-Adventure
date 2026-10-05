import { describe, expect, it } from 'vitest';
import { identifier } from '../../../src/domain/core/identifiers';
import {
  canonicalize,
  parseCanonicalData,
} from '../../../src/domain/replay/canonical';
import {
  replayFromDto,
  replayToCanonical,
  requireReplaySupport,
} from '../../../src/domain/replay/descriptor';

export const syntheticReplay = {
  schema: 'replay-v1',
  canonicalization: 'canonical-json-v1',
  semanticVersion: 'semantic-v1',
  familyId: 'synthetic.contract',
  generatorVersion: 'generator-v1',
  contentVersion: 'content-v1',
  rngAlgorithm: 'xoshiro128ss-v1',
  seedHex: '00000001000000020000000300000004',
  spec: { bound: 12, purpose: 'synthetic' },
};

function otherVersion() {
  const result = identifier('generatorVersion', 'other-v1');
  if (!result.ok) throw new Error('invalid fixture version');
  return result.value;
}

describe('stable identifiers', () => {
  it('accepts language-neutral examples and keeps case/separators explicit', () => {
    for (const value of [
      'addition.within_10',
      'powers.square_numbers',
      'roots.perfect_square',
      'geometry.shape.square',
      'xoshiro128ss-v1',
    ])
      expect(identifier('concept', value).ok).toBe(true);
    for (const value of [
      '',
      'Addition.within_10',
      'a..b',
      'a_',
      'a b',
      'a'.repeat(97),
      1,
      null,
    ])
      expect(identifier('concept', value)).toEqual({
        ok: false,
        error: { code: 'malformed_identifier' },
      });
  });
});

describe('canonical-json-v1', () => {
  it('has independently specified escaping, key ordering, meaningful arrays and negative zero', () => {
    expect(canonicalize({ z: [3, 2, 1], a: '"\n\\', é: -0 })).toEqual({
      ok: true,
      value: String.raw`{"a":"\"\n\\","z":[3,2,1],"é":0}`,
    });
    expect(canonicalize({ '\uffff': 1, a: 2, '\ud800\udc00': 3 })).toEqual({
      ok: true,
      value: '{"a":2,"𐀀":3,"￿":1}',
    });
    expect(canonicalize({ a: 1, b: 2 })).toEqual(canonicalize({ b: 2, a: 1 }));
    expect(canonicalize([1, 2])).not.toEqual(canonicalize([2, 1]));
  });
  it('rejects unsupported values, prototype methods and accessors without executing them', () => {
    let accessed = 0;
    const getter = Object.defineProperty({}, 'a', {
      enumerable: true,
      get() {
        accessed += 1;
        return 1;
      },
    });
    const hidden = Object.defineProperty({}, 'a', { value: 1 });
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const arrayGetter = Object.defineProperty([1], '0', {
      enumerable: true,
      get() {
        accessed += 1;
        return 1;
      },
    });
    for (const value of [
      undefined,
      NaN,
      Infinity,
      1.5,
      1n,
      Symbol('synthetic'),
      () => 1,
      new Map(),
      getter,
      hidden,
      arrayGetter,
      cyclic,
      {
        toJSON() {
          accessed += 1;
          return 1;
        },
      },
      Array(2),
      { [Symbol('key')]: 1 },
    ])
      expect(canonicalize(value).ok).toBe(false);
    expect(accessed).toBe(0);
    expect(
      canonicalize(
        Object.assign(Object.create(null) as Record<string, number>, { x: 1 }),
      ).ok,
    ).toBe(true);
  });
  it('bounds depth, total output, strings and node count; parse errors are deterministic', () => {
    for (const text of [
      '{"bound":1.0000000000000001}',
      '{"bound":1e-400}',
      '{"a":1,"a":2}',
      '{"b":2,"a":1}',
      ' -0 ',
    ])
      expect(parseCanonicalData(text).ok).toBe(false);
    let nested: unknown = 0;
    for (let i = 0; i < 34; i += 1) nested = [nested];
    for (const value of [
      nested,
      'x'.repeat(4097),
      Array.from({ length: 10_001 }, () => 0),
      Array.from({ length: 80 }, () => 'x'.repeat(4096)),
    ])
      expect(canonicalize(value).ok).toBe(false);
    for (const value of ['{', '1e999', '{"a":1.1}', 'x'.repeat(262_145), null])
      expect(parseCanonicalData(value).ok).toBe(false);
    expect(parseCanonicalData('{"a":1,"b":2}')).toEqual({
      ok: true,
      value: { a: 1, b: 2 },
    });
  });
});

describe('replay descriptor boundaries', () => {
  it('round-trips detached mathematical data and requires exact future family support', () => {
    const parsed = replayFromDto(syntheticReplay);
    expect(parsed.ok).toBe(true);
    const text = replayToCanonical(syntheticReplay);
    if (!text.ok || !parsed.ok) throw new Error('synthetic replay invalid');
    expect(replayFromDto(JSON.parse(text.value) as unknown)).toEqual(parsed);
    expect(requireReplaySupport(parsed.value, [])).toEqual({
      ok: false,
      error: { code: 'unsupported_version' },
    });
    expect(requireReplaySupport(parsed.value, [parsed.value])).toEqual(parsed);
    expect(
      requireReplaySupport(parsed.value, [
        {
          ...parsed.value,
          generatorVersion: otherVersion(),
        },
      ]),
    ).toEqual({ ok: false, error: { code: 'unsupported_version' } });
    syntheticReplay.spec.bound = 13;
    expect(parsed.value.spec.bound).toBe(12);
    syntheticReplay.spec.bound = 12;
  });
  it('rejects version mismatches, extra identity fields and invalid seed/spec', () => {
    for (const field of [
      'schema',
      'canonicalization',
      'semanticVersion',
      'rngAlgorithm',
    ])
      expect(
        replayFromDto({ ...syntheticReplay, [field]: 'retired-v9' }),
      ).toEqual({ ok: false, error: { code: 'unsupported_version' } });
    for (const value of [
      { ...syntheticReplay, learnerId: 'synthetic' },
      { ...syntheticReplay, seedHex: '0'.repeat(32) },
      { ...syntheticReplay, spec: [] },
      { ...syntheticReplay, familyId: 'Bad' },
      { ...syntheticReplay, spec: { x: 1n } },
    ])
      expect(replayFromDto(value).ok).toBe(false);
  });
});
