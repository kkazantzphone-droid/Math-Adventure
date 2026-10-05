import { describe, expect, it } from 'vitest';
import {
  operationId,
  recordId,
  revision,
  storageEpoch,
} from '../../src/application/core/integrity';
import type {
  RecordId,
  Revision,
  StorageEpoch,
} from '../../src/application/core/integrity';
import type { ApplicationResult } from '../../src/application/core/result';
import { COMMAND_VERSION } from '../../src/application/ports/repository';
import type {
  AtomicRecordRepository,
  RecordCodec,
  RecordSnapshot,
  RepositoryCommand,
} from '../../src/application/ports/repository';

export function value<T>(result: ApplicationResult<T>): T {
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

export const profileA = value(recordId('synthetic-player-001'));
export const profileB = value(recordId('synthetic-player-002'));

export function command<T>(
  codec: RecordCodec<T>,
  kind: 'create' | 'update' | 'delete',
  op: string,
  id: RecordId,
  epoch: StorageEpoch,
  rev: Revision,
  payload: T,
): RepositoryCommand<T> {
  const common = {
    version: COMMAND_VERSION,
    recordSchema: codec.schema,
    operationId: value(operationId(op)),
    storageEpoch: epoch,
    recordId: id,
  } as const;
  return kind === 'create'
    ? { ...common, kind, expectedRevision: null, payload }
    : kind === 'update'
      ? { ...common, kind, expectedRevision: rev, payload }
      : { ...common, kind, expectedRevision: rev };
}

/** Future adapters supply isolated instances and test-only initial-state provisioning.
 * Assertions observe async public behavior only; no Map/private-field knowledge.
 */
export function repositoryConformance<T>(
  name: string,
  create: (initial?: {
    readonly epoch: StorageEpoch;
    readonly records: readonly RecordSnapshot<T>[];
  }) => Promise<AtomicRecordRepository<T>>,
  codec: RecordCodec<T>,
  payload: (variant: number) => T,
  mutateNestedPayload: (input: T) => void,
): void {
  describe(`${name} atomic repository conformance`, () => {
    const zero = value(revision(0));
    const one = value(revision(1));
    async function setup(): Promise<AtomicRecordRepository<T>> {
      const repo = await create();
      const epoch = value(await repo.getEpoch());
      value(
        await repo.execute(
          command(
            codec,
            'create',
            'synthetic-create-a',
            profileA,
            epoch,
            zero,
            payload(0),
          ),
        ),
      );
      value(
        await repo.execute(
          command(
            codec,
            'create',
            'synthetic-create-b',
            profileB,
            epoch,
            zero,
            payload(1),
          ),
        ),
      );
      return repo;
    }
    async function observable(
      repo: AtomicRecordRepository<T>,
    ): Promise<unknown> {
      return {
        epoch: await repo.getEpoch(),
        a: await repo.load(profileA),
        b: await repo.load(profileB),
      };
    }
    async function unchanged(
      repo: AtomicRecordRepository<T>,
      cmd: RepositoryCommand<T>,
      code: string,
    ): Promise<void> {
      const before = await observable(repo);
      expect(await repo.execute(cmd)).toEqual({ ok: false, error: { code } });
      expect(await observable(repo)).toEqual(before);
    }

    it('creates explicitly, loads and increments one local revision without changing another profile', async () => {
      const repo = await setup();
      const a = value(await repo.load(profileA));
      const b = await repo.load(profileB);
      expect(a.revision).toBe(1);
      const result = value(
        await repo.execute(
          command(
            codec,
            'update',
            'synthetic-update-a',
            profileA,
            a.storageEpoch,
            a.revision,
            payload(2),
          ),
        ),
      );
      expect(result.revision).toBe(2);
      expect(value(await repo.load(profileA)).payload).toEqual(payload(2));
      expect(await repo.load(profileB)).toEqual(b);
    });

    it('returns original create/update receipts after lost responses and later writes', async () => {
      const repo = await create();
      const epoch = value(await repo.getEpoch());
      const c = command(
        codec,
        'create',
        'synthetic-create-a',
        profileA,
        epoch,
        zero,
        payload(0),
      );
      const first = await repo.execute(c);
      expect(await repo.execute(c)).toEqual(first);
      const update = command(
        codec,
        'update',
        'synthetic-update-a',
        profileA,
        epoch,
        one,
        payload(1),
      );
      const receipt = await repo.execute(update);
      const rev2 = value(revision(2));
      value(
        await repo.execute(
          command(
            codec,
            'update',
            'synthetic-later-a',
            profileA,
            epoch,
            rev2,
            payload(2),
          ),
        ),
      );
      const before = await observable(repo);
      expect(await repo.execute(update)).toEqual(receipt);
      expect(await repo.execute(c)).toEqual(first);
      expect(await observable(repo)).toEqual(before);
    });

    it('two overlapping clients cannot overwrite a loaded revision', async () => {
      const repo = await setup();
      const a = value(await repo.load(profileA));
      const commands = ['synthetic-client-a', 'synthetic-client-b'].map(
        (op, i) =>
          command(
            codec,
            'update',
            op,
            profileA,
            a.storageEpoch,
            a.revision,
            payload(i + 1),
          ),
      );
      const results = await Promise.all(
        commands.map((cmd) => repo.execute(cmd)),
      );
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.find((result) => !result.ok)).toEqual({
        ok: false,
        error: { code: 'revision_conflict' },
      });
      const winner = results.findIndex((result) => result.ok);
      const loser = results.findIndex((result) => !result.ok);
      expect(value(await repo.load(profileA))).toEqual({
        ...a,
        revision: 2,
        payload: payload(winner + 1),
      });
      await unchanged(
        repo,
        commands[loser] as RepositoryCommand<T>,
        'revision_conflict',
      );
    });

    it('rejects different command reuse globally, including another profile', async () => {
      const repo = await setup();
      const a = value(await repo.load(profileA));
      const original = command(
        codec,
        'update',
        'synthetic-operation-007',
        profileA,
        a.storageEpoch,
        a.revision,
        payload(1),
      );
      value(await repo.execute(original));
      await unchanged(
        repo,
        { ...original, payload: payload(2) } as RepositoryCommand<T>,
        'operation_conflict',
      );
      await unchanged(
        repo,
        { ...original, recordId: profileB },
        'operation_conflict',
      );
    });

    it('rejects existing create and missing update/delete without reserving failed operation IDs', async () => {
      const repo = await setup();
      const a = value(await repo.load(profileA));
      await unchanged(
        repo,
        command(
          codec,
          'create',
          'synthetic-failed-create',
          profileA,
          a.storageEpoch,
          zero,
          payload(0),
        ),
        'record_already_exists',
      );
      const missing = value(recordId('synthetic-player-new'));
      const failed = command(
        codec,
        'update',
        'synthetic-failed-update',
        missing,
        a.storageEpoch,
        one,
        payload(0),
      );
      await unchanged(repo, failed, 'record_not_found');
      await unchanged(
        repo,
        command(
          codec,
          'delete',
          'synthetic-missing-delete',
          missing,
          a.storageEpoch,
          one,
          payload(0),
        ),
        'record_not_found',
      );
      // A failed operation creates no receipt: corrected new command may succeed.
      value(
        await repo.execute(
          command(
            codec,
            'create',
            'synthetic-failed-update',
            missing,
            a.storageEpoch,
            zero,
            payload(0),
          ),
        ),
      );
    });

    it('delete fences all old sessions, preserves survivor and forbids stale resurrection/dedup', async () => {
      const repo = await setup();
      const a = value(await repo.load(profileA));
      const b = value(await repo.load(profileB));
      const oldCreate = command(
        codec,
        'create',
        'synthetic-create-a',
        profileA,
        a.storageEpoch,
        zero,
        payload(0),
      );
      const pendingB = command(
        codec,
        'update',
        'synthetic-pending-b',
        profileB,
        b.storageEpoch,
        b.revision,
        payload(2),
      );
      const deletion = command(
        codec,
        'delete',
        'synthetic-delete-a',
        profileA,
        a.storageEpoch,
        a.revision,
        payload(0),
      );
      const receipt = value(await repo.execute(deletion));
      expect(receipt.storageEpoch).toBe(a.storageEpoch + 1);
      expect(receipt.revision).toBe(a.revision + 1);
      expect(await repo.load(profileA)).toEqual({
        ok: false,
        error: { code: 'record_not_found' },
      });
      const survivor = value(await repo.load(profileB));
      expect(survivor).toEqual({ ...b, storageEpoch: receipt.storageEpoch });
      await unchanged(repo, pendingB, 'epoch_conflict');
      await unchanged(repo, oldCreate, 'epoch_conflict');
      await unchanged(repo, deletion, 'epoch_conflict');
      await unchanged(
        repo,
        command(
          codec,
          'update',
          'synthetic-stale-a',
          profileA,
          a.storageEpoch,
          a.revision,
          payload(1),
        ),
        'epoch_conflict',
      );
      await unchanged(
        repo,
        command(
          codec,
          'update',
          'synthetic-fresh-missing',
          profileA,
          receipt.storageEpoch,
          a.revision,
          payload(1),
        ),
        'record_not_found',
      );
      value(
        await repo.execute({
          ...pendingB,
          storageEpoch: survivor.storageEpoch,
        }),
      );
      const fresh = value(recordId('synthetic-player-fresh'));
      value(
        await repo.execute(
          command(
            codec,
            'create',
            'synthetic-create-fresh',
            fresh,
            survivor.storageEpoch,
            zero,
            payload(0),
          ),
        ),
      );
    });

    it('cannot mutate state through caller payload, submitted command, returned receipt or load aliases', async () => {
      const repo = await create();
      const epoch = value(await repo.getEpoch());
      const cmd = command(
        codec,
        'create',
        'synthetic-alias',
        profileA,
        epoch,
        zero,
        payload(0),
      );
      const pending = repo.execute(cmd);
      const originalPayload = cmd.kind === 'delete' ? undefined : cmd.payload;
      Object.assign(cmd, { payload: payload(2), recordId: profileB });
      const receipt = value(await pending);
      Object.assign(originalPayload as object, { marker: 'changed-input' });
      if (originalPayload !== undefined) mutateNestedPayload(originalPayload);
      Object.assign(receipt, { revision: 999 });
      const snapshot = value(await repo.load(profileA));
      Object.assign(snapshot.payload as object, { marker: 'changed' });
      mutateNestedPayload(snapshot.payload);
      Object.assign(snapshot, { revision: 999 });
      expect(value(await repo.load(profileA))).toEqual({
        recordId: profileA,
        revision: 1,
        storageEpoch: epoch,
        payload: payload(0),
      });
    });

    it('preflights revision overflow for both update and delete without consuming operation ID', async () => {
      const epoch = value(storageEpoch(0));
      const max = value(revision(Number.MAX_SAFE_INTEGER));
      const repo = await create({
        epoch,
        records: [
          {
            recordId: profileA,
            storageEpoch: epoch,
            revision: max,
            payload: payload(0),
          },
        ],
      });
      await unchanged(
        repo,
        command(
          codec,
          'update',
          'synthetic-overflow',
          profileA,
          epoch,
          max,
          payload(1),
        ),
        'revision_overflow',
      );
      await unchanged(
        repo,
        command(
          codec,
          'delete',
          'synthetic-overflow',
          profileA,
          epoch,
          max,
          payload(0),
        ),
        'revision_overflow',
      );
    });

    it('preflights epoch overflow before destructive change and allows ordinary writes', async () => {
      const epoch = value(storageEpoch(Number.MAX_SAFE_INTEGER));
      const repo = await create({
        epoch,
        records: [
          {
            recordId: profileA,
            storageEpoch: epoch,
            revision: one,
            payload: payload(0),
          },
        ],
      });
      await unchanged(
        repo,
        command(
          codec,
          'delete',
          'synthetic-epoch-overflow',
          profileA,
          epoch,
          one,
          payload(0),
        ),
        'epoch_overflow',
      );
      value(
        await repo.execute(
          command(
            codec,
            'update',
            'synthetic-epoch-overflow',
            profileA,
            epoch,
            one,
            payload(1),
          ),
        ),
      );
    });
  });
}
