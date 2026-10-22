import fc from 'fast-check';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  createSyntheticLoopBackup,
  createSyntheticLoopRestorePlan,
  createSyntheticLoopSession,
  prepareSyntheticLoopAnswer,
  readSyntheticLoopBackup,
  summarizeSyntheticLoopProfile,
  syntheticLoopCodec,
  syntheticLoopRecordId,
  syntheticLoopTaskSeed,
  SYNTHETIC_BACKUP_COMPATIBILITY,
  SYNTHETIC_BACKUP_LIMITS,
  SYNTHETIC_LOOP_CATALOG,
} from '../../src/application/synthetic-loop';
import type { SyntheticLoopRecord } from '../../src/application/synthetic-loop';
import {
  sha256Hex,
  utf8Length,
} from '../../src/application/synthetic-loop/digest';
import { ADAPTATION_POLICY } from '../../src/domain/adaptation/policy';
import { GROWING_JOURNEY_POLICY } from '../../src/domain/growing-world/journey';
import { createChapterTask } from '../../src/application/growing-world';
import { restoreOutcomeFrom } from '../../src/ui/synthetic-loop/backup-outcome';
import { createSyntheticRepository } from '../fakes/synthetic-repository';
import {
  answerOperation,
  SYNTHETIC_BACKUP_SCRIPT,
  syntheticBackupWorld,
  value,
  withPendingAnswer,
} from '../fixtures/synthetic/keep-adventure';

/** Independent canonical JSON: recursive UTF-16 key sort + JSON spelling. */
function oracleCanonical(input: unknown): string {
  if (Array.isArray(input)) return `[${input.map(oracleCanonical).join(',')}]`;
  if (input !== null && typeof input === 'object')
    return `{${Object.keys(input)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${oracleCanonical((input as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`;
  return JSON.stringify(input);
}
const oracleSha = (text: string) =>
  createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

/** Independently rebuild a file with a recomputed checksum after an edit. */
function rewrite(text: string, edit: (data: Record<string, unknown>) => void) {
  const data = JSON.parse(text) as Record<string, unknown>;
  delete data.checksum;
  edit(data);
  const body = oracleCanonical(data);
  return oracleCanonical({
    ...data,
    checksum: { algorithm: 'sha-256', value: oracleSha(body) },
  });
}

// Frozen synthetic records are shared; building them once keeps the suite fast.
const sharedWorld = syntheticBackupWorld();
const loadWorld = () => sharedWorld;
const code = (text: unknown) => {
  const result = readSyntheticLoopBackup(text);
  return result.ok ? 'ok' : result.error.code;
};
const controlKeys = [
  'derived',
  'pending',
  'lastCompletion',
  'storageEpoch',
  'expectedRevision',
  'revision',
  'operationId',
  'receipts',
  'recordId',
  'explorationCount',
  'sessionOnlyCompletion',
];
function keysDeep(input: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(input)) for (const item of input) keysDeep(item, found);
  else if (input !== null && typeof input === 'object')
    for (const [key, nested] of Object.entries(input)) {
      found.add(key);
      keysDeep(nested, found);
    }
  return found;
}
/** The intended portable meaning: everything except the declared exclusions. */
function portableOracle(record: SyntheticLoopRecord) {
  const copy = JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
  delete copy.derived;
  delete copy.pending;
  delete copy.lastCompletion;
  return oracleCanonical(copy);
}

describe(
  'Keep my adventure — independent digest oracle',
  { timeout: 30_000 },
  () => {
    it('matches FIPS vectors and node:crypto over generated Unicode text', () => {
      expect(sha256Hex('')).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      );
      expect(sha256Hex('abc')).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      );
      expect(
        sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
      ).toBe(
        '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
      );
      expect(sha256Hex('a'.repeat(1_000_000))).toBe(
        'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
      );
      fc.assert(
        fc.property(fc.string({ unit: 'binary', maxLength: 300 }), (text) => {
          const bytes = new TextEncoder().encode(text);
          expect(utf8Length(text)).toBe(bytes.length);
          expect(sha256Hex(text)).toBe(
            createHash('sha256').update(bytes).digest('hex'),
          );
        }),
        { seed: 20261022, numRuns: 1500 },
      );
    });
  },
);

