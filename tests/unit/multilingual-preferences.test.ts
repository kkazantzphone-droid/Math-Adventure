import { describe, expect, it } from 'vitest';
import { applicationFailure } from '../../src/application/core/result';
import type {
  AtomicRecordRepository,
  RepositoryCommand,
} from '../../src/application/ports/repository';
import {
  createSyntheticLoopSession,
  initialSyntheticLoop,
  syntheticLoopCodec,
  syntheticLoopRecordId,
  syntheticLoopTaskSeed,
} from '../../src/application/synthetic-loop';
import type {
  LoopAnswerRequest,
  LoopPreferences,
  SyntheticLoopRecord,
} from '../../src/application/synthetic-loop';
import { createProofReplay } from '../../src/domain/families/proofs';
import { canonicalize } from '../../src/domain/replay/canonical';
import { createSyntheticRepository } from '../fakes/synthetic-repository';

const star = 'SYNTHETIC-PLAYER-1';
const triangle = 'SYNTHETIC-PLAYER-2';
const english: LoopPreferences = {
  uiLocale: 'en-GB',
  instructionLocale: 'en-GB',
  numberSpeechLocale: 'en-GB',
};
const german: LoopPreferences = {
  uiLocale: 'de-DE',
  instructionLocale: 'de-DE',
  numberSpeechLocale: 'de-DE',
};
const mixed: LoopPreferences = {
  uiLocale: 'el-GR',
  instructionLocale: 'en-GB',
  numberSpeechLocale: 'de-DE',
};

function value<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string } },
): T {
  if (!result.ok)
    throw new Error(`Synthetic language fixture: ${result.error.code}`);
  return result.value;
}

function repository() {
  return value(createSyntheticRepository(syntheticLoopCodec));
}

function recordWithoutPreferences(record: SyntheticLoopRecord) {
  const { preferences, ...mathematicalState } = record;
  void preferences;
  return value(canonicalize(mathematicalState));
}

