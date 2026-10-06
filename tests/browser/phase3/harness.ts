// A separate, explicitly built developer entry. No normal composition imports it.
import type {
  RecordId,
  StorageEpoch,
} from '../../../src/application/core/integrity';
import {
  storageEpoch,
  operationId,
  recordId,
} from '../../../src/application/core/integrity';
import type { ApplicationResult } from '../../../src/application/core/result';
import type {
  RecordSnapshot,
  RepositoryCommand,
} from '../../../src/application/ports/repository';
import { createIndexedDbRepository } from '../../../src/infrastructure/persistence/adapter';
import { readyControl } from '../../../src/infrastructure/persistence/layout';
import {
  openSyntheticDatabase,
  migrateSyntheticDatabase,
  finalizeSyntheticRecovery,
  cancelPreparedMigration,
  fullClearSyntheticDatabase,
} from '../../../src/infrastructure/persistence/maintenance';
import {
  syntheticLearnerCodec,
  syntheticLearnerRecord,
} from '../../fixtures/synthetic/learner-record';
import { canonicalize } from '../../../src/domain/replay/canonical';
import {
  snapshotFromData,
  commandFromData,
} from '../../../src/application/repository/validation';
import type { SyntheticLearnerRecord } from '../../fixtures/synthetic/learner-record';
import { syntheticMigrationSource } from '../../fixtures/phase-3-readiness/migration-plans';

declare const __PHASE3_SYNTHETIC_CAPABILITY__: boolean;
const capable =
  typeof __PHASE3_SYNTHETIC_CAPABILITY__ !== 'undefined' &&
  __PHASE3_SYNTHETIC_CAPABILITY__ &&
  location.protocol === 'http:' &&
  location.hostname === '127.0.0.1' &&
  location.port !== '';
const names = /^math-adventure\.synthetic\.phase3\.[a-z0-9-]{1,64}$/;
const handles = new Map<
  string,
  ReturnType<
    typeof createIndexedDbRepository<SyntheticLearnerRecord>
  > extends ApplicationResult<infer H>
    ? H
    : never