describe(
  'Keep my adventure — portable backup contract',
  { timeout: 30_000 },
  () => {
    it('pins the exact compatibility provenance this build can restore', () => {
      expect(SYNTHETIC_BACKUP_COMPATIBILITY).toEqual({
        adaptationPolicy: 'phase3b-synthetic-policy-v1',
        canonicalization: 'canonical-json-v1',
        content: [
          'phase2-content-v1',
          'phase3c-content-v1',
          'growing-world-content-v1',
        ],
        evidenceCatalog: 'phase3b-evidence-catalog-v1',
        generators: [
          'addition-bounded-v1',
          'quadrilateral-bounded-v1',
          'unit-length-bounded-v1',
          'numeral-zero-five-v1',
          'counting-zero-five-v1',
          'comparison-zero-five-v1',
          'subtraction-zero-five-v1',
          'missing-addend-zero-five-v1',
          'make-ten-crossing-v1',
          'missing-part-eleven-twenty-v1',
          'equal-groups-two-five-v1',
          'missing-group-two-five-v1',
          'array-unit-area-two-five-v1',
          'principal-square-side-one-six-v1',
        ],
        invitationPolicy: 'growing-world-invitations-v1',
        randomAlgorithm: 'xoshiro128ss-v1',
        recordSchemas: [
          'phase3c-synthetic-loop-v1',
          'growing-world-synthetic-loop-v2',
        ],
        semantics:
          '58d5bafe4cb4e2866898e7496fd84ca6a69113b4b93de1c2430e7a63abfc2490',
        taskSeeds: 'phase3c-session-seeds-v1',
      });
      expect(SYNTHETIC_BACKUP_LIMITS).toEqual({
        bytes: 1_048_576,
        depth: 32,
        profiles: 2,
      });
    });

    it('exports settled legacy and growing histories in an independently canonical, checksummed file', async () => {
      const world = await loadWorld();
      expect(world.star.schema).toBe('growing-world-synthetic-loop-v2');
      expect(world.triangle.schema).toBe('phase3c-synthetic-loop-v1');
      // Snapshot order is not authority: the file uses fixed slot order.
      const file = value(
        createSyntheticLoopBackup([world.triangle, world.star]),
      );
      expect(file.excludedPending).toBe(0);
      const parsed = JSON.parse(file.text) as Record<string, unknown>;
      expect(oracleCanonical(parsed)).toBe(file.text);
      const { checksum, ...body } = parsed;
      expect(checksum).toEqual({
        algorithm: 'sha-256',
        value: oracleSha(oracleCanonical(body)),
      });
      expect(Object.keys(parsed).sort()).toEqual([
        'checksum',
        'compatibility',
        'format',
        'formatVersion',
        'profiles',
        'synthetic',
      ]);
      expect(parsed.format).toBe('math-adventure-synthetic-backup');
      expect(parsed.formatVersion).toBe(1);
      expect(parsed.synthetic).toBe(true);
      const profiles = parsed.profiles as Record<string, unknown>[];
      expect(profiles.map((profile) => profile.profileId)).toEqual([
        'SYNTHETIC-PLAYER-1',
        'SYNTHETIC-PLAYER-2',
      ]);
      const keys = keysDeep(profiles);
      for (const key of controlKeys) expect(keys.has(key)).toBe(false);
      expect(profiles.map(oracleCanonical)).toEqual([
        portableOracle(world.star),
        portableOracle(world.triangle),
      ]);
      // No clock, device, browser, origin or source control token is present.
      expect(file.text).not.toMatch(
        /kma-star-create|kma-triangle-create|http|127\.0\.0\.1|Date|navigator/,
      );
    });

    it('reconstructs exact records: portable fields equal, derived state equal, control fields absent', async () => {
      const world = await loadWorld();
      const file = value(
        createSyntheticLoopBackup([world.star, world.triangle]),
      );
      const restored = value(readSyntheticLoopBackup(file.text)).profiles;
      for (const [index, source] of [world.star, world.triangle].entries()) {
        const record = restored[index];
        if (!record) throw new Error('missing restored profile');
        expect(portableOracle(record)).toBe(portableOracle(source));
        expect(oracleCanonical(record.derived)).toBe(
          oracleCanonical(source.derived),
        );
        expect(record.pending).toBeNull();
        expect(record.lastCompletion).toBeNull();
      }
      // Source lastCompletion existed and is deliberately not authority.
      expect(world.star.lastCompletion).not.toBeNull();
    });

    it('summarizes provenance with the scripted independent/supported/worked mix', async () => {
      const world = await loadWorld();
      const star = summarizeSyntheticLoopProfile(world.star);
      const script = SYNTHETIC_BACKUP_SCRIPT.star;
      expect(star).toMatchObject({
        profileId: 'SYNTHETIC-PLAYER-1',
        world: 'growing',
        mode: 'synthetic-policy',
        selectedFamily: 'groups.equal',
        sessionOrdinal: script.sessionOrdinal,
        sessionActive: true,
        completedCount: script.completed,
        independent: script.legacyIndependent + script.chapterIndependent,
        supported: script.legacySupported + script.chapterSupported,
        worked: script.chapterWorked,
        notYet: 0,
        helpContexts: 2,
        preferences: {
          uiLocale: 'el-GR',
          instructionLocale: 'en-GB',
          numberSpeechLocale: 'el-GR',
        },
      });
      expect(star.accomplishments.length).toBeGreaterThan(0);
      const triangle = summarizeSyntheticLoopProfile(world.triangle);
      expect(triangle).toMatchObject({
        world: 'original',
        sessionActive: false,
        completedCount: SYNTHETIC_BACKUP_SCRIPT.triangle.completed,
        independent: SYNTHETIC_BACKUP_SCRIPT.triangle.independent,
        notYet: SYNTHETIC_BACKUP_SCRIPT.triangle.unsuccessful,
        worked: 0,
        helpContexts: 0,
        preferences: {
          uiLocale: 'de-DE',
          instructionLocale: 'de-DE',
          numberSpeechLocale: 'de-DE',
        },
      });
      expect(
        summarizeSyntheticLoopProfile(
          value(
            readSyntheticLoopBackup(
              value(createSyntheticLoopBackup([world.star])).text,
            ),
          ).profiles[0] as SyntheticLoopRecord,
        ),
      ).toEqual(star);
    });

    it('leaves an answer still saving at its source and never replays it as success', async () => {
      const world = await loadWorld();
      const pending = withPendingAnswer(world.star);
      expect(pending.pending).not.toBeNull();
      const file = value(createSyntheticLoopBackup([pending, world.triangle]));
      expect(file.excludedPending).toBe(1);
      const restored = value(readSyntheticLoopBackup(file.text)).profiles[0];
      expect(restored?.pending).toBeNull();
      // The exported state is exactly the last settled state before staging.
      expect(portableOracle(restored as SyntheticLoopRecord)).toBe(
        portableOracle(world.star),
      );
      expect(restored?.completedCount).toBe(pending.completedCount);
      expect(restored?.events).toEqual(pending.events);
      expect(file.text).not.toContain(answerOperation(99));
      // A hand-made file cannot smuggle pending work back in.
      expect(
        code(
          rewrite(file.text, (data) => {
            const profiles = data.profiles as Record<string, unknown>[];
            (profiles[0] as Record<string, unknown>).pending = pending.pending;
          }),
        ),
      ).toBe('invalid_contents');
    });

    it('keeps saved help provenance: an assisted task cannot become independent after restore', async () => {
      const world = await loadWorld();
      const restored = value(
        readSyntheticLoopBackup(
          value(createSyntheticLoopBackup([world.star])).text,
        ),
      ).profiles[0];
      if (!restored || restored.schema !== 'growing-world-synthetic-loop-v2')
        throw new Error('expected restored growing profile');
      expect(restored.chapterSupport).toEqual(
        world.star.schema === 'growing-world-synthetic-loop-v2'
          ? world.star.chapterSupport
          : null,
      );
      const prepared = value(
        prepareSyntheticLoopAnswer(
          restored,
          {
            replay: world.openHelpReplay,
            answer: world.openHelpAnswer,
            mathematicalHintTier: 0,
            meaningfulAttempts: 1,
            solutionExposed: false,
            accessibilitySupports: [],
            accessible: true,
            playMode: 'practice',
            coarseDay: 100,
            clockCertain: false,
            revisit: false,
          },
          answerOperation(98),
          2,
          0,
        ),
      );
      expect(prepared.kind).toBe('pending');
      if (prepared.kind !== 'pending') return;
      expect(prepared.pending.correct).toBe(true);
      expect(prepared.pending.chapterObservation).toMatchObject({
        mathematicalHintTier: 3,
        solutionExposed: true,
      });
    });

    it('builds fresh-destination create commands without source control metadata', async () => {
      const world = await loadWorld();
      const backup = value(
        readSyntheticLoopBackup(
          value(createSyntheticLoopBackup([world.star, world.triangle])).text,
        ),
      );
      const plan = value(
        createSyntheticLoopRestorePlan(backup, 7, [
          'synthetic-restore-a',
          'synthetic-restore-b',
        ]),
      );
      expect(
        plan.map((command) => {
          const copy: Record<string, unknown> = { ...command };
          delete copy.payload;
          return copy;
        }),
      ).toEqual([
        {
          version: 'atomic-command-v1',
          recordSchema: 'phase3c-synthetic-loop-v1',
          kind: 'create',
          expectedRevision: null,
          operationId: 'synthetic-restore-a',
          recordId: 'synthetic-player-1',
          storageEpoch: 7,
        },
        {
          version: 'atomic-command-v1',
          recordSchema: 'phase3c-synthetic-loop-v1',
          kind: 'create',
          expectedRevision: null,
          operationId: 'synthetic-restore-b',
          recordId: 'synthetic-player-2',
          storageEpoch: 7,
        },
      ]);
      for (const invalid of [
        [backup, 7, ['synthetic-restore-a']],
        [backup, 7, ['synthetic-restore-a', 'synthetic-restore-a']],
        [backup, 7, ['Synthetic Restore', 'synthetic-restore-b']],
        [backup, -1, ['synthetic-restore-a', 'synthetic-restore-b']],
        [backup, 1.5, ['synthetic-restore-a', 'synthetic-restore-b']],
      ] as const)
        expect(
          createSyntheticLoopRestorePlan(invalid[0], invalid[1], invalid[2]),
        ).toEqual({ ok: false, error: { code: 'invalid_command' } });
    });
  },
);

