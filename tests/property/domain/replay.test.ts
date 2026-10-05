import fc from 'fast-check';
import { expect, it } from 'vitest';
import { canonicalize } from '../../../src/domain/replay/canonical';
import {
  replayFromDto,
  replayToCanonical,
} from '../../../src/domain/replay/descriptor';
import {
  boundedChoice,
  nextRandom,
  parseSeed,
  seedHex,
} from '../../../src/domain/random/xoshiro';
import {
  referenceBounded,
  referenceNext,
  referenceSeed,
  referenceStateNumbers,
} from '../../oracle/xoshiro-reference';

const parameters = { seed: 20261005, numRuns: 1_000 };
const words = fc
  .tuple(
    ...Array.from({ length: 4 }, () =>
      fc.integer({ min: 0, max: 0xffff_ffff }),
    ),
  )
  .filter((state) => state.some((word) => word !== 0));

it('bounded choices and consumed state agree with the independent exact reference (1000 cases)', () => {
  fc.assert(
    fc.property(
      words,
      fc.integer({ min: 1, max: 0x1_0000_0000 }),
      fc.integer({ min: 1, max: 8 }),
      (state, bound, attempts) => {
        const encoded = seedHex(state);
        if (!encoded.ok) throw new Error('invalid generated state');
        const expected = referenceBounded(
          referenceSeed(encoded.value),
          bound,
          attempts,
        );
        const actual = boundedChoice(state, bound, attempts);
        expect(actual.ok).toBe(expected.ok);
        expect(actual.draws).toBe(expected.attempts);
        expect(actual.state).toEqual(referenceStateNumbers(expected.state));
        if (actual.ok && expected.ok) expect(actual.value).toBe(expected.value);
        if (!actual.ok) expect(actual.error.code).toBe('draw_unavailable');
      },
    ),
    parameters,
  );
});

it('seed/state round-trip and unsigned transition agree with the independent BigInt model (1000 cases)', () => {
  fc.assert(
    fc.property(words, (state) => {
      const encoded = seedHex(state);
      if (!encoded.ok) throw new Error('invalid generated state');
      expect(parseSeed(encoded.value)).toEqual({ ok: true, value: state });
      const expected = referenceNext(referenceSeed(encoded.value));
      expect(nextRandom(state)).toEqual({
        ok: true,
        value: {
          value: Number(expected.value),
          state: referenceStateNumbers(expected.state),
        },
      });
    }),
    parameters,
  );
});

it('canonical object-key order is invariant and replay DTO round-trips (1000 cases)', () => {
  fc.assert(
    fc.property(
      fc.dictionary(fc.string({ maxLength: 20 }), fc.integer()),
      words,
      (spec, state) => {
        const reversed = Object.fromEntries(Object.entries(spec).reverse());
        expect(canonicalize(reversed)).toEqual(canonicalize(spec));
        const seed = seedHex(state);
        if (!seed.ok) throw new Error('invalid state');
        const input = {
          schema: 'replay-v1',
          canonicalization: 'canonical-json-v1',
          semanticVersion: 'semantic-v1',
          familyId: 'synthetic.contract',
          generatorVersion: 'generator-v1',
          contentVersion: 'content-v1',
          rngAlgorithm: 'xoshiro128ss-v1',
          seedHex: seed.value,
          spec,
        };
        const encoded = replayToCanonical(input);
        if (!encoded.ok) throw new Error('invalid generated replay');
        expect(replayFromDto(JSON.parse(encoded.value) as unknown)).toEqual(
          replayFromDto(input),
        );
        expect(replayToCanonical({ ...input, spec: reversed })).toEqual(
          encoded,
        );
      },
    ),
    parameters,
  );
});
