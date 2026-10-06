// Actual browser suite, separately invoked. No fake IndexedDB implementation.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright-core';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import { build } from 'vite';
import { createServer } from 'node:http';
import type { RequestListener } from 'node:http';
import {
  readFile,
  readdir,
  mkdir,
  mkdtemp,
  writeFile,
  rm,
} from 'node:fs/promises';
import {
  resolve,
  extname,
  relative as pathRelative,
  isAbsolute,
  sep,
} from 'node:path';
import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { ApplicationResult } from '../../src/application/core/result';
import type { AtomicRecordRepository } from '../../src/application/ports/repository';
import {
  recordId,
  revision,
  storageEpoch,
} from '../../src/application/core/integrity';
import {
  repositoryConformance,
  command,
  value,
  profileA,
  profileB,
} from '../conformance/repository';
import {
  syntheticLearnerCodec,
  syntheticLearnerRecord,
} from '../fixtures/synthetic/learner-record';
import type { SyntheticLearnerRecord } from '../fixtures/synthetic/learner-record';
import { syntheticMigrationExpected } from '../fixtures/phase-3-readiness/migration-plans';
import { RepositoryReferenceModel } from '../oracle/repository-model';
import type { ModelCommand } from '../oracle/repository-model';
import fc from 'fast-check';

