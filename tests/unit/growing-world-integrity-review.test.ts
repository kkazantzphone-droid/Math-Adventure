import { describe, expect, it } from 'vitest';
import { applicationFailure } from '../../src/application/core/result';
import { createChapterTask } from '../../src/application/growing-world';
import {
  createSyntheticLoopSession,
  deriveSyntheticLoop,
  enterGrowingWorld,
  growingJourneyForRecord,
  initialSyntheticLoop,
  legacySyntheticLoopCodec,
  prepareSyntheticLoopAnswer,
  syntheticLoopCodec,
  syntheticLoopRecordId,
} from '../../src/application/synthetic-loop';
import type {
  LoopAnswerRequest,
  SyntheticLoopRecord,
} from '../../src/application/synthetic-loop';
import { completePendingSyntheticLoop } from '../../src/application/synthetic-loop/record';
import { commandFingerprint } from '../../src/application/repository/validation';
import {
  operationId,
  revision,
  storageEpoch,
} from '../../src/application/core/integrity';
import { COMMAND_VERSION } from '../../src/application/ports/repository';
import { createProofReplay } from '../../src/domain/families/proofs';
import {
  CANONICAL_LIMITS,
  canonicalize,
} from '../../src/domain/replay/canonical';
import { createSyntheticRepository } from '../fakes/synthetic-repository';

function value<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string } },
): T {
  if (!result.ok)
    throw new Error(`Synthetic integrity fixture: ${result.error.code}`);
  return result.value;
}

function chapterRequest(): LoopAnswerRequest {
  const task = value(
    createChapterTask('number.make-ten', '00000001000000020000000300000004'),
  );
  if (task.task.kind !== 'makeTen')
    throw new Error('Unexpected synthetic task');
  return {
    replay: task.replay,
    answer: {
      kind: 'exactValue',
      value: {
        schema: 'rational-v1',
        numerator: String(10 - task.task.first),
        denominator: '1',
      },
    },
    mathematicalHintTier: 0,
    meaningfulAttempts: 1,
    solutionExposed: false,
    accessible: true,
    accessibilitySupports: [],
    playMode: 'practice',
    coarseDay: 100,
    clockCertain: false,
    revisit: false,
  };
}

function chapterRecord(): SyntheticLoopRecord {
  return value(
    syntheticLoopCodec.decode({
      ...enterGrowingWorld(initialSyntheticLoop('SYNTHETIC-PLAYER-1')),
      mode: 'synthetic-policy',
      selectedFamily: 'number.make-ten',
    }),
  );
}

function pending(record = chapterRecord(), operation = 'integrity-chapter') {
  const prepared = value(
    prepareSyntheticLoopAnswer(record, chapterRequest(), operation, 4, 0),
  );
  if (prepared.kind !== 'pending')
    throw new Error('Expected synthetic prepared command');
  return prepared.pending;
}

function oldRequest(): LoopAnswerRequest {
  return {
    ...chapterRequest(),
    replay: value(
      createProofReplay('number.addition', '00000001000000020000000300000004'),
    ),
    answer: {
      kind: 'exactValue',
      value: { schema: 'rational-v1', numerator: '0', denominator: '1' },
    },
  };
}

async function startChapter(
  session: ReturnType<typeof createSyntheticLoopSession>,
  prefix: string,
) {
  value(await session.selectProfile('SYNTHETIC-PLAYER-1', `${prefix}-create`));
  value(await session.setMode('synthetic-policy', `${prefix}-mode`));
  value(await session.setActivity('number.make-ten', `${prefix}-chapter`));
}

