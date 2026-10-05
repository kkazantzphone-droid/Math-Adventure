import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

const parameters = { seed: 20261005, numRuns: 1000 };

// Test-only invariant; this is not a production utility or mathematical oracle.
function roundTrip(value: string): unknown {
  return JSON.parse(JSON.stringify(value));
}

describe('HARNESS VALIDATION ONLY — not Math Adventure mathematics', () => {
  it('generates strings and checks JSON preserves their exact contents', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        expect(roundTrip(value)).toBe(value);
      }),
      parameters,
    );
  });

  it('detects a deliberate lossy mutation and replays its counterexample', () => {
    const mutant = fc.property(
      fc.string({ minLength: 1 }),
      (value) => roundTrip(value.slice(1)) === value,
    );
    const failure = fc.check(mutant, parameters);
    expect(failure.failed).toBe(true);
    expect(failure.counterexample).not.toBeNull();
    if (failure.counterexamplePath === null) {
      throw new Error('The failed property must supply a replay path.');
    }
    const replay = fc.check(mutant, {
      seed: failure.seed,
      path: failure.counterexamplePath,
      numRuns: parameters.numRuns,
    });
    expect(replay.failed).toBe(true);
    expect(replay.counterexample).toEqual(failure.counterexample);
  });
});