let browser: Browser;
let context: BrowserContext;
let origin: string;
let childOrigin: string;
let offOrigin: string;
let serial = 0;
let profileDirectory: string;
let failures = 0;
let testsObserved = 0;
const channel = process.env.PHASE3_BROWSER ?? 'chrome';
function serve(directory: string): RequestListener {
  return (request, response) => {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const relative = path.slice(1) || 'index.html';
    if (relative.includes('..') || relative.includes('\\')) {
      response.writeHead(400).end();
      return;
    }
    const target = resolve(directory, relative);
    const within = pathRelative(directory, target);
    if (within.startsWith('..') || isAbsolute(within)) {
      response.writeHead(400).end();
      return;
    }
    void readFile(target)
      .then((bytes) => {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader(
          'Content-Type',
          (
            {
              '.html': 'text/html',
              '.js': 'text/javascript',
              '.css': 'text/css',
              '.json': 'application/json',
            } as Record<string, string>
          )[extname(relative)] ?? 'application/octet-stream',
        );
        response.end(bytes);
      })
      .catch(() => response.writeHead(404).end());
  };
}
const server = createServer(serve(resolve('.cache/phase3-browser/site')));
const childServer = createServer(serve(resolve('dist')));
const offServer = createServer(
  serve(resolve('.cache/phase3-browser/capability-off')),
);
const evidence: Record<string, unknown> = {
  channel,
  cases: [],
  result: 'PENDING',
};
const proofSources = [
  'src/infrastructure/persistence/adapter.ts',
  'src/infrastructure/persistence/layout.ts',
  'src/infrastructure/persistence/maintenance.ts',
  'tests/integration/phase3-persistence.test.ts',
  'tests/browser/phase3/harness.ts',
];
const startingHashes: Record<string, string> = {};
async function shellInventory(
  directory = resolve('.cache/phase3-browser/site'),
): Promise<{ path: string; bytes: number; sha256: string }[]> {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await shellInventory(file)));
    else {
      expect(entry.isFile()).toBe(true);
      const bytes = await readFile(file);
      files.push({
        path: pathRelative(
          resolve('.cache/phase3-browser/site'),
          file,
        ).replaceAll('\\', '/'),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}
beforeAll(async () => {
  expect(['chrome', 'msedge']).toContain(channel);
  await mkdir(resolve('.cache/phase3-browser'), { recursive: true });
  await writeFile(
    resolve(`.cache/phase3-browser/${channel}-evidence.json`),
    JSON.stringify(evidence),
  );
  await build({ configFile: 'vite.persistence.config.ts' });
  for (const file of proofSources)
    startingHashes[file] = createHash('sha256')
      .update(await readFile(file))
      .digest('hex');
  await build({
    configFile: 'vite.persistence.config.ts',
    define: { __PHASE3_SYNTHETIC_CAPABILITY__: 'false' },
    build: { outDir: resolve('.cache/phase3-browser/capability-off') },
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  await new Promise<void>((resolve) =>
    childServer.listen(0, '127.0.0.1', resolve),
  );
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  await new Promise<void>((resolve) =>
    offServer.listen(0, '127.0.0.1', resolve),
  );
  offOrigin = `http://127.0.0.1:${(offServer.address() as AddressInfo).port}`;
  childOrigin = `http://127.0.0.1:${(childServer.address() as AddressInfo).port}`;
  expect(childOrigin).not.toBe(origin);
  profileDirectory = await mkdtemp(
    resolve('.cache/phase3-browser/synthetic-profile-'),
  );
  await launch();
  evidence.browserVersion = browser.version();
  evidence.origin = 'isolated ephemeral loopback port';
});
async function launch(): Promise<void> {
  context = await chromium.launchPersistentContext(profileDirectory, {
    channel,
    headless: true,
    timeout: 15000,
    acceptDownloads: false,
    serviceWorkers: 'block',
  });
  const launched = context.browser();
  if (!launched) throw new Error('Browser unavailable');
  browser = launched;
}
afterEach((task) => {
  testsObserved++;
  if (task.task.result?.state !== 'pass') failures++;
});
afterAll(async () => {
  await context?.close();
  await browser?.close();
  if (profileDirectory) {
    const parent = resolve('.cache/phase3-browser');
    const target = resolve(profileDirectory);
    if (!target.startsWith(`${parent}${sep}synthetic-profile-`))
      throw new Error('Profile cleanup containment failed');
    await rm(target, { recursive: true, force: true });
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await new Promise<void>((resolve) => childServer.close(() => resolve()));
  await new Promise<void>((resolve) => offServer.close(() => resolve()));
  await mkdir(resolve('.cache/phase3-browser'), { recursive: true });
  evidence.result =
    failures === 0 && testsObserved >= 35 && evidence.browserVersion
      ? 'PASS'
      : 'FAIL';
  evidence.testsObserved = testsObserved;
  evidence.failures = failures;
  evidence.sourceHashes = {};
  for (const file of proofSources) {
    (evidence.sourceHashes as Record<string, string>)[file] = createHash(
      'sha256',
    )
      .update(await readFile(file))
      .digest('hex');
    if (
      (evidence.sourceHashes as Record<string, string>)[file] !==
      startingHashes[file]
    )
      evidence.result = 'FAIL';
  }
  evidence.shellAssets = await shellInventory();
  await writeFile(
    resolve(`.cache/phase3-browser/${channel}-evidence.json`),
    JSON.stringify(evidence, null, 2),
  );
});
async function page(): Promise<Page> {
  const p = await context.newPage();
  await p.goto(origin);
  await p.waitForFunction(() => !!window.phase3);
  return p;
}
function name(): string {
  return `math-adventure.synthetic.phase3.test-${++serial}`;
}
function bridge(
  p: Page,
  id = 'a',
): AtomicRecordRepository<SyntheticLearnerRecord> {
  return {
    getEpoch: () => p.evaluate((id) => window.phase3.epoch(id), id),
    load: (recordId) =>
      p.evaluate(({ id, recordId }) => window.phase3.load(id, recordId), {
        id,
        recordId,
      }),
    execute: (command) => {
      // Transport owns a detached message before its asynchronous delivery.
      const detached = structuredClone(command);
      return p.evaluate(
        ({ id, command }) => window.phase3.execute(id, command),
        { id, command: detached },
      );
    },
  };
}
async function setup(capacity = 1000) {
  const a = await page();
  const dbName = name();
  expect(
    await a.evaluate(
      ({ dbName, capacity }) =>
        window.phase3.open('a', dbName, true, 1, capacity),
      { dbName, capacity },
    ),
  ).toEqual({ ok: true, value: undefined });
  return { a, dbName, repo: bridge(a) };
}
function check(code: string): ApplicationResult<never> {
  return { ok: false, error: { code } } as ApplicationResult<never>;
}
const zero = value(revision(0));
const one = value(revision(1));
function create(
  op = 'synthetic-create-a',
  id = profileA,
  epoch = value(storageEpoch(0)),
) {
  return command(
    syntheticLearnerCodec,
    'create',
    op,
    id,
    epoch,
    zero,
    syntheticLearnerRecord(),
  );
}
repositoryConformance(
  `native ${channel}`,
  async (initial) => {
    const p = await page();
    const dbName = name();
    const result = await p.evaluate(
      ({ dbName, initial }) =>
        window.phase3.open('a', dbName, true, 1, 1000, initial),
      { dbName, initial },
    );
    value(result);
    return bridge(p);
  },
  syntheticLearnerCodec,
  syntheticLearnerRecord,
  (input) => {
    const first = input.assessments[0];
    if (first) Object.assign(first.evidence, { mode: 'changed' });
  },
);

describe('native IndexedDB integration', () => {
  it('matches the independent array and semantic-tuple oracle across fixed generated sequences', async () => {
    const sequences = fc.sample(
      fc.array(
        fc.record({
          kind: fc.constantFrom(
            'create',
            'update',
            'delete',
            'retry',
            'stale',
            'collision',
          ),
          slot: fc.integer({ min: 0, max: 1 }),
          variant: fc.integer({ min: 0, max: 2 }),
        }),
        { minLength: 12, maxLength: 12 },
      ),
      { seed: 20261006, numRuns: 50 },
    );
    let commands = 0;
    for (const actions of sequences) {
      const { a, repo } = await setup();
      const model = new RepositoryReferenceModel();
      const history: ModelCommand[] = [];
      let serial = 0;
      for (const action of actions) {
        const id = action.slot === 0 ? profileA : profileB;
        const current = model.load(id);
        const common = {
          version: 'atomic-command-v1',
          recordSchema: 'synthetic-counter-v1',
          operationId: `synthetic-oracle-${serial++}`,
          storageEpoch:
            action.kind === 'stale'
              ? Math.max(0, model.epoch - 1)
              : model.epoch,
          recordId: id,
        } as const;
        let candidate: ModelCommand;
        if (action.kind === 'retry' && history.length)
          candidate = history[history.length - 1] as ModelCommand;
        else if (action.kind === 'collision' && history.length)
          candidate = { ...(history[0] as ModelCommand), recordId: id };
        else if (action.kind === 'delete')
          candidate = {
            ...common,
            kind: 'delete',
            expectedRevision: current?.revision ?? 1,
          };
        else if (action.kind === 'create' || !current)
          candidate = {
            ...common,
            kind: 'create',
            expectedRevision: null,
            payload: {
              schema: 'synthetic-counter-v1',
              synthetic: true,
              value: action.variant,
            },
          };
        else
          candidate = {
            ...common,
            kind: 'update',
            expectedRevision:
              action.kind === 'stale'
                ? Math.max(0, current.revision - 1)
                : current.revision,
            payload: {
              schema: 'synthetic-counter-v1',
              synthetic: true,
              value: action.variant,
            },
          };
        const actual = command(
          syntheticLearnerCodec,
          candidate.kind,
          candidate.operationId,
          id,
          value(storageEpoch(candidate.storageEpoch)),
          value(revision(candidate.expectedRevision ?? 0)),
          syntheticLearnerRecord(
            candidate.kind === 'delete' ? 0 : candidate.payload.value,
          ),
        );
        // Retry uses its original ID too; the reference identity has no production canonicalizer.
        const delivered = {
          ...actual,
          recordId: value(recordId(candidate.recordId)),
        };
        expect(await repo.execute(delivered)).toEqual(model.execute(candidate));
        commands++;
        history.push(candidate);
        expect(value(await repo.getEpoch())).toBe(model.epoch);
        for (const recordId of [profileA, profileB]) {
          const expected = model.load(recordId);
          expect(await repo.load(recordId)).toEqual(
            expected
              ? {
                  ok: true,
                  value: {
                    recordId,
                    revision: expected.revision,
                    storageEpoch: model.epoch,
                    payload: syntheticLearnerRecord(expected.payload.value),
                  },
                }
              : check('record_not_found'),
          );
        }
      }
      await a.close();
    }
    expect(commands).toBe(600);
    evidence.oracle = { seed: 20261006, sequences: 50, commands };
  }, 60_000);
  it('commits through independent clients, retries after reopen, and rejects stale tabs after deletion', async () => {
    const { a, dbName, repo } = await setup();
    value(await repo.execute(create()));
    value(await repo.execute(create('synthetic-create-b', profileB)));
    const b = await page();
    value(
      await b.evaluate(
        (dbName) => window.phase3.open('b', dbName, false),
        dbName,
      ),
    );
    const other = bridge(b, 'b');
    const before = value(await repo.load(profileA));
    const commands = ['synthetic-concurrent-a', 'synthetic-concurrent-b'].map(
      (op, i) =>
        command(
          syntheticLearnerCodec,
          'update',
          op,
          profileA,
          before.storageEpoch,
          before.revision,
          syntheticLearnerRecord(i + 1),
        ),
    );
    const firstCommand = commands[0];
    const secondCommand = commands[1];
    if (!firstCommand || !secondCommand)
      throw new Error('Synthetic commands missing');
    const results = await Promise.all([
      repo.execute(firstCommand),
      other.execute(secondCommand),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual(check('revision_conflict'));
    const winner = results.findIndex((r) => r.ok);
    const receipt = results[winner];
    await a.evaluate(() => window.phase3.close('a'));
    value(
      await a.evaluate(
        (dbName) => window.phase3.open('a', dbName, false),
        dbName,
      ),
    );
    const winningCommand = commands[winner];
    if (!winningCommand) throw new Error('Winner missing');
    expect(await repo.execute(winningCommand)).toEqual(receipt);
    const current = value(await repo.load(profileA));
    const pending = command(
      syntheticLearnerCodec,
      'update',
      'synthetic-delayed-b',
      profileB,
      current.storageEpoch,
      one,
      syntheticLearnerRecord(2),
    );
    value(
      await repo.execute(
        command(
          syntheticLearnerCodec,
          'delete',
          'synthetic-delete',
          profileA,
          current.storageEpoch,
          current.revision,
          syntheticLearnerRecord(),
        ),
      ),
    );
    expect(await other.execute(pending)).toEqual(check('epoch_conflict'));
    expect(await other.execute(create())).toEqual(check('epoch_conflict'));
    expect(value(await other.load(profileB)).revision).toBe(1);
    expect(await repo.load(profileA)).toEqual(check('record_not_found'));
    (evidence.cases as string[]).push(
      'two-client-update-reopen-retry-delete-stale-epoch-isolation',
    );
  });
  it('proves same-realm adapter detachment and reconciles a withheld committed response', async () => {
    const { a, repo } = await setup();
    const detached = await a.evaluate(() => window.phase3.detachment('a'));
    expect('expected' in detached).toBe(true);
    if (!('expected' in detached)) throw new Error('Detachment failed');
    expect(detached.snapshot).toEqual({
      ok: true,
      value: {
        recordId: profileA,
        storageEpoch: 0,
        revision: 1,
        payload: detached.expected,
      },
    });
    expect(detached.retry).toEqual({
      ok: true,
      value: {
        version: 'atomic-receipt-v1',
        kind: 'create',
        operationId: 'synthetic-direct-alias',
        recordId: profileA,
        revision: 1,
        storageEpoch: 0,
      },
    });
    const c = create('synthetic-lost-response', profileB);
    expect(await a.evaluate((c) => window.phase3.loseResponse('a', c), c)).toBe(
      true,
    );
    const receipt = value(await repo.execute(c));
    expect(receipt.revision).toBe(1);
    expect(value(await repo.load(profileB)).revision).toBe(1);
    const changed = command(
      syntheticLearnerCodec,
      'delete',
      'synthetic-lost-response',
      profileB,
      value(storageEpoch(0)),
      one,
      syntheticLearnerRecord(),
    );
    expect(await repo.execute(changed)).toEqual(check('operation_conflict'));
    (evidence.cases as string[]).push(
      'native-same-realm-detachment-injected-response-loss',
    );
  });
  it('serializes overlapping delete/write and rejects a prepared command resumed after deletion', async () => {
    const { dbName, repo } = await setup();
    value(await repo.execute(create()));
    value(await repo.execute(create('synthetic-race-b', profileB)));
    const b = await page();
    value(
      await b.evaluate(
        (dbName) => window.phase3.open('b', dbName, false),
        dbName,
      ),
    );
    const other = bridge(b, 'b');
    const pending = command(
      syntheticLearnerCodec,
      'update',
      'synthetic-prepared-b',
      profileB,
      value(storageEpoch(0)),
      one,
      syntheticLearnerRecord(2),
    );
    value(await b.evaluate((c) => window.phase3.prepare(c), pending));
    const update = command(
      syntheticLearnerCodec,
      'update',
      'synthetic-race-update',
      profileA,
      value(storageEpoch(0)),
      one,
      syntheticLearnerRecord(1),
    );
    const remove = command(
      syntheticLearnerCodec,
      'delete',
      'synthetic-race-delete',
      profileA,
      value(storageEpoch(0)),
      one,
      syntheticLearnerRecord(0),
    );
    const results = await Promise.all([
      repo.execute(update),
      other.execute(remove),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    if (results[0]?.ok) {
      expect(results[1]).toEqual(check('revision_conflict'));
      const latest = value(await repo.load(profileA));
      value(
        await other.execute(
          command(
            syntheticLearnerCodec,
            'delete',
            'synthetic-race-delete',
            profileA,
            latest.storageEpoch,
            latest.revision,
            syntheticLearnerRecord(),
          ),
        ),
      );
    } else expect(results[0]).toEqual(check('epoch_conflict'));
    expect(await b.evaluate(() => window.phase3.releasePrepared('b'))).toEqual(
      check('epoch_conflict'),
    );
    expect(value(await repo.load(profileB)).revision).toBe(1);
    (evidence.cases as string[]).push(
      'native-two-client-delete-write-race-delayed-prepared-command',
    );
  });
  it('competing creates and native abort/failure never publish partial state or early saved success', async () => {
    const { a, dbName, repo } = await setup();
    const b = await page();
    value(
      await b.evaluate(
        (dbName) => window.phase3.open('b', dbName, false),
        dbName,
      ),
    );
    const results = await Promise.all([
      repo.execute(create()),
      bridge(b, 'b').execute(create('synthetic-competing')),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual(check('record_already_exists'));
    const before = value(await repo.load(profileA));
    for (const failure of ['abort', 'quota', 'write'] as const) {
      await a.evaluate((f) => window.phase3.setFault(f), failure);
      const update = command(
        syntheticLearnerCodec,
        'update',
        'synthetic-fault',
        profileA,
        before.storageEpoch,
        before.revision,
        syntheticLearnerRecord(2),
      );
      expect(await repo.execute(update)).toEqual(
        check(failure === 'quota' ? 'quota_exceeded' : 'storage_unavailable'),
      );
      await a.evaluate(() => window.phase3.setFault(undefined));
      expect(await repo.load(profileA)).toEqual({ ok: true, value: before });
      const inventory = (await a.evaluate(() =>
        window.phase3.inventory('a'),
      )) as { receipts: unknown[] };
      expect(inventory.receipts).toHaveLength(1);
    }
    (evidence.cases as string[]).push(
      'competing-create-native-abort-injected-quota-native-request-error',
    );
  });
  it('preserves exact retries at capacity and supports checked delete/full clear with separate cleanup pending', async () => {
    const { a, dbName, repo } = await setup(1);
    const original = create();
    const first = value(await repo.execute(original));
    expect(await repo.execute(original)).toEqual({ ok: true, value: first });
    expect(
      await repo.execute(create('synthetic-capacity-b', profileB)),
    ).toEqual(check('storage_unavailable'));
    value(
      await repo.execute(
        command(
          syntheticLearnerCodec,
          'delete',
          'synthetic-capacity-delete',
          profileA,
          first.storageEpoch,
          first.revision,
          syntheticLearnerRecord(),
        ),
      ),
    );
    const epoch = value(await repo.getEpoch());
    value(
      await repo.execute(create('synthetic-after-delete', profileB, epoch)),
    );
    const before = await repo.load(profileB);
    await a.evaluate(() => window.phase3.freeze());
    const refused = await a.evaluate(() =>
      window.phase3.clear('a', false, true),
    );
    expect(refused.database).toEqual(check('storage_unavailable'));
    expect(await repo.load(profileB)).toEqual(before);
    const cleared = await a.evaluate(() =>
      window.phase3.clear('a', true, false),
    );
    expect(cleared.database.ok).toBe(true);
    expect(cleared.caches).toBe('pending');
    await a.evaluate(() => window.phase3.thaw());
    expect(
      await repo.execute(create('synthetic-stale-clear', profileA, epoch)),
    ).toEqual(check('epoch_conflict'));
    await a.evaluate(() => window.phase3.close('a'));
    value(
      await a.evaluate(
        (dbName) => window.phase3.open('a', dbName, false),
        dbName,
      ),
    );
    expect(await repo.load(profileB)).toEqual(check('record_not_found'));
    const inventory = (await a.evaluate(() =>
      window.phase3.inventory('a'),
    )) as {
      records: unknown[];
      receipts: unknown[];
      migrationStaging: unknown[];
    };
    expect(inventory.records).toEqual([]);
    expect(inventory.receipts).toEqual([]);
    expect(inventory.migrationStaging).toEqual([]);
    (evidence.cases as string[]).push(
      'capacity-retry-delete-full-clear-reopen-cleanup-pending',
    );
  });
  it('refuses incompatible migration input without resetting source data', async () => {
    const { a } = await setup();
    await a.evaluate(() => window.phase3.seedMigration('a'));
    await a.evaluate(() => window.phase3.corrupt('a', 'incompatible-payload'));
    const before = await a.evaluate(() => window.phase3.inventory('a'));
    expect(await a.evaluate(() => window.phase3.migrate('a'))).toEqual(
      check('invalid_record'),
    );
    expect(await a.evaluate(() => window.phase3.inventory('a'))).toEqual(
      before,
    );
    (evidence.cases as string[]).push(
      'native-incompatible-migration-refusal-no-reset',
    );
  });
  it('migrates the fixed independent source/target and retains exact receipts/revisions/fence', async () => {
    const { a, repo } = await setup();
    await a.evaluate(() => window.phase3.seedMigration('a'));
    value(await a.evaluate(() => window.phase3.migrate('a')));
    const inventory = (await a.evaluate(() =>
      window.phase3.inventory('a'),
    )) as {
      version: number;
      records: unknown;
      receipts: unknown;
      migrationStaging: unknown[];
    };
    expect(inventory.version).toBe(2);
    expect(inventory.records).toEqual(syntheticMigrationExpected.records);
    expect(inventory.receipts).toEqual(syntheticMigrationExpected.receipts);
    expect(inventory.migrationStaging).toEqual([]);
    expect(value(await repo.getEpoch())).toBe(7);
    (evidence.cases as string[]).push(
      'native-forward-migration-fixed-independent-oracle',
    );
  });
  it.each([
    'checkpoint_abort',
    'upgrade_abort',
    'interrupt_prepared',
    'interrupt_unverified',
  ] as const)('recovers %s without resetting data', async (failure) => {
    const { a, dbName, repo } = await setup();
    await a.evaluate(() => window.phase3.seedMigration('a'));
    const result = await a.evaluate(
      (f) => window.phase3.migrate('a', f),
      failure,
    );
    if (failure === 'interrupt_unverified') {
      // Coordinator may return the target in read-only recovery.
      if (!result.ok)
        value(
          await a.evaluate(
            (dbName) => window.phase3.open('a', dbName, false, 2),
            dbName,
          ),
        );
      expect(
        await repo.execute(
          create('synthetic-recovery', profileA, value(storageEpoch(7))),
        ),
      ).toEqual(check('storage_unavailable'));
      value(await a.evaluate(() => window.phase3.finalize('a')));
    } else {
      expect(result.ok).toBe(false);
      value(
        await a.evaluate(
          (dbName) => window.phase3.open('a', dbName, false, 1),
          dbName,
        ),
      );
      if (failure !== 'checkpoint_abort')
        value(await a.evaluate(() => window.phase3.cancelPrepared('a')));
    }
    expect(value(await repo.getEpoch())).toBe(7);
    const id = value(recordId('synthetic-migration-profile-a'));
    expect(value(await repo.load(id)).revision).toBe(3);
    (evidence.cases as string[]).push(
      `deterministic-${failure}-reopen-recovery`,
    );
  });
  it('native versionchange permanently revokes ordinary adapters and settles in-flight work', async () => {
    const { a, dbName, repo } = await setup();
    await a.evaluate(() => window.phase3.seedMigration('a'));
    const b = await page();
    value(
      await b.evaluate(
        (dbName) => window.phase3.open('b', dbName, false),
        dbName,
      ),
    );
    const other = bridge(b, 'b');
    const update = command(
      syntheticLearnerCodec,
      'update',
      'synthetic-inflight-survivor',
      value(recordId('synthetic-migration-profile-b')),
      value(storageEpoch(7)),
      one,
      syntheticLearnerRecord(2),
    );
    const pending = other.execute(update);
    const migrated = a.evaluate(() => window.phase3.migrate('a'));
    const outcome = await pending;
    expect(
      outcome.ok ||
        (!outcome.ok && outcome.error.code === 'storage_unavailable'),
    ).toBe(true);
    value(await migrated);
    expect(await other.getEpoch()).toEqual(check('storage_unavailable'));
    expect(value(await repo.getEpoch())).toBe(7);
    (evidence.cases as string[]).push(
      'native-versionchange-handle-revocation-inflight-settlement',
    );
  });
  it('cancels finalization without committing readiness or removing recovery', async () => {
    const { a, dbName } = await setup();
    await a.evaluate(() => window.phase3.seedMigration('a'));
    expect(
      await a.evaluate(() => window.phase3.cancelFinalization('a')),
    ).toEqual(check('storage_unavailable'));
    value(
      await a.evaluate(
        (dbName) => window.phase3.open('a', dbName, false, 2),
        dbName,
      ),
    );
    const data = (await a.evaluate(() => window.phase3.inventory('a'))) as {
      metadata: { recoveryPhase: string }[];
      migrationStaging: unknown[];
    };
    expect(data.metadata[0]?.recoveryPhase).toBe('upgradedPendingValidation');
    expect(data.migrationStaging).toHaveLength(1);
    value(await a.evaluate(() => window.phase3.finalize('a')));
    (evidence.cases as string[]).push(
      'injected-finalization-cancel-native-transaction-abort',
    );
  });
  it('observes real blocked upgrade, cancels late work, and then closes/retries', async () => {
    const { a, dbName } = await setup();
    await a.evaluate(() => window.phase3.seedMigration('a'));
    const b = await page();
    await b.evaluate((dbName) => window.phase3.hold(dbName), dbName);
    const pending = a.evaluate(() => window.phase3.migrate('a'));
    await a.waitForFunction(() => window.phase3.isBlocked());
    await a.evaluate(() => window.phase3.cancelMigration());
    await b.evaluate(() => window.phase3.release());
    expect((await pending).ok).toBe(false);
    value(
      await a.evaluate(
        (dbName) => window.phase3.open('a', dbName, false, 1),
        dbName,
      ),
    );
    value(await a.evaluate(() => window.phase3.cancelPrepared('a')));
    value(await a.evaluate(() => window.phase3.migrate('a')));
    (evidence.cases as string[]).push(
      'native-blocked-upgrade-cancel-close-retry',
    );
  });
  it.each(['interrupt_prepared', 'interrupt_unverified'] as const)(
    'reopens %s after actual browser-process restart',
    async (failure) => {
      const { a, dbName } = await setup();
      await a.evaluate(() => window.phase3.seedMigration('a'));
      await a.evaluate((f) => window.phase3.migrate('a', f), failure);
      await context.close();
      await launch();
      const restarted = await page();
      const version: 1 | 2 = failure === 'interrupt_prepared' ? 1 : 2;
      value(
        await restarted.evaluate(
          ({ dbName, version }) =>
            window.phase3.open('a', dbName, false, version),
          { dbName, version },
        ),
      );
      const repo = bridge(restarted);
      expect(value(await repo.getEpoch())).toBe(7);
      expect(
        value(await repo.load(value(recordId('synthetic-migration-profile-a'))))
          .revision,
      ).toBe(3);
      expect(
        await repo.execute(
          create('synthetic-restart-pending', profileA, value(storageEpoch(7))),
        ),
      ).toEqual(check('storage_unavailable'));
      if (failure === 'interrupt_prepared')
        value(
          await restarted.evaluate(() => window.phase3.cancelPrepared('a')),
        );
      else value(await restarted.evaluate(() => window.phase3.finalize('a')));
      const inventory = (await restarted.evaluate(() =>
        window.phase3.inventory('a'),
      )) as { migrationStaging: unknown[] };
      expect(inventory.migrationStaging).toEqual([]);
      (evidence.cases as string[]).push(
        `actual-browser-process-restart-${failure}`,
      );
    },
  );
  it('deduplicates simultaneous operations and clears two acknowledged clients without stale resurrection', async () => {
    const { a, dbName, repo } = await setup();
    const b = await page();
    value(
      await b.evaluate(
        (dbName) => window.phase3.open('b', dbName, false),
        dbName,
      ),
    );
    const other = bridge(b, 'b');
    const c = create();
    const results = await Promise.all([repo.execute(c), other.execute(c)]);
    expect(results[0]).toEqual(results[1]);
    expect(value(await repo.load(profileA)).revision).toBe(1);
    await a.evaluate(() => window.phase3.seedCaches());
    await Promise.all([
      a.evaluate(() => window.phase3.freeze()),
      b.evaluate(() => window.phase3.freeze()),
    ]);
    expect(await other.execute(create('synthetic-frozen'))).toEqual(
      check('storage_unavailable'),
    );
    const clear = await a.evaluate(() => window.phase3.clear('a', true, true));
    expect(clear.database.ok).toBe(true);
    expect(clear.caches).toBe('complete');
    expect(await a.evaluate(() => window.phase3.cacheNames())).toContain(
      'synthetic-unrelated-app',
    );
    expect(await a.evaluate(() => window.phase3.cacheNames())).not.toContain(
      'math-adventure.synthetic.phase3.shell',
    );
    await b.evaluate(() => window.phase3.thaw());
    expect(await other.execute(c)).toEqual(check('epoch_conflict'));
    expect(await other.load(profileA)).toEqual(check('record_not_found'));
    (evidence.cases as string[]).push(
      'simultaneous-exact-operation-two-client-quiescence-fullclear',
    );
  });
  it.each(['extra-metadata', 'orphan-checkpoint'] as const)(
    'fails closed on %s after opening without partial writes',
    async (fixture) => {
      const { a, repo } = await setup();
      value(await repo.execute(create()));
      const before = await a.evaluate(() => window.phase3.inventory('a'));
      await a.evaluate((f) => window.phase3.corrupt('a', f), fixture);
      expect(await repo.execute(create('synthetic-corrupt', profileB))).toEqual(
        check('invalid_record'),
      );
      const after = (await a.evaluate(() => window.phase3.inventory('a'))) as {
        records: unknown;
        receipts: unknown;
      };
      const prior = before as typeof after;
      expect(after.records).toEqual(prior.records);
      expect(after.receipts).toEqual(prior.receipts);
      (evidence.cases as string[]).push(`native-corruption-refusal-${fixture}`);
    },
  );
  it.each(['interrupt_prepared', 'interrupt_unverified'] as const)(
    'refuses revision corruption during %s recovery',
    async (failure) => {
      const { a, dbName } = await setup();
      await a.evaluate(() => window.phase3.seedMigration('a'));
      const migration = await a.evaluate(
        (f) => window.phase3.migrate('a', f),
        failure,
      );
      const version: 1 | 2 = failure === 'interrupt_prepared' ? 1 : 2;
      if (!migration.ok)
        value(
          await a.evaluate(
            ({ dbName, version }) =>
              window.phase3.open('a', dbName, false, version),
            { dbName, version },
          ),
        );
      await a.evaluate(() => window.phase3.corrupt('a', 'revision'));
      const result =
        failure === 'interrupt_prepared'
          ? await a.evaluate(() => window.phase3.cancelPrepared('a'))
          : await a.evaluate(() => window.phase3.finalize('a'));
      expect(result).toEqual(check('invalid_record'));
      const inventory = (await a.evaluate(() =>
        window.phase3.inventory('a'),
      )) as { migrationStaging: unknown[] };
      expect(inventory.migrationStaging).toHaveLength(1);
      (evidence.cases as string[]).push(
        `native-revision-corruption-${failure}`,
      );
    },
  );
  it('revokes writers after genuine browser-engine site-data clearing and refuses automatic bootstrap', async () => {
    const { a, dbName, repo } = await setup();
    value(await repo.execute(create()));
    const client = await context.newCDPSession(a);
    await client.send('Storage.clearDataForOrigin', {
      origin,
      storageTypes: 'indexeddb',
    });
    await client.detach();
    expect(await repo.execute(create('synthetic-after-browser-clear'))).toEqual(
      check('storage_unavailable'),
    );
    expect(
      await a.evaluate(
        (dbName) => window.phase3.open('a', dbName, false),
        dbName,
      ),
    ).toEqual(check('storage_unavailable'));
    (evidence.cases as string[]).push(
      'genuine-browser-engine-clear-revocation-missing-reopen',
    );
  });
  it('refuses future database/control versions, missing database reopen, and revoked handles', async () => {
    const { a, dbName, repo } = await setup();
    value(await repo.execute(create()));
    await a.evaluate(() => window.phase3.corrupt('a', 'future-control'));
    expect((await repo.execute(create('synthetic-future'))).ok).toBe(false);
    await a.evaluate(() => window.phase3.close('a'));
    expect(await repo.execute(create('synthetic-revoked'))).toEqual(
      check('storage_unavailable'),
    );
    const future = name();
    await a.evaluate((future) => window.phase3.future(future), future);
    expect(
      await a.evaluate(
        (future) => window.phase3.open('f', future, false, 1),
        future,
      ),
    ).toEqual(check('unsupported_schema'));
    expect(
      await a.evaluate(
        (missing) => window.phase3.open('missing', missing, false),
        name(),
      ),
    ).toEqual(check('storage_unavailable'));
    expect(dbName).toMatch(/synthetic/);
    (evidence.cases as string[]).push(
      'future-schema-missing-reopen-revoked-handle-refusal',
    );
  });
  it('fails closed without developer capability and handles genuine opaque-origin storage denial', async () => {
    const off = await context.newPage();
    await off.goto(offOrigin);
    expect(await off.evaluate(() => typeof window.phase3)).toBe('undefined');
    await off
      .getByRole('button', { name: 'Continue UNSAVED in memory' })
      .click();
    expect(await off.locator('#status').textContent()).toContain('UNSAVED');
    const parent = await page();
    await parent.evaluate((url) => {
      const frame = document.createElement('iframe');
      frame.sandbox.add('allow-scripts');
      frame.src = url;
      document.body.append(frame);
    }, origin);
    await expect.poll(() => parent.frames().length).toBe(2);
    const opaque = parent.frames()[1];
    if (!opaque) throw new Error('Opaque frame unavailable');
    await opaque.waitForFunction(() => !!window.phase3);
    expect(
      await opaque.evaluate(
        (dbName) => window.phase3.open('denied', dbName, true),
        name(),
      ),
    ).toEqual(check('storage_unavailable'));
    (evidence.cases as string[]).push(
      'capability-off-unsaved-genuine-opaque-origin-denial',
    );
  });
  it('observes genuine storage capability and keeps ordinary child composition from opening persistence', async () => {
    const p = await page();
    evidence.storage = await p.evaluate(async () => ({
      indexedDB: typeof indexedDB === 'object',
      estimate: await navigator.storage.estimate(),
      persisted: await navigator.storage.persisted(),
      persistentRequest: 'not_requested',
    }));
    const child = await context.newPage();
    await child.addInitScript(() => {
      let opens = 0;
      const original = indexedDB.open.bind(indexedDB);
      indexedDB.open = (...args) => {
        opens++;
        return original(...args);
      };
      Object.defineProperty(window, '__idbOpens', { get: () => opens });
    });
    await child.goto(childOrigin);
    await child.getByRole('main').waitFor();
    expect(
      await child.evaluate(() => Reflect.get(window, '__idbOpens') as unknown),
    ).toBe(0);
    expect(await child.evaluate(() => typeof window.phase3)).toBe('undefined');
    const requests: string[] = [];
    child.on('request', (r) => requests.push(r.url()));
    await child.reload();
    await child.getByRole('main').waitFor();
    expect(requests.every((url) => url.startsWith(childOrigin))).toBe(true);
    (evidence.cases as string[]).push(
      'genuine-estimate-persisted-child-no-indexeddb-runtime',
    );
  });
});
