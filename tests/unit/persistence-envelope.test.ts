import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { applicationSuccess } from '../../src/application/core/result';
import type { RecordCodec } from '../../src/application/ports/repository';
import {
  parseSyntheticEnvelope,
  SYNTHETIC_ENVELOPE_LIMITS,
  SYNTHETIC_ENVELOPE_VERSIONS,
  syntheticEnvelopeToCanonical,
  validateSyntheticEnvelope,
} from '../../src/infrastructure/persistence/envelope';
import {
  syntheticLearnerCodec,
  syntheticLearnerRecord,
  syntheticRootExposure,
} from '../fixtures/synthetic/learner-record';

function envelope(count = 2): unknown {
  return {
    ...SYNTHETIC_ENVELOPE_VERSIONS,
    records: Array.from({ length: count }, (_, index) => ({
      recordId: `synthetic-envelope-profile-${index}`,
      recordSchema: 'synthetic-learner-v1',
      payload: syntheticLearnerRecord(index),
    })),
  };
}

function changedPayload(payload: unknown): unknown {
  return {
    ...SYNTHETIC_ENVELOPE_VERSIONS,
    records: [
      {
        recordId: 'synthetic-envelope-profile-a',
        recordSchema: 'synthetic-learner-v1',
        payload,
      },
    ],
  };
}

function canonical(input: unknown): string {
  const checked = syntheticEnvelopeToCanonical(input, syntheticLearnerCodec);
  if (!checked.ok) throw new Error('Invalid synthetic envelope fixture');
  return checked.value;
}

const invalid = { ok: false, error: { code: 'invalid_record' } };
const unsupported = { ok: false, error: { code: 'unsupported_schema' } };