describe('Independent growing-world payload containment review', () => {
  it('preserves legacy canonical identity and rejects chapter fields under v1', () => {
    const legacy = initialSyntheticLoop('SYNTHETIC-PLAYER-1');
    expect(value(canonicalize(value(syntheticLoopCodec.decode(legacy))))).toBe(
      value(canonicalize(legacy)),
    );
    expect(syntheticLoopCodec.decode({ ...legacy, chapterEvents: [] }).ok).toBe(
      false,
    );
    const next = enterGrowingWorld(legacy);
    expect(legacySyntheticLoopCodec.decode(next).ok).toBe(false);
    expect(value(canonicalize(value(syntheticLoopCodec.decode(next))))).toBe(
      value(canonicalize(next)),
    );
  });

  it('rejects absent/null chapter evidence in synthetic-policy chapter pending payloads', () => {
    const record = chapterRecord();
    const { chapterObservation: omitted, ...without } = pending(record);
    expect(omitted).toBeDefined();
    expect(syntheticLoopCodec.decode({ ...record, pending: without }).ok).toBe(
      false,
    );
    expect(
      syntheticLoopCodec.decode({
        ...record,
        pending: { ...without, chapterObservation: null },
      }).ok,
    ).toBe(false);
  });

  it('rejects a chapter pending ID already used by a historical observation', () => {
    const record = chapterRecord();
    const preparedOld = value(
      prepareSyntheticLoopAnswer(
        record,
        oldRequest(),
        'integrity-shared',
        3,
        0,
      ),
    );
    if (preparedOld.kind !== 'pending')
      throw new Error('Expected historical pending');
    const historical = value(
      syntheticLoopCodec.decode({
        ...value(
          completePendingSyntheticLoop({
            ...record,
            pending: preparedOld.pending,
          }),
        ),
        lastCompletion: null,
      }),
    );
    const forged = {
      ...historical,
      pending: pending(historical, 'integrity-shared'),
    };
    expect(syntheticLoopCodec.decode(forged).ok).toBe(false);
  });

  it('rejects a historical pending ID already used by a chapter observation', () => {
    const record = chapterRecord();
    const chapter = value(
      completePendingSyntheticLoop({
        ...record,
        pending: pending(record, 'integrity-chapter-id'),
      }),
    );
    const selected = value(
      syntheticLoopCodec.decode({
        ...chapter,
        selectedFamily: 'number.addition',
        lastCompletion: null,
      }),
    );
    const old = value(
      prepareSyntheticLoopAnswer(
        selected,
        oldRequest(),
        'integrity-chapter-id',
        5,
        0,
      ),
    );
    if (old.kind !== 'pending') throw new Error('Expected historical pending');
    expect(
      syntheticLoopCodec.decode({ ...selected, pending: old.pending }).ok,
    ).toBe(false);
  });

  it('rejects mismatched pending correctness, family, mode and exposed payload fields', () => {
    const record = chapterRecord(),
      prepared = pending(record);
    const event = prepared.chapterObservation;
    if (!event) throw new Error('Missing synthetic chapter observation');
    for (const forged of [
      { ...prepared, correct: !prepared.correct },
      {
        ...prepared,
        chapterObservation: { ...event, familyId: 'groups.equal' },
      },
      {
        ...prepared,
        chapterObservation: { ...event, rawAnswer: 'SYNTHETIC-NOT-ALLOWED' },
      },
      { ...prepared, chapterObservation: { ...event, sessionOrdinal: 2 } },
    ])
      expect(syntheticLoopCodec.decode({ ...record, pending: forged }).ok).toBe(
        false,
      );
    expect(
      syntheticLoopCodec.decode({
        ...record,
        mode: 'manual',
        pending: prepared,
      }).ok,
    ).toBe(false);
  });

  it('round-trips a full legacy journal plus full chapter journal and its prepared/final command fingerprints within unchanged canonical bounds', () => {
    let record = value(
      syntheticLoopCodec.decode({
        ...initialSyntheticLoop('SYNTHETIC-PLAYER-1'),
        mode: 'synthetic-policy',
      }),
    );
    const maximumOperation = (index: number) =>
      `integrity-${String(index).padStart(3, '0')}-${'x'.repeat(66)}`;
    expect(maximumOperation(0)).toHaveLength(80);
    const prepared = value(
      prepareSyntheticLoopAnswer(
        record,
        oldRequest(),
        maximumOperation(0),
        2,
        0,
      ),
    );
    if (prepared.kind !== 'pending' || !prepared.pending.observation)
      throw new Error('Expected historical capacity fixture');
    const sourceEvent = prepared.pending.observation;
    const events = Array.from({ length: 64 }, (_, index) => ({
      ...sourceEvent,
      input: {
        ...sourceEvent.input,
        id: `SYNTHETIC-${maximumOperation(index)}`,
      },
    }));
    record = value(
      syntheticLoopCodec.decode({
        ...record,
        events,
        derived: value(deriveSyntheticLoop(record.profileId, events)).derived,
        completedCount: 64,
        taskOrdinal: 64,
      }),
    );
    const legacy = value(canonicalize(record));
    record = value(
      syntheticLoopCodec.decode({
        ...enterGrowingWorld(record),
        selectedFamily: 'number.make-ten',
      }),
    );
    const sourceChapter = pending(
      record,
      maximumOperation(64),
    ).chapterObservation;
    if (!sourceChapter) throw new Error('Expected chapter capacity fixture');
    const chapterEvents = Array.from({ length: 71 }, (_, index) => ({
      ...sourceChapter,
      id: `SYNTHETIC-${maximumOperation(64 + index)}`,
    }));
    record = value(
      syntheticLoopCodec.decode({
        ...record,
        chapterEvents,
        completedCount: 135,
        taskOrdinal: 135,
      }),
    );
    const stage = value(
      syntheticLoopCodec.decode({
        ...record,
        pending: pending(record, maximumOperation(135)),
      }),
    );
    const largestPrepared = value(canonicalize(stage)).length;
    record = value(completePendingSyntheticLoop(stage));
    expect(record.events).toHaveLength(64);
    if (record.schema !== 'growing-world-synthetic-loop-v2')
      throw new Error('Expected v2 capacity fixture');
    expect(record.chapterEvents).toHaveLength(72);
    expect(record.completedCount).toBe(136);
    const text = value(canonicalize(record));
    expect(
      value(
        canonicalize(
          value(syntheticLoopCodec.decode(JSON.parse(text) as unknown)),
        ),
      ),
    ).toBe(text);
    expect(largestPrepared).toBeLessThan(CANONICAL_LIMITS.output);
    const fingerprint = value(
      commandFingerprint(
        {
          version: COMMAND_VERSION,
          recordSchema: syntheticLoopCodec.schema,
          kind: 'update',
          operationId: value(operationId(maximumOperation(200))),
          expectedRevision: value(revision(274)),
          storageEpoch: value(storageEpoch(0)),
          recordId: value(syntheticLoopRecordId('SYNTHETIC-PLAYER-1')),
          payload: record,
        },
        syntheticLoopCodec,
      ),
    );
    expect(fingerprint.length).toBeLessThan(CANONICAL_LIMITS.output);
    // Preserve exact legacy events/derived bytes across explicit chapter entry.
    const legacyDecoded = JSON.parse(legacy) as SyntheticLoopRecord;
    expect(record.events).toEqual(legacyDecoded.events);
    expect(record.derived).toEqual(legacyDecoded.derived);
    expect(value(growingJourneyForRecord(record)).capacityReached).toBe(true);
  });
});

