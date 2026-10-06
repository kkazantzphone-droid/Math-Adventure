// DEV/TEST only: fixed synthetic data, a disposable profile and an isolated origin.
// Consumes the separately built harness after that channel's persistence:proof.
// The exact-asset worker below belongs only to this proof, never the child PWA.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
} from 'node:path';
import { chromium } from 'playwright-core';

const channel = process.env.PHASE3_BROWSER ?? 'chrome';
assert(
  ['chrome', 'msedge'].includes(channel),
  'Use a required installed channel',
);
const require = createRequire(import.meta.url);
const directory = resolve('.cache/phase3-browser');
const site = resolve(directory, 'site');
const evidencePath = resolve(directory, `${channel}-offline-evidence.json`);
const cacheName = 'math-adventure.synthetic.phase3.shell';
const dbName = 'math-adventure.synthetic.phase3.offline-proof';
const boundaryName =
  'math-adventure.synthetic.phase3.validation-boundary-proof';
const sources = [
  'src/infrastructure/persistence/adapter.ts',
  'src/infrastructure/persistence/layout.ts',
  'src/infrastructure/persistence/maintenance.ts',
  'tests/integration/phase3-persistence.test.ts',
  'tests/browser/phase3/harness.ts',
];
const evidence = {
  channel,
  result: 'PENDING',
  phase: 'prerequisites',
  cases: [],
  sourceHashes: {},
  shellAssets: [],
  limitations: [
    'test-only exact-asset service worker; no normal child integration',
    'graceful browser-process restart; no abrupt crash proof',
    'loopback listener stopped; no OS network disconnection or device certification',
    'quota override is a controlled engine condition, never natural exhaustion',
  ],
};
await mkdir(directory, { recursive: true });
await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
let context;
let profileDirectory;
const servers = new Set();

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function inventory(current = site) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const target = resolve(current, entry.name);
    if (entry.isDirectory()) files.push(...(await inventory(target)));
    else {
      assert(entry.isFile(), 'The proof build contains files only');
      const bytes = await readFile(target);
      files.push({
        path: relative(site, target).replaceAll('\\', '/'),
        bytes: bytes.length,
        sha256: digest(bytes),
      });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

function worker(paths) {
  return `// SYNTHETIC PROOF ONLY. A fixed selected shell supports schemas 1 and 2.
const cacheName = ${JSON.stringify(cacheName)};
const assets = ${JSON.stringify(paths)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !assets.includes(url.pathname) || url.search) return;
  event.respondWith(caches.open(cacheName).then(cache => cache.match(event.request)).then(cached => cached || fetch(event.request)));
});`;
}

async function serve(paths) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (request.method !== 'GET' || url.search) {
      response.writeHead(400).end();
      return;
    }
    if (url.pathname === '/synthetic-proof-sw.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.setHeader('Cache-Control', 'no-store');
      response.end(worker(paths));
      return;
    }
    if (!paths.includes(url.pathname)) {
      response.writeHead(404).end();
      return;
    }
    const path = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const target = resolve(site, path);
    const within = relative(site, target);
    if (within.startsWith('..') || isAbsolute(within)) {
      response.writeHead(400).end();
      return;
    }
    void readFile(target)
      .then((bytes) => {
        response.setHeader(
          'Content-Type',
          {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
          }[extname(path)] ?? 'application/octet-stream',
        );
        response.end(bytes);
      })
      .catch(() => response.writeHead(404).end());
  });
  servers.add(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

async function stop(server) {
  if (server.listening)
    await new Promise((resolve) => server.close(() => resolve()));
  servers.delete(server);
}

async function launch() {
  context = await chromium.launchPersistentContext(profileDirectory, {
    channel,
    headless: true,
    timeout: 15_000,
    acceptDownloads: false,
    serviceWorkers: 'allow',
  });
  const browser = context.browser();
  assert(browser);
  if (evidence.browserVersion)
    assert.equal(browser.version(), evidence.browserVersion);
  else evidence.browserVersion = browser.version();
}

function success(result) {
  assert.equal(result.ok, true, 'A checked synthetic operation must succeed');
  return result.value;
}

function frozenDelete() {
  return {
    version: 'atomic-command-v1',
    recordSchema: 'synthetic-learner-v1',
    operationId: 'synthetic-offline-frozen-delete',
    kind: 'delete',
    recordId: 'synthetic-migration-profile-a',
    storageEpoch: 7,
    expectedRevision: 3,
  };
}

function fixedPayload() {
  const observation = (concept, representation, outcome) => ({
    evidence: {
      kind: 'assessment',
      mode: 'practice',
      eligibleForMastery: true,
      scopes: [{ conceptId: concept, representationId: representation }],
    },
    outcome,
  });
  return {
    marker: 'synthetic-only',
    assessments: [
      ...Array.from({ length: 3 }, () =>
        observation(
          'synthetic-arithmetic',
          'synthetic-symbolic',
          'independentCorrect',
        ),
      ),
      observation('synthetic-geometry', 'synthetic-shape', 'supportedCorrect'),
      observation(
        'synthetic-measurement',
        'synthetic-unit',
        'supportedCorrect',
      ),
    ],
  };
}

async function quotaProbe(paths) {
  // A distinct disposable origin prevents the optional probe altering offline data.
  const { server, origin } = await serve(paths);
  const page = await context.newPage();
  let session;
  try {
    await page.goto(origin);
    await page.waitForFunction(() => !!globalThis.window.phase3);
    success(
      await page.evaluate(
        (name) => globalThis.window.phase3.open('quota', name, true),
        'math-adventure.synthetic.phase3.quota-proof',
      ),
    );
    const create = {
      version: 'atomic-command-v1',
      recordSchema: 'synthetic-learner-v1',
      kind: 'create',
      operationId: 'synthetic-quota-create-a',
      recordId: 'synthetic-player-001',
      storageEpoch: 0,
      expectedRevision: null,
      payload: fixedPayload(),
    };
    success(
      await page.evaluate(
        (command) => globalThis.window.phase3.execute('quota', command),
        create,
      ),
    );
    const before = await page.evaluate(() =>
      globalThis.window.phase3.inventory('quota'),
    );
    session = await context.newCDPSession(page);
    await session.send('Storage.overrideQuotaForOrigin', {
      origin,
      quotaSize: 1,
    });
    let result = await page.evaluate(
      (command) => globalThis.window.phase3.execute('quota', command),
      {
        ...create,
        operationId: 'synthetic-quota-create-b',
        recordId: 'synthetic-player-002',
      },
    );
    let attempts = 1;
    let unchanged =
      JSON.stringify(
        await page.evaluate(() => globalThis.window.phase3.inventory('quota')),
      ) === JSON.stringify(before);
    if (result.ok) {
      const updates = await page.evaluate(async (payload) => {
        for (let i = 0; i < 255; i++) {
          const before = await globalThis.window.phase3.inventory('quota');
          const result = await globalThis.window.phase3.execute('quota', {
            version: 'atomic-command-v1',
            recordSchema: 'synthetic-learner-v1',
            kind: 'update',
            operationId: `synthetic-quota-update-${i}`,
            recordId: 'synthetic-player-001',
            storageEpoch: 0,
            expectedRevision: i + 1,
            payload,
          });
          if (!result.ok)
            return {
              result,
              attempts: i + 1,
              unchanged:
                JSON.stringify(
                  await globalThis.window.phase3.inventory('quota'),
                ) === JSON.stringify(before),
            };
        }
        return { result: { ok: true }, attempts: 255, unchanged: false };
      }, fixedPayload());
      result = updates.result;
      attempts += updates.attempts;
      unchanged = updates.unchanged;
    }
    evidence.quotaAttempts = attempts;
    evidence.quotaEstimate = await page.evaluate(() =>
      globalThis.navigator.storage.estimate(),
    );
    if (!result.ok && result.error.code === 'quota_exceeded') {
      assert.equal(
        unchanged,
        true,
        'Native quota refusal must leave every store unchanged',
      );
      evidence.quota = 'native-quota-refusal-under-controlled-engine-override';
      evidence.cases.push('controlled-native-quota-all-store-atomicity');
    } else {
      evidence.quota =
        'BLOCKED-native-quota-not-observed-under-engine-override';
    }
  } catch (error) {
    if (error?.code === 'ERR_ASSERTION') throw error;
    evidence.quota = 'BLOCKED-controlled-quota-method-unavailable';
  } finally {
    if (session) {
      await session
        .send('Storage.overrideQuotaForOrigin', { origin })
        .catch(() => {});
      await session.detach();
    }
    await page.close();
    await stop(server);
  }
}

async function interruptValidatedCleanup(page) {
  success(
    await page.evaluate(
      (name) => globalThis.window.phase3.open('boundary', name, true),
      boundaryName,
    ),
  );
  await page.evaluate(() => globalThis.window.phase3.seedMigration('boundary'));
  const boundary = await page.evaluate(async (name) => {
    const original = globalThis.IDBObjectStore.prototype.delete;
    let observed = false;
    globalThis.IDBObjectStore.prototype.delete = function (...args) {
      const request = original.apply(this, args);
      if (
        this.transaction.db.name === name &&
        this.transaction.db.version === 2 &&
        this.name === 'migrationStaging' &&
        args[0] === 'checkpoint'
      ) {
        // The finalizer has completed independent row validation and queued its
        // cleanup. Abort the native transaction before completion can commit it.
        observed = true;
        this.transaction.abort();
      }
      return request;
    };
    try {
      return {
        result: await globalThis.window.phase3.migrate('boundary'),
        observed,
      };
    } finally {
      globalThis.IDBObjectStore.prototype.delete = original;
    }
  }, boundaryName);
  assert.equal(boundary.observed, true);
  assert.deepEqual(boundary.result, {
    ok: false,
    error: { code: 'storage_unavailable' },
  });
  success(
    await page.evaluate(
      (name) => globalThis.window.phase3.open('boundary', name, false, 2),
      boundaryName,
    ),
  );
  const pending = await page.evaluate(() =>
    globalThis.window.phase3.inventory('boundary'),
  );
  assert.equal(pending.version, 2);
  assert.equal(pending.metadata[0].recoveryPhase, 'upgradedPendingValidation');
  assert.equal(pending.metadata[0].storageEpoch, 7);
  assert.equal(pending.migrationStaging.length, 1);
  evidence.cases.push(
    'native-abort-after-live-validation-before-cleanup-commit',
  );
  return pending;
}

try {
  assert.equal(require('playwright-core/package.json').version, '1.63.0');
  assert.equal(
    process.version,
    `v${(await readFile('.node-version', 'utf8')).trim()}`,
  );
  const previous = JSON.parse(
    await readFile(resolve(directory, `${channel}-evidence.json`), 'utf8'),
  );
  assert.equal(
    previous.result,
    'PASS',
    'Run this channel persistence proof first',
  );
  for (const source of sources) {
    const hash = digest(await readFile(source));
    assert.equal(
      previous.sourceHashes?.[source],
      hash,
      'Prior proof must match current source',
    );
    evidence.sourceHashes[source] = hash;
  }
  evidence.sourceHashes['scripts/persistence-offline-proof.mjs'] = digest(
    await readFile('scripts/persistence-offline-proof.mjs'),
  );
  evidence.shellAssets = await inventory();
  assert(
    Array.isArray(previous.shellAssets),
    'Main proof must bind its actual build artifacts',
  );
  assert.deepEqual(
    evidence.shellAssets,
    previous.shellAssets,
    'The cached shell must be the exact build from the matching main proof',
  );
  evidence.buildBinding = 'main-proof-exact-shell-asset-hash-match';
  assert(evidence.shellAssets.some((file) => file.path === 'index.html'));
  assert(
    evidence.shellAssets.some((file) =>
      /^assets\/index-[\w-]+\.js$/.test(file.path),
    ),
  );
  const paths = ['/', ...evidence.shellAssets.map((file) => `/${file.path}`)];
  const { server, origin } = await serve(paths);
  profileDirectory = await mkdtemp(
    resolve(directory, 'offline-synthetic-profile-'),
  );
  evidence.phase = 'install-and-two-client-freeze';
  await launch();
  assert.equal(evidence.browserVersion, previous.browserVersion);
  const first = await context.newPage();
  await first.goto(origin);
  await first.waitForFunction(() => !!globalThis.window.phase3);
  assert.match(await first.locator('#status').textContent(), /SYNTHETIC ONLY/);
  await first.locator('#memory').click();
  assert.match(await first.locator('#status').textContent(), /UNSAVED/);
  await first.evaluate(async () => {
    await globalThis.navigator.serviceWorker.register(
      '/synthetic-proof-sw.js',
      { scope: '/' },
    );
    await globalThis.navigator.serviceWorker.ready;
  });
  await first.waitForFunction(
    () => !!globalThis.navigator.serviceWorker.controller,
  );
  success(
    await first.evaluate(
      (name) => globalThis.window.phase3.open('a', name, true),
      dbName,
    ),
  );
  await first.evaluate(() => globalThis.window.phase3.seedMigration('a'));
  const second = await context.newPage();
  await second.goto(origin);
  await second.waitForFunction(() => !!globalThis.window.phase3);
  success(
    await second.evaluate(
      (name) => globalThis.window.phase3.open('b', name, false),
      dbName,
    ),
  );
  await Promise.all([
    first.evaluate(() => globalThis.window.phase3.freeze()),
    second.evaluate(() => globalThis.window.phase3.freeze()),
  ]);
  for (const [page, id] of [
    [first, 'a'],
    [second, 'b'],
  ])
    assert.deepEqual(
      await page.evaluate(
        ({ id, command }) => globalThis.window.phase3.execute(id, command),
        { id, command: frozenDelete() },
      ),
      { ok: false, error: { code: 'storage_unavailable' } },
    );
  evidence.cases.push(
    'two-known-clients-freeze-before-selected-compatible-shell-migration',
  );
  success(await first.evaluate(() => globalThis.window.phase3.migrate('a')));
  const selected = await first.evaluate(() =>
    globalThis.window.phase3.inventory('a'),
  );
  assert.equal(selected.version, 2);
  assert.equal(selected.metadata[0].storageEpoch, 7);
  assert.equal(selected.records[0].revision, 3);
  assert.equal(selected.records[1].revision, 1);
  assert.equal(selected.receipts.length, 1);
  assert.deepEqual(selected.migrationStaging, []);
  assert.deepEqual(
    await second.evaluate(() =>
      globalThis.window.phase3.load('b', 'synthetic-migration-profile-a'),
    ),
    { ok: false, error: { code: 'storage_unavailable' } },
  );
  evidence.cases.push('native-migration-preserves-data-and-revokes-old-client');
  const cached = await first.evaluate(
    async (name) =>
      (await (await globalThis.caches.open(name)).keys())
        .map((request) => new URL(request.url).pathname)
        .sort(),
    cacheName,
  );
  assert.deepEqual(cached, [...paths].sort());
  await quotaProbe(paths);
  evidence.phase = 'validated-before-cleanup-native-abort';
  const pendingBoundary = await interruptValidatedCleanup(first);
  evidence.phase = 'listener-stopped-process-restart';
  await context.close();
  await stop(server);
  assert.equal(server.listening, false);
  await launch();
  const reopened = await context.newPage();
  const response = await reopened.goto(origin);
  assert(
    response?.fromServiceWorker(),
    'Offline navigation must come from the cached proof worker',
  );
  await reopened.waitForFunction(() => !!globalThis.window.phase3);
  assert.equal(
    await reopened.evaluate(async () => {
      try {
        await globalThis.fetch('/synthetic-network-probe');
        return true;
      } catch {
        return false;
      }
    }),
    false,
    'The uncached loopback network must actually be unavailable',
  );
  success(
    await reopened.evaluate(
      (name) => globalThis.window.phase3.open('reopened', name, false, 2),
      dbName,
    ),
  );
  assert.deepEqual(
    await reopened.evaluate(() =>
      globalThis.window.phase3.inventory('reopened'),
    ),
    selected,
  );
  const restored = success(
    await reopened.evaluate(() =>
      globalThis.window.phase3.load(
        'reopened',
        'synthetic-migration-profile-a',
      ),
    ),
  );
  assert.equal(restored.revision, 3);
  assert.equal(restored.storageEpoch, 7);
  evidence.cases.push(
    'actual-unavailable-loopback-cached-shell-process-restart-exact-data-reopen',
  );
  success(
    await reopened.evaluate(
      (name) => globalThis.window.phase3.open('boundary', name, false, 2),
      boundaryName,
    ),
  );
  assert.deepEqual(
    await reopened.evaluate(() =>
      globalThis.window.phase3.inventory('boundary'),
    ),
    pendingBoundary,
  );
  assert.deepEqual(
    await reopened.evaluate(
      (command) => globalThis.window.phase3.execute('boundary', command),
      frozenDelete(),
    ),
    { ok: false, error: { code: 'storage_unavailable' } },
  );
  success(
    await reopened.evaluate(() =>
      globalThis.window.phase3.finalize('boundary'),
    ),
  );
  const recoveredBoundary = await reopened.evaluate(() =>
    globalThis.window.phase3.inventory('boundary'),
  );
  assert.equal(recoveredBoundary.metadata[0].recoveryPhase, 'ready');
  assert.equal(recoveredBoundary.metadata[0].storageEpoch, 7);
  assert.deepEqual(recoveredBoundary.migrationStaging, []);
  assert.deepEqual(recoveredBoundary.records, pendingBoundary.records);
  assert.deepEqual(recoveredBoundary.receipts, pendingBoundary.receipts);
  evidence.cases.push(
    'process-restart-at-validated-before-cleanup-recovery-boundary',
  );
  assert.deepEqual(
    await reopened.evaluate(
      (name) => globalThis.window.phase3.open('old-reader', name, false, 1),
      dbName,
    ),
    { ok: false, error: { code: 'unsupported_schema' } },
  );
  assert.deepEqual(
    await reopened.evaluate(() =>
      globalThis.window.phase3.inventory('reopened'),
    ),
    selected,
  );
  evidence.cases.push(
    'old-reader-roll-back-refusal-without-downgrade-or-reset',
  );
  evidence.phase = 'exact-owned-cache-cleanup';
  await reopened.evaluate(async () => {
    const unrelated = await globalThis.caches.open('synthetic-unrelated-app');
    await unrelated.put(
      '/synthetic-unrelated-fixture',
      new globalThis.Response('synthetic-only'),
    );
    globalThis.window.phase3.freeze();
  });
  const cleared = await reopened.evaluate(() =>
    globalThis.window.phase3.clear('reopened', true, true),
  );
  success(cleared.database);
  assert.equal(cleared.caches, 'complete');
  assert.deepEqual(
    await reopened.evaluate(() => globalThis.window.phase3.cacheNames()),
    ['synthetic-unrelated-app'],
  );
  const empty = await reopened.evaluate(() =>
    globalThis.window.phase3.inventory('reopened'),
  );
  assert.equal(empty.metadata[0].storageEpoch, 8);
  for (const store of ['records', 'receipts', 'migrationStaging'])
    assert.deepEqual(empty[store], []);
  evidence.cases.push(
    'database-fence-commit-and-exact-owned-shell-cache-cleanup-separately-observed',
  );
  for (const source of sources)
    assert.equal(
      digest(await readFile(source)),
      evidence.sourceHashes[source],
      'No mutation may overlap this proof',
    );
  assert.equal(
    digest(await readFile('scripts/persistence-offline-proof.mjs')),
    evidence.sourceHashes['scripts/persistence-offline-proof.mjs'],
    'The proof runner itself must stay unchanged throughout execution',
  );
  evidence.result = 'PASS';
  evidence.phase = 'complete';
} catch (error) {
  evidence.result = 'FAIL';
  evidence.failureCode =
    error?.code === 'ERR_ASSERTION' ? 'assertion_failed' : 'proof_unavailable';
  process.exitCode = 1;
} finally {
  try {
    await context?.close();
    for (const server of servers) await stop(server);
    if (profileDirectory) {
      const target = await realpath(profileDirectory);
      const parent = await realpath(directory);
      assert.equal(
        dirname(target),
        parent,
        'Profile cleanup stays inside the owned proof directory',
      );
      assert(basename(target).startsWith('offline-synthetic-profile-'));
      await rm(target, { recursive: true, force: true });
    }
  } catch {
    evidence.result = 'FAIL';
    evidence.failureCode = 'cleanup_incomplete';
    process.exitCode = 1;
  }
  evidence.testsObserved = evidence.cases.length;
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify({
      channel,
      result: evidence.result,
      phase: evidence.phase,
      testsObserved: evidence.testsObserved,
      quota: evidence.quota,
      sourceHashes: evidence.sourceHashes,
    }),
  );
}