describe('future synthetic envelope contract — no file or store operations', () => {
  it('preserves separately versioned data and detaches both directions', () => {
    expect(canonical(envelope(0))).toBe(
      '{"canonicalizationVersion":"canonical-json-v1","contentVersion":"synthetic-content-v1","formatVersion":"synthetic-envelope-v1","generatorVersion":"synthetic-generator-v1","learnerSchema":"synthetic-learner-v1","modelVersion":"synthetic-model-v1","records":[],"replayVersion":"replay-v1","schemaVersion":1}',
    );
    const input = {
      ...SYNTHETIC_ENVELOPE_VERSIONS,
      records: [
        {
          recordId: 'synthetic-envelope-profile-a',
          recordSchema: 'synthetic-learner-v1',
          payload: syntheticLearnerRecord(),
        },
      ],
    };
    const original = canonical(input);
    const result = validateSyntheticEnvelope(input, syntheticLearnerCodec);
    expect(result.ok).toBe(true);
    const firstInput = input.records[0];
    if (!firstInput) throw new Error('Expected synthetic first row');
    firstInput.payload = syntheticLearnerRecord(1);
    if (!result.ok) throw new Error('Expected synthetic fixture validation');
    expect(canonical(result.value)).toBe(original);
    expect(result.value.records[0]?.payload).not.toBe(
      input.records[0]?.payload,
    );
    const parsed = parseSyntheticEnvelope(original, syntheticLearnerCodec);
    expect(parsed).toEqual(result);
    expect(canonical(parsed.ok ? parsed.value : undefined)).toBe(original);
  });

  it('accepts zero through ten rows but rejects excess or duplicate identities', () => {
    expect(
      validateSyntheticEnvelope(envelope(0), syntheticLearnerCodec).ok,
    ).toBe(true);
    expect(
      validateSyntheticEnvelope(envelope(10), syntheticLearnerCodec).ok,
    ).toBe(true);
    expect(
      validateSyntheticEnvelope(envelope(11), syntheticLearnerCodec),
    ).toEqual(invalid);
    const repeated = {
      ...SYNTHETIC_ENVELOPE_VERSIONS,
      records: Array.from({ length: 2 }, () => ({
        recordId: 'synthetic-envelope-profile-a',
        recordSchema: 'synthetic-learner-v1',
        payload: syntheticLearnerRecord(),
      })),
    };
    expect(validateSyntheticEnvelope(repeated, syntheticLearnerCodec)).toEqual(
      invalid,
    );
  });

  it('rejects every unknown format/schema/model/content/generator/replay version', () => {
    for (const [key, version] of Object.entries(SYNTHETIC_ENVELOPE_VERSIONS)) {
      const changed = {
        ...SYNTHETIC_ENVELOPE_VERSIONS,
        records: [],
        [key]: typeof version === 'number' ? version + 1 : `${version}-future`,
      };
      expect(validateSyntheticEnvelope(changed, syntheticLearnerCodec)).toEqual(
        unsupported,
      );
    }
    expect(
      validateSyntheticEnvelope(
        {
          ...SYNTHETIC_ENVELOPE_VERSIONS,
          records: [
            {
              recordId: 'synthetic-envelope-profile-a',
              recordSchema: 'synthetic-learner-v2',
              payload: syntheticLearnerRecord(),
            },
          ],
        },
        syntheticLearnerCodec,
      ),
    ).toEqual(unsupported);
    expect(
      validateSyntheticEnvelope(envelope(), {
        ...syntheticLearnerCodec,
        schema: 'production-learner-v1',
      }),
    ).toEqual(unsupported);
  });

  it('excludes live revisions, fencing, receipts, sessions and recovery at every layer', () => {
    const excluded = [
      'revision',
      'storageEpoch',
      'receipts',
      'fingerprint',
      'operationId',
      'activeSession',
      'migrationStaging',
      'nickname',
      'exploratoryExposure',
    ];
    for (const key of excluded) {
      expect(
        validateSyntheticEnvelope(
          {
            ...SYNTHETIC_ENVELOPE_VERSIONS,
            records: [],
            [key]: 1,
          },
          syntheticLearnerCodec,
        ),
      ).toEqual(invalid);
      expect(
        validateSyntheticEnvelope(
          {
            ...SYNTHETIC_ENVELOPE_VERSIONS,
            records: [
              {
                recordId: 'synthetic-envelope-profile-a',
                recordSchema: 'synthetic-learner-v1',
                payload: syntheticLearnerRecord(),
                [key]: 1,
              },
            ],
          },
          syntheticLearnerCodec,
        ),
      ).toEqual(invalid);
      expect(
        validateSyntheticEnvelope(
          changedPayload({
            ...syntheticLearnerRecord(),
            [key]: 1,
          }),
          syntheticLearnerCodec,
        ),
      ).toEqual(invalid);
    }
    expect(
      validateSyntheticEnvelope(
        changedPayload({
          marker: 'synthetic-only',
          assessments: [
            { evidence: syntheticRootExposure(), outcome: 'supportedCorrect' },
          ],
        }),
        syntheticLearnerCodec,
      ),
    ).toEqual(invalid);
  });

  it('accepts only visibly synthetic bounded record IDs', () => {
    for (const recordId of [
      'profile-a',
      'synthetic-',
      'synthetic-' + 'a'.repeat(90),
      'synthetic-https://example.test',
    ]) {
      expect(
        validateSyntheticEnvelope(
          {
            ...SYNTHETIC_ENVELOPE_VERSIONS,
            records: [
              {
                recordId,
                recordSchema: 'synthetic-learner-v1',
                payload: syntheticLearnerRecord(),
              },
            ],
          },
          syntheticLearnerCodec,
        ),
      ).toEqual(invalid);
    }
  });

  it('rejects prototype keys recursively, even inside otherwise codec-valid identifiers', () => {
    const decode = vi.fn((value: unknown) => applicationSuccess(value));
    const faithfulProbeCodec: RecordCodec<unknown> = {
      schema: 'synthetic-learner-v1',
      decode,
    };
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      for (const payload of [
        JSON.parse(
          `{"marker":"synthetic-only","assessments":[],"${key}":{}}`,
        ) as unknown,
        {
          marker: 'synthetic-only',
          assessments: [
            { [key]: {}, evidence: {}, outcome: 'supportedCorrect' },
          ],
        },
      ]) {
        expect(
          validateSyntheticEnvelope(
            changedPayload(payload),
            syntheticLearnerCodec,
          ),
        ).toEqual(invalid);
        expect(
          validateSyntheticEnvelope(
            changedPayload(payload),
            faithfulProbeCodec,
          ),
        ).toEqual(invalid);
      }
      const text = canonical(envelope(0)).replace(
        '"records":[]',
        `"records":[],"${key}":{}`,
      );
      expect(parseSyntheticEnvelope(text, syntheticLearnerCodec)).toEqual(
        invalid,
      );
    }
    expect(decode).not.toHaveBeenCalled();
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });

  it('never invokes accessors or toJSON and rejects executable/platform values', () => {
    const getter = vi.fn(() => syntheticLearnerRecord());
    const payload = {};
    Object.defineProperty(payload, 'marker', { enumerable: true, get: getter });
    expect(
      validateSyntheticEnvelope(changedPayload(payload), syntheticLearnerCodec),
    ).toEqual(invalid);
    expect(getter).not.toHaveBeenCalled();
    const toJSON = vi.fn(() => syntheticLearnerRecord());
    for (const payload of [
      { marker: 'synthetic-only', assessments: [], toJSON },
      () => syntheticLearnerRecord(),
      new Date(0),
      new Map(),
      1n,
      Object.create({ marker: 'synthetic-only' }) as unknown,
    ]) {
      expect(
        validateSyntheticEnvelope(
          changedPayload(payload),
          syntheticLearnerCodec,
        ),
      ).toEqual(invalid);
    }
    expect(toJSON).not.toHaveBeenCalled();
    const symbolic = {
      ...SYNTHETIC_ENVELOPE_VERSIONS,
      records: [],
      [Symbol('synthetic')]: 1,
    };
    expect(validateSyntheticEnvelope(symbolic, syntheticLearnerCodec)).toEqual(
      invalid,
    );
  });

  it('rejects remote URLs, markup, code and arbitrary extension fields as data', () => {
    for (const text of [
      'https://example.test/private',
      '//example.test/private',
      'javascript:alert(1)',
      'data:text/javascript,alert(1)',
      '<script>alert(1)</script>',
      '() => fetch("https://example.test")',
    ]) {
      for (const key of ['url', 'code', 'script', 'marker']) {
        expect(
          validateSyntheticEnvelope(
            changedPayload({
              ...syntheticLearnerRecord(),
              [key]: text,
            }),
            syntheticLearnerCodec,
          ),
        ).toEqual(invalid);
      }
    }
  });

  it('enforces the existing codec observation count and malformed exact values', () => {
    const first = syntheticLearnerRecord().assessments[0];
    if (!first) throw new Error('Expected synthetic first assessment');
    expect(
      validateSyntheticEnvelope(
        changedPayload({
          marker: 'synthetic-only',
          assessments: Array.from({ length: 32 }, () => first),
        }),
        syntheticLearnerCodec,
      ).ok,
    ).toBe(true);
    expect(
      validateSyntheticEnvelope(
        changedPayload({
          marker: 'synthetic-only',
          assessments: Array.from({ length: 33 }, () => first),
        }),
        syntheticLearnerCodec,
      ),
    ).toEqual(invalid);
    for (const exact of [
      0.1,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
      { kind: 'rational', numerator: '1', denominator: '0' },
      { kind: 'integer', value: '01' },
      { kind: 'decimal', coefficient: '1', scale: -1 },
    ]) {
      expect(
        validateSyntheticEnvelope(
          changedPayload({
            ...syntheticLearnerRecord(),
            exact,
          }),
          syntheticLearnerCodec,
        ),
      ).toEqual(invalid);
    }
  });

  it('rejects overdepth, oversized strings, sparse arrays, cycles and row canonical overflow before codec work', () => {
    const decode = vi.fn((value: unknown) => applicationSuccess(value));
    const codec: RecordCodec<unknown> = {
      schema: 'synthetic-learner-v1',
      decode,
    };
    let nested: unknown = 'synthetic-only';
    for (let index = 0; index < SYNTHETIC_ENVELOPE_LIMITS.depth; index += 1)
      nested = { nested };
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const sparse: unknown[] = Array.from({ length: 2 });
    Reflect.deleteProperty(sparse, '0');
    for (const payload of [
      nested,
      'x'.repeat(4097),
      sparse,
      cyclic,
      Array.from({ length: 100 }, () => 'x'.repeat(3000)),
    ]) {
      expect(validateSyntheticEnvelope(changedPayload(payload), codec)).toEqual(
        invalid,
      );
    }
    expect(decode).not.toHaveBeenCalled();
  });

  it('enforces UTF-8 aggregate bytes before a codec can traverse large rows', () => {
    const decode = vi.fn((value: unknown) => applicationSuccess(value));
    const codec: RecordCodec<unknown> = {
      schema: 'synthetic-learner-v1',
      decode,
    };
    const oversized = {
      ...SYNTHETIC_ENVELOPE_VERSIONS,
      records: Array.from({ length: 8 }, (_, index) => ({
        recordId: `synthetic-envelope-profile-${index}`,
        recordSchema: 'synthetic-learner-v1',
        payload: {
          marker: 'synthetic-only',
          text: Array.from({ length: 70 }, () => 'λ'.repeat(4096)),
        },
      })),
    };
    const text = JSON.stringify(oversized);
    expect(text.length).toBeLessThan(SYNTHETIC_ENVELOPE_LIMITS.bytes);
    expect(new TextEncoder().encode(text).byteLength).toBeGreaterThan(
      SYNTHETIC_ENVELOPE_LIMITS.bytes,
    );
    expect(validateSyntheticEnvelope(oversized, codec)).toEqual(invalid);
    expect(parseSyntheticEnvelope(text, codec)).toEqual(invalid);
    expect(decode).not.toHaveBeenCalled();
  });

  it('rejects duplicate keys, whitespace, rounded/scientific numeric tokens and malformed text', () => {
    const text = canonical(envelope(0));
    for (const malformed of [
      text.replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":1'),
      text.replace('"schemaVersion":1', '"schemaVersion":1.00000000000000001'),
      text.replace('"schemaVersion":1', '"schemaVersion":1e0'),
      ` ${text}`,
      text.slice(0, -1),
      '[',
      '',
      undefined,
    ]) {
      expect(parseSyntheticEnvelope(malformed, syntheticLearnerCodec)).toEqual(
        invalid,
      );
    }
  });

  it('rejects a codec that changes wire semantics or adds forbidden runtime data', () => {
    for (const decode of [
      () => applicationSuccess({ marker: 'synthetic-only', assessments: [] }),
      () => applicationSuccess({ fn: () => undefined }),
      () => applicationSuccess({ bigint: 1n }),
    ]) {
      expect(
        validateSyntheticEnvelope<unknown>(envelope(), {
          schema: 'synthetic-learner-v1',
          decode,
        }),
      ).toEqual(invalid);
    }
  });

  it('fuzzes decoded/text malformed contracts without writes or exceptions', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (data) => {
        const result = validateSyntheticEnvelope(data, syntheticLearnerCodec);
        expect(result.ok).toBe(false);
        expect(
          parseSyntheticEnvelope(JSON.stringify(data), syntheticLearnerCodec)
            .ok,
        ).toBe(false);
      }),
      { seed: 20261006, numRuns: 1000 },
    );
  });

  it('property-checks canonical round trips for independently bounded synthetic rows', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { maxLength: 10 }),
        (variants) => {
          const input = {
            ...SYNTHETIC_ENVELOPE_VERSIONS,
            records: variants.map((variant, index) => ({
              recordId: `synthetic-envelope-profile-${index}`,
              recordSchema: 'synthetic-learner-v1',
              payload: syntheticLearnerRecord(variant),
            })),
          };
          const text = canonical(input);
          const parsed = parseSyntheticEnvelope(text, syntheticLearnerCodec);
          expect(parsed).toEqual(
            validateSyntheticEnvelope(input, syntheticLearnerCodec),
          );
          expect(canonical(parsed.ok ? parsed.value : undefined)).toBe(text);
        },
      ),
      { seed: 20261006, numRuns: 1000 },
    );
  }, 30_000);
});