>();
const databases = new Map<string, IDBDatabase>();
let fault: 'abort' | 'quota' | 'write' | undefined;
let blocked = false;
let cancellation: (() => void) | undefined;
let frozen = false;
let prepared: RepositoryCommand<SyntheticLearnerRecord> | undefined;
const profileIds = new Set([
  'synthetic-player-001',
  'synthetic-player-002',
  'synthetic-player-new',
  'synthetic-player-fresh',
  'synthetic-migration-profile-a',
  'synthetic-migration-profile-b',
]);
const payloads = new Set(
  [0, 1, 2].map((i) => JSON.stringify(syntheticLearnerRecord(i))),
);
function fixtureCommand(
  command: RepositoryCommand<SyntheticLearnerRecord>,
): boolean {
  if (!profileIds.has(command.recordId)) return false;
  if (command.kind === 'delete') return true;
  // Compare exact canonical fixture spellings; no arbitrary learner free text.
  const candidate = canonicalize(command.payload);
  return (
    candidate.ok &&
    [...payloads].some((text) => {
      const value = canonicalize(JSON.parse(text) as unknown);
      return value.ok && value.value === candidate.value;
    })
  );
}
const status = document.getElementById('status');
function show(text: string): void {
  if (status) status.textContent = text;
}
function checkedEpoch(input: number): StorageEpoch {
  const epoch = storageEpoch(input);
  if (!epoch.ok) throw new Error('Synthetic epoch invalid');
  return epoch.value;
}
function get(id: string) {
  const handle = handles.get(id);
  if (!handle) throw new Error('Synthetic handle unavailable');
  return handle;
}
function db(id: string): IDBDatabase {
  const database = databases.get(id);
  if (!database) throw new Error('Synthetic database unavailable');
  return database;
}
function attach(
  id: string,
  database: IDBDatabase,
  capacity: number,
): ApplicationResult<void> {
  const result = createIndexedDbRepository(database, syntheticLearnerCodec, {
    receiptCapacity: capacity,
    fault: () => fault,
  });
  if (!result.ok) return result;
  databases.set(id, database);
  handles.set(id, result.value);
  show('SYNTHETIC ONLY — ready; no write pending');
  return { ok: true, value: undefined };
}
async function provision(
  database: IDBDatabase,
  initial: {
    epoch: StorageEpoch;
    records: readonly RecordSnapshot<SyntheticLearnerRecord>[];
  },
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(['metadata', 'records'], 'readwrite');
    tx.objectStore('metadata').put(
      readyControl(database.version === 1 ? 1 : 2, initial.epoch),
      'control',
    );
    for (const row of initial.records)
      tx.objectStore('records').add({
        recordId: row.recordId,
        revision: row.revision,
        payload: row.payload,
      });
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(new Error('Synthetic provisioning failed'));
  });
}
export const harness = {
  async open(
    id: string,
    name: string,
    bootstrap = true,
    version: 1 | 2 = 1,
    capacity = 1000,
    initial?: {
      epoch: StorageEpoch;
      records: readonly RecordSnapshot<SyntheticLearnerRecord>[];
    },
  ) {
    if (!capable || !names.test(name))
      return { ok: false, error: { code: 'storage_unavailable' } } as const;
    if (
      initial &&
      ((initial.epoch !== 0 && initial.epoch !== Number.MAX_SAFE_INTEGER) ||
        initial.records.length > 2 ||
        initial.records.some((row) => {
          const parsed = snapshotFromData(row, syntheticLearnerCodec);
          return (
            !parsed.ok ||
            parsed.value.storageEpoch !== initial.epoch ||
            (parsed.value.revision !== 1 &&
              parsed.value.revision !== Number.MAX_SAFE_INTEGER) ||
            !fixtureCommand({
              version: 'atomic-command-v1',
              recordSchema: syntheticLearnerCodec.schema,
              operationId:
                'synthetic-provision' as RepositoryCommand<SyntheticLearnerRecord>['operationId'],
              kind: 'create',
              recordId: parsed.value.recordId,
              storageEpoch: initial.epoch,
              expectedRevision: null,
              payload: parsed.value.payload,
            })
          );
        }))
    )
      return { ok: false, error: { code: 'invalid_record' } } as const;
    const opened = await openSyntheticDatabase({
      dbName: name,
      version,
      bootstrap,
      codec: syntheticLearnerCodec,
    });
    if (!opened.ok) {
      show('UNSAVED — storage unavailable; no automatic writes');
      return opened;
    }
    if (initial) await provision(opened.value, initial);
    return attach(id, opened.value, capacity);
  },
  epoch(id: string) {
    return get(id).repository.getEpoch();
  },
  load(id: string, recordId: RecordId) {
    return get(id).repository.load(recordId);
  },
  execute(id: string, command: RepositoryCommand<SyntheticLearnerRecord>) {
    if (frozen || !fixtureCommand(command))
      return Promise.resolve({
        ok: false,
        error: { code: 'storage_unavailable' },
      } as const);
    return get(id).repository.execute(command);
  },
  prepare(command: RepositoryCommand<SyntheticLearnerRecord>) {
    if (!fixtureCommand(command))
      return { ok: false, error: { code: 'invalid_record' } } as const;
    const parsed = commandFromData(command, syntheticLearnerCodec);
    if (parsed.ok) prepared = parsed.value;
    return parsed.ok ? ({ ok: true, value: undefined } as const) : parsed;
  },
  releasePrepared(id: string) {
    const command = prepared;
    prepared = undefined;
    return command
      ? get(id).repository.execute(command)
      : Promise.resolve({
          ok: false,
          error: { code: 'invalid_command' },
        } as const);
  },
  async loseResponse(
    id: string,
    command: RepositoryCommand<SyntheticLearnerRecord>,
  ) {
    if (!fixtureCommand(command)) return false;
    const committed = await get(id).repository.execute(command);
    return committed.ok; // Deliberately withhold its receipt, after native completion.
  },
  async detachment(id: string) {
    const op = operationId('synthetic-direct-alias');
    const a = recordId('synthetic-player-001');
    const b = recordId('synthetic-player-002');
    if (!op.ok || !a.ok || !b.ok)
      throw new Error('Synthetic constants invalid');
    const payload = syntheticLearnerRecord(0);
    const expected = structuredClone(payload);
    const command: RepositoryCommand<SyntheticLearnerRecord> = {
      version: 'atomic-command-v1',
      recordSchema: syntheticLearnerCodec.schema,
      operationId: op.value,
      recordId: a.value,
      storageEpoch: checkedEpoch(0),
      kind: 'create',
      expectedRevision: null,
      payload,
    };
    const pending = get(id).repository.execute(command);
    const retryCommand = structuredClone(command);
    Object.assign(command, { recordId: b.value });
    const evidence = payload.assessments[0]?.evidence;
    if (evidence) Object.assign(evidence, { mode: 'changed' });
    const receipt = await pending;
    if (!receipt.ok) return receipt;
    Object.assign(receipt.value, { revision: 999 });
    const loaded = await get(id).repository.load(a.value);
    if (!loaded.ok) return loaded;
    Object.assign(loaded.value, { revision: 999 });
    const nested = loaded.value.payload.assessments[0]?.evidence;
    if (nested) Object.assign(nested, { mode: 'changed' });
    return {
      expected,
      snapshot: await get(id).repository.load(a.value),
      retry: await get(id).repository.execute(retryCommand),
    };
  },
  freeze() {
    frozen = true;
  },
  thaw() {
    frozen = false;
  },
  close(id: string) {
    get(id).close();
  },
  setFault(value: typeof fault) {
    fault = value;
  },
  async clear(id: string, acknowledged: boolean, cleanup: boolean) {
    return fullClearSyntheticDatabase(db(id), syntheticLearnerCodec, {
      quiesce: () => Promise.resolve(acknowledged && frozen),
      wipeMemory: () => {
        show('UNSAVED — memory cleared');
      },
      cleanupCaches: async () => {
        if (!cleanup) throw new Error('Synthetic cleanup failure');
        await caches.delete('math-adventure.synthetic.phase3.shell');
        return !(await caches.keys()).includes(
          'math-adventure.synthetic.phase3.shell',
        );
      },
    });
  },
  async seedMigration(id: string) {
    const database = db(id);
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(
        ['metadata', 'records', 'receipts'],
        'readwrite',
      );
      tx.objectStore('metadata').put(
        readyControl(
          1,
          checkedEpoch(syntheticMigrationSource.metadata.storageEpoch),
        ),
        'control',
      );
      for (const row of syntheticMigrationSource.records)
        tx.objectStore('records').put(row);
      for (const row of syntheticMigrationSource.receipts)
        tx.objectStore('receipts').put(row);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(new Error('Synthetic fixture failure'));
    });
  },
  async migrate(
    id: string,
    failure?:
      | 'checkpoint_abort'
      | 'upgrade_abort'
      | 'interrupt_prepared'
      | 'interrupt_unverified',
  ) {
    blocked = false;
    const options = {
      database: db(id),
      codec: syntheticLearnerCodec,
      quiesce: () => Promise.resolve(true),
      onBlocked: () => {
        blocked = true;
      },
    };
    const migration = migrateSyntheticDatabase(
      failure ? { ...options, fault: failure } : options,
    );
    cancellation = migration.cancel;
    const result = await migration.result;
    if (!result.ok) return result;
    return attach(id, result.value, 1000);
  },
  async cancelFinalization(id: string) {
    const original = Object.getOwnPropertyDescriptor(
      IDBDatabase.prototype,
      'transaction',
    )?.value as IDBDatabase['transaction'];
    IDBDatabase.prototype.transaction = function (...args) {
      const tx = original.apply(this, args);
      if (this.version === 2 && args[1] === 'readwrite') cancellation?.();
      return tx;
    };
    try {
      return await harness.migrate(id);
    } finally {
      IDBDatabase.prototype.transaction = original;
    }
  },
  isBlocked() {
    return blocked;
  },
  cancelMigration() {
    cancellation?.();
  },
  finalize(id: string) {
    return finalizeSyntheticRecovery(db(id), syntheticLearnerCodec);
  },
  cancelPrepared(id: string) {
    return cancelPreparedMigration(db(id), syntheticLearnerCodec);
  },
  async inventory(id: string) {
    const database = db(id);
    return new Promise<unknown>((resolve, reject) => {
      const tx = database.transaction([
        'metadata',
        'records',
        'receipts',
        'migrationStaging',
      ]);
      const results: Record<string, unknown> = { version: database.version };
      for (const store of [
        'metadata',
        'records',
        'receipts',
        'migrationStaging',
      ]) {
        const request = tx.objectStore(store).getAll();
        request.onsuccess = () => {
          results[store] = request.result as unknown;
        };
      }
      tx.oncomplete = () => resolve(results);
      tx.onabort = () => reject(new Error('Synthetic read failure'));
    });
  },
  async seedCaches() {
    for (const name of [
      'math-adventure.synthetic.phase3.shell',
      'synthetic-unrelated-app',
    ]) {
      const cache = await caches.open(name);
      await cache.put(
        '/synthetic-cache-fixture',
        new Response('synthetic-only'),
      );
    }
  },
  cacheNames() {
    return caches.keys();
  },
  async corrupt(
    id: string,
    fixture:
      | 'future-control'
      | 'extra-metadata'
      | 'orphan-checkpoint'
      | 'revision'
      | 'incompatible-payload',
  ) {
    const database = db(id);
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(
        ['metadata', 'migrationStaging', 'records'],
        'readwrite',
      );
      const store = tx.objectStore('metadata');
      if (fixture === 'future-control') {
        const r = store.get('control');
        r.onsuccess = () =>
          store.put({ ...r.result, schemaVersion: 99 }, 'control');
      } else if (fixture === 'extra-metadata')
        store.put({ marker: 'synthetic-only' }, 'synthetic-extra');
      else if (fixture === 'orphan-checkpoint')
        tx.objectStore('migrationStaging').put(
          { marker: 'synthetic-only' },
          'checkpoint',
        );
      else if (fixture === 'revision') {
        const records = tx.objectStore('records');
        const r = records.get('synthetic-migration-profile-a');
        r.onsuccess = () => records.put({ ...r.result, revision: 99 });
      } else if (fixture === 'incompatible-payload') {
        const records = tx.objectStore('records');
        const r = records.get('synthetic-migration-profile-a');
        r.onsuccess = () =>
          records.put({
            ...r.result,
            payload: { marker: 'synthetic-future', assessments: [] },
          });
      } else {
        tx.abort();
        return;
      }
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(new Error('Synthetic fixture failure'));
    });
  },
  async hold(name: string) {
    if (!names.test(name)) throw new Error('Synthetic name required');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(name, 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(new Error('Synthetic hold failure'));
    });
    databases.set('blocker', database); // Deliberately no versionchange close, real blocked-upgrade probe.
  },
  release() {
    databases.get('blocker')?.close();
  },
  async future(name: string) {
    if (!names.test(name)) throw new Error('Synthetic name required');
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open(name, 3);
      r.onsuccess = () => {
        r.result.close();
        resolve();
      };
      r.onerror = () => reject(new Error('Synthetic future fixture failure'));
    });
  },
};
export type Phase3Harness = typeof harness;
declare global {
  interface Window {
    phase3: Phase3Harness;
  }
}
if (capable) {
  window.phase3 = harness;
  show('SYNTHETIC ONLY — capability active; no database opened');
}
document.getElementById('memory')?.addEventListener('click', () => {
  show('UNSAVED — bounded memory-only mode; no automatic write queue');
});