describe(
  'Keep my adventure — untrusted import refusal',
  { timeout: 30_000 },
  () => {
    async function fileText() {
      const world = await loadWorld();
      return value(createSyntheticLoopBackup([world.star, world.triangle]))
        .text;
    }

    it('refuses malformed, truncated, reformatted and unrelated inputs with stable codes', async () => {
      const text = await fileText();
      expect(code(text)).toBe('ok');
      expect(code(undefined)).toBe('not_backup');
      expect(code('')).toBe('not_backup');
      expect(code('not json')).toBe('not_backup');
      expect(code('[]')).toBe('not_backup');
      expect(code('{"format":"other","formatVersion":1}')).toBe('not_backup');
      expect(code(text.slice(0, Math.floor(text.length / 2)))).toBe('damaged');
      expect(code(text.slice(0, -1))).toBe('damaged');
      expect(code(`${text}\n`)).toBe('damaged');
      expect(code(JSON.stringify(JSON.parse(text), null, 2))).toBe('damaged');
      // Reordered keys: same JSON value, not the canonical spelling.
      const data = JSON.parse(text) as Record<string, unknown>;
      const reordered = JSON.stringify(
        Object.fromEntries(Object.entries(data).reverse()),
      );
      expect(code(reordered)).toBe('damaged');
      // Duplicate key: JSON.parse keeps the last value; spelling differs.
      expect(
        code(text.replace('{"checksum":', '{"synthetic":false,"checksum":')),
      ).toBe('damaged');
      // A numeric token JSON.parse would round cannot pass canonical spelling.
      expect(
        code(
          text.replace(
            '"formatVersion":1',
            '"formatVersion":1.0000000000000001',
          ),
        ),
      ).toBe('damaged');
    });

    it('detects every single-character change', async () => {
      const text = await fileText();
      fc.assert(
        fc.property(
          fc.nat({ max: text.length - 1 }),
          fc.constantFrom(...'0123456789abcdefSXYZ"{}[],:-_ é'),
          (index, replacement) => {
            const changed =
              text.slice(0, index) + replacement + text.slice(index + 1);
            if (changed !== text) expect(code(changed)).not.toBe('ok');
          },
        ),
        { seed: 20261022, numRuns: 2000 },
      );
    });

    it('distinguishes future, incompatible and invalid contents after the checksum', async () => {
      const text = await fileText();
      expect(code(rewrite(text, (data) => (data.formatVersion = 2)))).toBe(
        'newer_version',
      );
      for (const version of [0, '1', 1.5, -1, null])
        expect(
          code(rewrite(text, (data) => (data.formatVersion = version))),
        ).toBe('not_backup');
      expect(
        code(
          rewrite(text, (data) => {
            const compatibility = data.compatibility as Record<string, unknown>;
            compatibility.adaptationPolicy = 'phase3b-synthetic-policy-v2';
          }),
        ),
      ).toBe('incompatible');
      expect(
        code(
          rewrite(text, (data) => {
            const compatibility = data.compatibility as Record<string, unknown>;
            compatibility.generators = [];
          }),
        ),
      ).toBe('incompatible');
      expect(
        code(
          rewrite(text, (data) => {
            const profiles = data.profiles as Record<string, unknown>[];
            (profiles[0] as Record<string, unknown>).schema = 'future-loop-v3';
          }),
        ),
      ).toBe('incompatible');
      const profileEdit =
        (
          edit: (
            profile: Record<string, unknown>,
            all: Record<string, unknown>[],
          ) => void,
        ) =>
        (data: Record<string, unknown>) => {
          const profiles = data.profiles as Record<string, unknown>[];
          edit(profiles[0] as Record<string, unknown>, profiles);
        };
      for (const edit of [
        profileEdit((profile) => (profile.exploration = [])),
        profileEdit((profile) => (profile.storageEpoch = 4)),
        profileEdit((profile) => (profile.derived = {})),
        profileEdit((profile) => (profile.lastCompletion = null)),
        profileEdit((profile) => (profile.profileId = 'SYNTHETIC-PLAYER-3')),
        profileEdit((profile) => (profile.marker = 'real-learner')),
        profileEdit((profile) => (profile.completedCount = 0)),
        profileEdit((profile) => (profile.sessionOrdinal = 1)),
        profileEdit((profile) => {
          const events = profile.events as Record<string, unknown>[];
          const first = events[0] as { input: Record<string, unknown> };
          first.input.mathematicalHintTier = 7;
        }),
        profileEdit((profile) => {
          const support = profile.chapterSupport as Record<string, unknown>[];
          (support[0] as Record<string, unknown>).maxHintTier = 0;
        }),
        profileEdit((_, all) => all.reverse()),
        profileEdit((profile, all) => all.push(profile)),
        profileEdit((_, all) => all.splice(0)),
        profileEdit((profile, all) => (all[1] = profile)),
      ])
        expect(code(rewrite(text, edit))).toBe('invalid_contents');
      expect(code(rewrite(text, (data) => (data.synthetic = false)))).toBe(
        'invalid_contents',
      );
      expect(code(rewrite(text, (data) => (data.extra = 1)))).toBe(
        'invalid_contents',
      );
      // A prototype-shaped own key is data, never a prototype change.
      expect(
        code(
          rewrite(text, (data) => {
            const profiles = data.profiles as Record<string, unknown>[];
            Object.defineProperty(profiles[0], '__proto__', {
              value: { polluted: true },
              enumerable: true,
            });
          }),
        ),
      ).toBe('invalid_contents');
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('bounds size and nesting before parsing work', () => {
      const limit = SYNTHETIC_BACKUP_LIMITS.bytes;
      expect(code(' '.repeat(limit + 1))).toBe('too_large');
      // UTF-8 byte size, not code-unit length, is the bound.
      expect(code('é'.repeat(limit / 2 + 1))).toBe('too_large');
      expect(code('['.repeat(100_000))).toBe('not_backup');
      expect(
        code(`{"checksum":{"algorithm":"sha-256","value":"${'['.repeat(40)}`),
      ).toBe('damaged');
      expect(code(`[${'{"a":'.repeat(40)}1${'}'.repeat(40)}]`)).toBe(
        'not_backup',
      );
    });

    it('refuses to create a file from nothing, too much or invalid records', async () => {
      const world = await loadWorld();
      expect(createSyntheticLoopBackup([])).toEqual({
        ok: false,
        error: { code: 'nothing_saved' },
      });
      expect(
        createSyntheticLoopBackup([world.star, world.triangle, world.star]).ok,
      ).toBe(false);
      expect(createSyntheticLoopBackup([world.star, world.star]).ok).toBe(
        false,
      );
      expect(
        createSyntheticLoopBackup([{ ...world.star, completedCount: -1 }]).ok,
      ).toBe(false);
    });
  },
);

describe(
  'Keep my adventure — independent review repairs',
  { timeout: 30_000 },
  () => {
    it('pins compatibility to the exact policy values and evidence scopes', () => {
      expect(SYNTHETIC_BACKUP_COMPATIBILITY.semantics).toBe(
        oracleSha(
          oracleCanonical({
            adaptationPolicy: ADAPTATION_POLICY,
            evidenceScopes: SYNTHETIC_LOOP_CATALOG,
            invitationPolicy: GROWING_JOURNEY_POLICY,
          }),
        ),
      );
    });

    it('reports success only from an exact readback and never claims nothing was written after a commit', () => {
      const restored = { kind: 'restored' };
      const reason = (value: string) => ({
        kind: 'not-restored',
        reason: value,
      });
      const uncertain = { kind: 'uncertain' };
      const fail = (code: Parameters<typeof restoreOutcomeFrom>[0] & object) =>
        code;
      const table: [
        Parameters<typeof restoreOutcomeFrom>[0],
        Parameters<typeof restoreOutcomeFrom>[1],
        unknown,
      ][] = [
        [{ ok: true }, 'restored', restored],
        [{ ok: true }, 'different', reason('differs')],
        [{ ok: true }, 'absent', reason('absent')],
        [{ ok: true }, null, uncertain],
        [null, 'restored', restored],
        [null, 'different', reason('differs')],
        [null, 'absent', reason('absent')],
        [null, null, uncertain],
        // A lost or failed report never hides an exact restore that exists.
        [
          fail({ ok: false, code: 'storage_unavailable' }),
          'restored',
          restored,
        ],
        [
          fail({ ok: false, code: 'record_already_exists' }),
          'different',
          reason('occupied'),
        ],
        [
          fail({ ok: false, code: 'epoch_conflict' }),
          'absent',
          reason('changed'),
        ],
        [
          fail({ ok: false, code: 'operation_conflict' }),
          'different',
          reason('changed'),
        ],
        [
          fail({ ok: false, code: 'quota_exceeded' }),
          'absent',
          reason('quota'),
        ],
        [
          fail({ ok: false, code: 'storage_unavailable' }),
          'absent',
          reason('unavailable'),
        ],
        [
          fail({ ok: false, code: 'storage_unavailable' }),
          null,
          reason('unavailable'),
        ],
      ];
      for (const [commit, readback, expected] of table)
        expect(restoreOutcomeFrom(commit, readback)).toEqual(expected);
    });

    it('counts later unassisted confirmations and same-session repeats separately from new cases', async () => {
      const repository = value(createSyntheticRepository(syntheticLoopCodec));
      const session = createSyntheticLoopSession(repository);
      value(await session.selectProfile('SYNTHETIC-PLAYER-1', 'kma-c-create'));
      value(await session.setMode('synthetic-policy', 'kma-c-guided'));
      value(await session.setActivity('number.make-ten', 'kma-c-chapter'));
      const task = value(
        createChapterTask(
          'number.make-ten',
          value(
            syntheticLoopTaskSeed('SYNTHETIC-PLAYER-1', 'number.make-ten', 0),
          ),
        ),
      );
      if (task.task.kind !== 'makeTen') throw new Error('make ten expected');
      const answer = {
        replay: task.replay,
        answer: {
          kind: 'exactValue' as const,
          value: {
            schema: 'rational-v1' as const,
            numerator: String(10 - task.task.first),
            denominator: '1',
          },
        },
        mathematicalHintTier: 0 as const,
        meaningfulAttempts: 1 as const,
        solutionExposed: false,
        accessibilitySupports: [],
        accessible: true,
        playMode: 'practice' as const,
        coarseDay: 100,
        clockCertain: false,
        revisit: false,
      };
      value(await session.submit(answer, answerOperation(51)));
      value(await session.submit(answer, answerOperation(52)));
      value(await session.endSession('kma-c-stop'));
      value(await session.startSession('kma-c-start'));
      value(await session.submit(answer, answerOperation(53)));
      const record = value(
        await repository.load(
          value(syntheticLoopRecordId('SYNTHETIC-PLAYER-1')),
        ),
      ).payload;
      const summary = summarizeSyntheticLoopProfile(record);
      // One new case; a same-session repeat; a later-session confirmation.
      expect(summary).toMatchObject({
        independent: 1,
        notCounted: 1,
        confirmations: 1,
        supported: 0,
        worked: 0,
        notYet: 0,
      });
      const restored = value(
        readSyntheticLoopBackup(
          value(createSyntheticLoopBackup([record])).text,
        ),
      ).profiles[0];
      expect(restored && summarizeSyntheticLoopProfile(restored)).toEqual(
        summary,
      );
    });

    it('excludes a legacy pending observation and a pending stranded by a later deletion fence', async () => {
      const world = await loadWorld();
      const legacy = value(
        syntheticLoopCodec.decode({ ...world.triangle, sessionActive: true }),
      );
      const legacyPending = withPendingAnswer(legacy);
      expect(legacyPending.pending?.observation).not.toBeNull();
      const stranded = withPendingAnswer(world.star, 5);
      expect(stranded.pending?.storageEpoch).toBe(5);
      const file = value(createSyntheticLoopBackup([stranded, legacyPending]));
      expect(file.excludedPending).toBe(2);
      const [star, triangle] = value(
        readSyntheticLoopBackup(file.text),
      ).profiles;
      expect(star && portableOracle(star)).toBe(portableOracle(world.star));
      expect(triangle && portableOracle(triangle)).toBe(portableOracle(legacy));
      expect(triangle?.schema).toBe('phase3c-synthetic-loop-v1');
      expect(triangle?.completedCount).toBe(legacy.completedCount);
      expect(file.text).not.toContain(answerOperation(99));
    });

    it('refuses evidence IDs that are not the app-created synthetic shape', async () => {
      const world = await loadWorld();
      const text = value(
        createSyntheticLoopBackup([world.star, world.triangle]),
      ).text;
      for (const edit of [
        (profiles: Record<string, unknown>[]) => {
          const events = (
            profiles[0] as { events: { input?: { id: string } }[] }
          ).events;
          const observation = events.find((event) => event.input);
          if (observation?.input) observation.input.id = 'SYNTHETIC-Alice-2026';
        },
        (profiles: Record<string, unknown>[]) => {
          const events = (profiles[0] as { chapterEvents: { id: string }[] })
            .chapterEvents;
          if (events[0]) events[0].id = 'SYNTHETIC-synthetic-remember-me';
        },
      ])
        expect(
          code(
            rewrite(text, (data) =>
              edit(data.profiles as Record<string, unknown>[]),
            ),
          ),
        ).toBe('invalid_contents');
    });
  },
);