describe('Independent growing-world session interruption review', () => {
  it('reconciles a committed final write whose response was lost exactly once', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    const session = createSyntheticLoopSession({
      ...repository,
      execute: async (command) => {
        const response = await repository.execute(command);
        return command.operationId === 'integrity-lost-final' && response.ok
          ? applicationFailure('storage_unavailable')
          : response;
      },
    });
    await startChapter(session, 'integrity-lost');
    expect(
      (await session.submit(chapterRequest(), 'integrity-lost-final')).ok,
    ).toBe(false);
    expect(session.state().record?.pending).not.toBeNull();
    value(await session.retryPending());
    expect(session.state().record?.completedCount).toBe(1);
    expect(
      value(
        growingJourneyForRecord(session.state().record as SyntheticLoopRecord),
      ).assessmentCount,
    ).toBe(1);
    const reopened = createSyntheticLoopSession(repository);
    value(await reopened.selectProfile('SYNTHETIC-PLAYER-1'));
    expect(reopened.state().record).toEqual(session.state().record);
  });

  it('retains recoverable chapter pending after an aborted final write', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    const session = createSyntheticLoopSession({
      ...repository,
      execute: (command) =>
        command.operationId === 'integrity-abort-final'
          ? Promise.resolve(applicationFailure('storage_unavailable'))
          : repository.execute(command),
    });
    await startChapter(session, 'integrity-abort');
    expect(
      (await session.submit(chapterRequest(), 'integrity-abort-final')).ok,
    ).toBe(false);
    const reopened = createSyntheticLoopSession(repository);
    value(await reopened.selectProfile('SYNTHETIC-PLAYER-1'));
    expect(reopened.state().record?.completedCount).toBe(0);
    expect(
      value(
        growingJourneyForRecord(reopened.state().record as SyntheticLoopRecord),
      ).assessmentCount,
    ).toBe(0);
    value(await reopened.retryPending());
    expect(reopened.state().record?.completedCount).toBe(1);
    expect(
      value(
        growingJourneyForRecord(reopened.state().record as SyntheticLoopRecord),
      ).assessmentCount,
    ).toBe(1);
  });

  it('never adopts a former badge final response after a concurrent profile switch', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    let release: (() => void) | undefined;
    let reached: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const session = createSyntheticLoopSession({
      ...repository,
      execute: async (command) => {
        if (command.operationId === 'integrity-switch-final') {
          reached?.();
          await hold;
        }
        return repository.execute(command);
      },
    });
    await startChapter(session, 'integrity-switch');
    const finishing = session.submit(
      chapterRequest(),
      'integrity-switch-final',
    );
    await ready;
    value(
      await session.selectProfile(
        'SYNTHETIC-PLAYER-2',
        'integrity-switch-second',
      ),
    );
    release?.();
    expect((await finishing).ok).toBe(false);
    expect(session.state().record?.profileId).toBe('SYNTHETIC-PLAYER-2');
    expect(session.state().record?.completedCount).toBe(0);
    value(await session.selectProfile('SYNTHETIC-PLAYER-1'));
    expect(session.state().record?.completedCount).toBe(1);
  });

  it('does not let a chapter pending command cross deletion of the other profile', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    const session = createSyntheticLoopSession({
      ...repository,
      execute: (command) =>
        command.operationId === 'integrity-fence-final'
          ? Promise.resolve(applicationFailure('storage_unavailable'))
          : repository.execute(command),
    });
    await startChapter(session, 'integrity-fence');
    expect(
      (await session.submit(chapterRequest(), 'integrity-fence-final')).ok,
    ).toBe(false);
    const other = createSyntheticLoopSession(repository);
    value(
      await other.selectProfile('SYNTHETIC-PLAYER-2', 'integrity-fence-second'),
    );
    value(await other.deleteProfile('integrity-fence-delete'));
    const retry = await session.retryPending();
    expect(retry).toMatchObject({
      ok: false,
      error: { code: 'epoch_conflict' },
    });
    expect(session.state().readOnly).toBe(true);
    const stored = value(
      await repository.load(value(syntheticLoopRecordId('SYNTHETIC-PLAYER-1'))),
    );
    expect(stored.payload.completedCount).toBe(0);
    expect(stored.payload.pending).not.toBeNull();
  });

  it('keeps manual and Explore completions outside both assessment journals', async () => {
    const repository = value(createSyntheticRepository(syntheticLoopCodec));
    let writes = 0;
    const session = createSyntheticLoopSession({
      ...repository,
      execute: (command) => {
        writes += 1;
        return repository.execute(command);
      },
    });
    value(
      await session.selectProfile(
        'SYNTHETIC-PLAYER-1',
        'integrity-manual-create',
      ),
    );
    value(
      await session.setActivity('number.make-ten', 'integrity-manual-entry'),
    );
    value(await session.submit(chapterRequest(), 'integrity-manual-answer'));
    const record = session.state().record as SyntheticLoopRecord;
    expect(record.lastCompletion?.evidence).toBe('manual');
    expect(value(growingJourneyForRecord(record)).assessmentCount).toBe(0);
    expect(
      value(deriveSyntheticLoop(record.profileId, record.events)).snapshot
        .nextOrdinal,
    ).toBe(1);
    const before = value(canonicalize(record)),
      previousWrites = writes;
    for (const playMode of ['exploration', 'numberLab'] as const)
      value(
        await session.submit(
          { ...chapterRequest(), playMode },
          `integrity-${playMode.toLowerCase()}`,
        ),
      );
    expect(value(canonicalize(session.state().record))).toBe(before);
    expect(writes).toBe(previousWrites);
  });
});
