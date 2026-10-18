import { describe, expect, it } from 'vitest';
import {
  deriveGrowingJourney,
  GROWING_JOURNEY_POLICY,
} from '../../src/domain/growing-world/journey';
import type {
  ChapterObservation,
  GrowingJourney,
} from '../../src/domain/growing-world/journey';

/** Independent review scenarios: finite-scope exhaustion must not freeze growth. */
function makeTen(
  id: number,
  first: number,
  sessionOrdinal: number,
  representation: 'concrete' | 'relational' = 'concrete',
): ChapterObservation {
  return {
    schema: 'growing-world-observation-v1',
    policyVersion: GROWING_JOURNEY_POLICY.version,
    id: `SYNTHETIC-candidate-${id}`,
    familyId: 'number.make-ten',
    concept: 'growth.number.make-ten',
    representation: `representation.growth.number.make-ten.${representation}`,
    fingerprint: `make-ten:${first}`,
    generatorVersion: 'make-ten-crossing-v1',
    sessionOrdinal,
    correct: true,
    mathematicalHintTier: 0,
    meaningfulAttempts: 1,
    solutionExposed: false,
    accessible: true,
  };
}

const exhausted = [6, 7, 8, 9].map((first, index) => makeTen(index, first, 1));

function journey(events: readonly ChapterObservation[]): GrowingJourney {
  const result = deriveGrowingJourney(events);
  if (!result.ok) throw new Error(`Synthetic review: ${result.error.code}`);
  return result.value;
}

function readiness(events: readonly ChapterObservation[]) {
  const item = journey(events).readiness.find(
    (row) => row.familyId === 'number.make-ten',
  );
  if (!item) throw new Error('Missing finite review scope');
  return item;
}

describe('Independent candidate review — finite invitation recovery', () => {
  it('recovers after all four relationships first succeed in one session and representation', () => {
    expect(readiness(exhausted)).toMatchObject({
      independentCases: 4,
      representations: 1,
      sessions: 1,
      readyForInvitation: false,
    });
    const later = [...exhausted, makeTen(4, 6, 2, 'relational')];
    expect(readiness(later)).toMatchObject({
      independentCases: 4,
      representations: 2,
      sessions: 2,
      readyForInvitation: true,
      limitedEvidence: true,
    });
    expect(journey(later).invitations).toContainEqual({
      familyId: 'number.part-whole',
      reason: 'connectedReadiness',
      connectedFrom: 'number.make-ten',
    });
  });

  it('never turns repeated confirmations of one relationship into four cases or unbounded coverage', () => {
    const events = Array.from({ length: 16 }, (_, index) =>
      makeTen(index, 6, index + 1, index % 2 === 0 ? 'concrete' : 'relational'),
    );
    const early = readiness(events.slice(0, 3));
    const late = readiness(events);
    expect(late.independentCases).toBe(1);
    expect(late.readyForInvitation).toBe(false);
    expect(late.representations).toBe(early.representations);
    expect(late.sessions).toBe(early.sessions);
    expect(
      journey(events).classifications.filter(
        (item) => item.reason === 'independentConfirmation',
      ).length,
    ).toBeLessThanOrEqual(2);
  });

  it('does not obtain a second representation by repeating within the original session', () => {
    const repeated = [...exhausted, makeTen(4, 6, 1, 'relational')];
    expect(readiness(repeated)).toMatchObject({
      independentCases: 4,
      representations: 1,
      sessions: 1,
      readyForInvitation: false,
    });
  });

  it('requires fresh accessible, correct, unassisted first-attempt confirmation', () => {
    const later = makeTen(4, 6, 2, 'relational');
    for (const invalid of [
      { ...later, mathematicalHintTier: 1 as const },
      { ...later, meaningfulAttempts: 2 as const },
      { ...later, solutionExposed: true },
      { ...later, correct: false },
      { ...later, accessible: false },
    ]) {
      expect(readiness([...exhausted, invalid])).toMatchObject({
        independentCases: 4,
        representations: 1,
        sessions: 1,
        readyForInvitation: false,
      });
    }
  });

  it('keeps a same-session supported or worked retry separate, then allows a clean later session', () => {
    for (const support of [
      { ...makeTen(4, 6, 2, 'relational'), mathematicalHintTier: 1 as const },
      { ...makeTen(4, 6, 2, 'relational'), solutionExposed: true },
    ]) {
      const retry = [...exhausted, support, makeTen(5, 6, 2, 'relational')];
      expect(readiness(retry)).toMatchObject({
        independentCases: 4,
        representations: 1,
        sessions: 1,
        readyForInvitation: false,
      });
      expect(
        readiness([...retry, makeTen(6, 6, 3, 'relational')]),
      ).toMatchObject({
        independentCases: 4,
        representations: 2,
        sessions: 2,
        readyForInvitation: true,
      });
    }
  });

  it('also recovers the six-case square-side scope without changing principal-root evidence identities', () => {
    const square = (id: number, side: number, session: number) => ({
      ...makeTen(id, 6, session),
      familyId: 'powers.square-side' as const,
      concept: 'growth.powers.square-side',
      representation: `representation.growth.powers.square-side.${session === 1 ? 'concrete' : 'relational'}`,
      fingerprint: `square-side:${side * side}`,
      generatorVersion: 'principal-square-side-one-six-v1',
    });
    const firstSession = [1, 2, 3, 4, 5, 6].map((side, id) =>
      square(id, side, 1),
    );
    const later = journey([...firstSession, square(6, 1, 2)]);
    expect(
      later.readiness.find((item) => item.familyId === 'powers.square-side'),
    ).toMatchObject({
      independentCases: 6,
      representations: 2,
      sessions: 2,
      readyForInvitation: true,
      limitedEvidence: true,
    });
  });
});