function request(): LoopAnswerRequest {
  return {
    replay: value(
      createProofReplay('number.addition', '00000001000000020000000300000004'),
    ),
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

describe('Persisted child language preferences stay outside mathematics', () => {
  it('creates the first selected badge with detached preferences in its first atomic command', async () => {
    const underlying = repository();
    const commands: RepositoryCommand<SyntheticLoopRecord>[] = [];
    const session = createSyntheticLoopSession({
      ...underlying,
      execute(command) {
        commands.push(command);
        return underlying.execute(command);
      },
    });
    const chosen = { ...english };
    value(await session.selectProfile(star, 'language-create-star', chosen));
    chosen.uiLocale = 'de-DE';
    const record = session.state().record;
    if (!record) throw new Error('Expected selected synthetic badge');
    expect(record.preferences).toEqual(english);
    expect(Object.isFrozen(record.preferences)).toBe(true);
    expect(commands).toHaveLength(1);
    expect(commands[0]?.kind).toBe('create');
    expect(recordWithoutPreferences(record)).toBe(
      recordWithoutPreferences(initialSyntheticLoop(star)),
    );
    expect(session.state().snapshot?.revision).toBe(1);
    expect(session.state().saved).toBe(true);
  });

  it('restores each badge preference on switch and restart without overwriting from the entry language', async () => {
    const repo = repository();
    const session = createSyntheticLoopSession(repo);
    value(await session.selectProfile(star, 'language-create-star', english));
    value(
      await session.selectProfile(triangle, 'language-create-triangle', german),
    );
    value(await session.setPreferences(mixed, 'language-triangle-mixed'));
    value(await session.selectProfile(star, 'language-return-star', german));
    expect(session.state().record?.preferences).toEqual(english);
    expect(session.state().snapshot?.revision).toBe(1);
    const restarted = createSyntheticLoopSession(repo);
    value(
      await restarted.selectProfile(
        triangle,
        'language-reopen-triangle',
        english,
      ),
    );
    expect(restarted.state().record?.preferences).toEqual(mixed);
    expect(restarted.state().snapshot?.revision).toBe(2);
    expect(restarted.state().record?.sessionOrdinal).toBe(1);
    expect(restarted.state().record?.events).toEqual([]);
  });

  it('switches all roles and each independent role while preserving every mathematical wire field and replay seed', async () => {
    const repo = repository();
    const session = createSyntheticLoopSession(repo);
    value(await session.selectProfile(star, 'language-create-star'));
    value(await session.setMode('synthetic-policy', 'language-mode'));
    value(await session.submit(request(), 'language-math-answer'));
    const before = session.state().record;
    if (!before) throw new Error('Expected completed synthetic record');
    const mathematicalState = recordWithoutPreferences(before);
    const adaptation = session.state().adaptation;
    const replaySeed = value(
      syntheticLoopTaskSeed(star, before.selectedFamily, before.taskOrdinal),
    );
    const selections = [
      english,
      german,
      mixed,
      { ...mixed, uiLocale: 'de-DE' as const },
      { ...mixed, instructionLocale: 'de-DE' as const },
      { ...mixed, numberSpeechLocale: 'en-GB' as const },
    ];
    for (const [index, preferences] of selections.entries()) {
      const revision = session.state().snapshot?.revision;
      value(
        await session.setPreferences(preferences, `language-switch-${index}`),
      );
      const after = session.state().record;
      if (!after) throw new Error('Expected retained synthetic record');
      expect(after.preferences).toEqual(preferences);
      expect(recordWithoutPreferences(after)).toBe(mathematicalState);
      expect(session.state().adaptation).toEqual(adaptation);
      expect(
        value(
          syntheticLoopTaskSeed(star, after.selectedFamily, after.taskOrdinal),
        ),
      ).toBe(replaySeed);
      expect(session.state().snapshot?.revision).toBe((revision ?? 0) + 1);
    }
    const restarted = createSyntheticLoopSession(repo);
    value(await restarted.selectProfile(star));
    const restored = restarted.state().record;
    if (!restored) throw new Error('Expected restored synthetic record');
    expect(recordWithoutPreferences(restored)).toBe(mathematicalState);
    expect(restarted.state().adaptation).toEqual(adaptation);
  });

  it('keeps explicit unsaved initial and changed preferences session-only', async () => {
    const session = createSyntheticLoopSession(null);
    value(await session.selectProfile(star, undefined, english));
    expect(session.state().record?.preferences).toEqual(english);
    value(await session.setPreferences(mixed, 'language-unsaved-switch'));
    expect(session.state().record?.preferences).toEqual(mixed);
    expect(session.state().snapshot).toBeNull();
    expect(session.state().saved).toBe(false);
    expect(session.state().record?.completedCount).toBe(0);
    expect(await session.updateReadiness()).toBe(false);
  });

  it.each([
    { ...english, uiLocale: 'en-US' },
    { ...english, instructionLocale: 'de' },
    { ...english, numberSpeechLocale: 'pt-BR' },
    { ...english, extra: 'not-a-preference' },
  ])(
    'rejects malformed initial preferences before selecting or writing',
    async (invalid) => {
      const underlying = repository();
      let calls = 0;
      const session = createSyntheticLoopSession({
        ...underlying,
        execute(command) {
          calls += 1;
          return underlying.execute(command);
        },
      });
      expect(
        await session.selectProfile(
          star,
          'language-invalid-create',
          invalid as LoopPreferences,
        ),
      ).toEqual(applicationFailure('invalid_record'));
      expect(session.state().record).toBeNull();
      expect(calls).toBe(0);
      expect(await underlying.load(value(syntheticLoopRecordId(star)))).toEqual(
        applicationFailure('record_not_found'),
      );
    },
  );

  it('invalid preference changes leave the prior record and repository revision untouched', async () => {
    const repo = repository();
    const session = createSyntheticLoopSession(repo);
    value(await session.selectProfile(star, 'language-create-star', english));
    const before = value(canonicalize(session.state().record));
    expect(
      await session.setPreferences(
        { ...english, uiLocale: 'en-US' } as unknown as LoopPreferences,
        'language-invalid-switch',
      ),
    ).toEqual(applicationFailure('invalid_record'));
    expect(value(canonicalize(session.state().record))).toBe(before);
    const persisted = value(
      await repo.load(value(syntheticLoopRecordId(star))),
    );
    expect(persisted.revision).toBe(1);
    expect(value(canonicalize(persisted.payload))).toBe(before);
  });

  it('a lost committed response reports uncertainty until reload establishes the saved preference', async () => {
    const underlying = repository();
    const session = createSyntheticLoopSession({
      ...underlying,
      async execute(command) {
        const result = await underlying.execute(command);
        return command.operationId === 'language-response-lost'
          ? applicationFailure('storage_unavailable')
          : result;
      },
    });
    value(await session.selectProfile(star, 'language-create-star', english));
    const before = session.state().record;
    if (!before) throw new Error('Expected selected synthetic record');
    expect(
      await session.setPreferences(german, 'language-response-lost'),
    ).toEqual(applicationFailure('storage_unavailable'));
    expect(session.state().record?.preferences).toEqual(english);
    expect(session.state().saved).toBe(false);
    expect(session.state().uncertain).toBe(true);
    expect(session.state().readOnly).toBe(true);
    expect(await session.updateReadiness()).toBe(false);
    value(await session.reload());
    const after = session.state().record;
    if (!after) throw new Error('Expected reconciled synthetic record');
    expect(after.preferences).toEqual(german);
    expect(recordWithoutPreferences(after)).toBe(
      recordWithoutPreferences(before),
    );
    expect(session.state().saved).toBe(true);
    expect(session.state().uncertain).toBe(false);
  });

  it('an aborted preference write keeps the saved choice and never queues a later retry', async () => {
    const underlying = repository();
    let calls = 0;
    const session = createSyntheticLoopSession({
      ...underlying,
      execute(command) {
        calls += 1;
        return command.operationId === 'language-aborted'
          ? Promise.resolve(applicationFailure('quota_exceeded'))
          : underlying.execute(command);
      },
    });
    value(await session.selectProfile(star, 'language-create-star', english));
    expect(await session.setPreferences(german, 'language-aborted')).toEqual(
      applicationFailure('quota_exceeded'),
    );
    value(await session.reload());
    expect(session.state().record?.preferences).toEqual(english);
    expect(session.state().snapshot?.revision).toBe(1);
    expect(session.state().saved).toBe(true);
    expect(calls).toBe(2);
  });

  it('an obsolete preference callback remains bound to its badge during a switch', async () => {
    const underlying = repository();
    let release: (() => void) | undefined;
    const repo: AtomicRecordRepository<SyntheticLoopRecord> = {
      ...underlying,
      execute(command) {
        if (command.operationId !== 'language-held-star')
          return underlying.execute(command);
        return new Promise((resolve) => {
          release = () => {
            void underlying.execute(command).then(resolve);
          };
        });
      },
    };
    const session = createSyntheticLoopSession(repo);
    value(await session.selectProfile(star, 'language-create-star', english));
    const pending = session.setPreferences(german, 'language-held-star');
    value(
      await session.selectProfile(triangle, 'language-create-triangle', mixed),
    );
    if (!release) throw new Error('Expected held language command');
    release();
    expect(await pending).toEqual(applicationFailure('operation_conflict'));
    expect(session.state().record?.profileId).toBe(triangle);
    expect(session.state().record?.preferences).toEqual(mixed);
    expect(session.state().record?.events).toEqual([]);
    const original = value(
      await underlying.load(value(syntheticLoopRecordId(star))),
    );
    expect(original.payload.preferences).toEqual(german);
    expect(original.payload.completedCount).toBe(0);
  });

  it('a global deletion fence refuses stale preference updates without recreating a badge', async () => {
    const repo = repository();
    const first = createSyntheticLoopSession(repo);
    const stale = createSyntheticLoopSession(repo);
    value(await first.selectProfile(star, 'language-create-star', english));
    value(await stale.selectProfile(star));
    value(await first.deleteProfile('language-delete-star'));
    expect(await stale.setPreferences(german, 'language-stale-switch')).toEqual(
      applicationFailure('epoch_conflict'),
    );
    expect(stale.state().record?.preferences).toEqual(english);
    expect(stale.state().readOnly).toBe(true);
    expect(await repo.load(value(syntheticLoopRecordId(star)))).toEqual(
      applicationFailure('record_not_found'),
    );
  });

  it('a frozen update boundary or pending completion cannot accept a language write', async () => {
    const underlying = repository();
    const session = createSyntheticLoopSession({
      ...underlying,
      execute(command) {
        return command.operationId === 'language-pending-answer'
          ? Promise.resolve(applicationFailure('storage_unavailable'))
          : underlying.execute(command);
      },
    });
    value(await session.selectProfile(star, 'language-create-star', english));
    session.freeze();
    expect(await session.setPreferences(german, 'language-frozen')).toEqual(
      applicationFailure('invalid_command'),
    );
    session.unfreeze();
    expect(await session.submit(request(), 'language-pending-answer')).toEqual(
      applicationFailure('storage_unavailable'),
    );
    expect(session.state().record?.pending).not.toBeNull();
    expect(
      await session.setPreferences(german, 'language-pending-switch'),
    ).toEqual(applicationFailure('invalid_command'));
    expect(session.state().record?.preferences).toEqual(english);
    expect(session.state().record?.completedCount).toBe(0);
  });
});
