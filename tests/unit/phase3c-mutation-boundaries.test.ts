// Independent guard assertions complement terminal integration and rendered E2E.
// Fixed synthetic inputs only; these tests do not certify native persistence.
import { describe, expect, it } from 'vitest';
import {
  createSyntheticLoopSession,
  initialSyntheticLoop,
  prepareSyntheticLoopAnswer,
} from '../../src/application/synthetic-loop';
import type { LoopAnswerRequest } from '../../src/application/synthetic-loop';
import { createProofReplay } from '../../src/domain/families/proofs';

const first = 'SYNTHETIC-PLAYER-1';
const second = 'SYNTHETIC-PLAYER-2';

function request(): LoopAnswerRequest {
  const replay = createProofReplay(
    'number.addition',
    '00000001000000020000000300000004',
  );
  if (!replay.ok) throw new Error('Fixed synthetic replay unavailable');
  return {
    replay: replay.value,
    answer: {
      kind: 'exactValue',
      value: { schema: 'rational-v1', numerator: '0', denominator: '1' },
    },
    mathematicalHintTier: 0,
    meaningfulAttempts: 1,
    solutionExposed: false,
    accessibilitySupports: [],
    accessible: true,
    playMode: 'practice',
    coarseDay: 0,
    clockCertain: true,
    revisit: false,
  };
}

describe('Independent Phase 3C mutation boundaries', () => {
  it('manual preparation remains progress-only even with a valid proof replay', () => {
    expect(
      prepareSyntheticLoopAnswer(
        initialSyntheticLoop(first),
        request(),
        'mutation-manual-answer',
        1,
        0,
      ),
    ).toMatchObject({
      ok: true,
      value: {
        kind: 'pending',
        pending: { evidenceKind: 'manual', observation: null },
      },
    });
  });

  it('switching unsaved profiles resets identity, progress and exploratory memory', async () => {
    const session = createSyntheticLoopSession(null);
    expect((await session.selectProfile(first)).ok).toBe(true);
    expect((await session.submit(request(), 'mutation-first-answer')).ok).toBe(
      true,
    );
    expect(
      (
        await session.submit(
          { ...request(), playMode: 'exploration' },
          'mutation-first-exploration',
        )
      ).ok,
    ).toBe(true);
    expect(session.state().record?.completedCount).toBe(1);
    expect(session.state().explorationCount).toBe(1);
    expect((await session.selectProfile(second)).ok).toBe(true);
    expect(session.state().record?.profileId).toBe(second);
    expect(session.state().record?.completedCount).toBe(0);
    expect(session.state().record?.events).toEqual([]);
    expect(session.state().adaptation?.profileId).toBe(second);
    expect(session.state().adaptation?.concepts).toEqual({});
    expect(session.state().explorationCount).toBe(0);
    expect(session.state().sessionOnlyCompletion).toBeNull();
    expect(session.state().saved).toBe(false);
  });
});
