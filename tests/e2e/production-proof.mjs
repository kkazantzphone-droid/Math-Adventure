// DEV/TEST only. Assertions inspect the real generated production worker/cache.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { setTimeout as pause } from 'node:timers/promises';
import {
  clearTimeout as cancelTimer,
  setTimeout as scheduleTimer,
} from 'node:timers';
import { assertCleanObservations } from '../../scripts/browser-proof/evidence.mjs';
import { startProofProxy } from '../../scripts/browser-proof/proxy.mjs';
import {
  newObservedContext,
  registrationSnapshot,
  waitForControl,
  waitForWorker,
} from './browser-proof.mjs';

const timeout = 15_000;

async function bounded(operation, description, milliseconds = timeout) {
  let timer;
  const expired = new Promise((_, reject) => {
    timer = scheduleTimer(
      () => reject(new Error(`Bounded operation timed out: ${description}`)),
      milliseconds,
    );
  });
  try {
    return await Promise.race([operation, expired]);
  } finally {
    cancelTimer(timer);
  }
}

async function assertServedBodies(records, descriptor, prefix, origin, phase) {
  const delivered = (
    await bounded(
      Promise.all(records),
      'offline served response body collection',
    )
  ).filter((record) => record.phase === phase);
  assert(
    delivered.length >= 3,
    'Native offline document/script/style responses need actual body evidence',
  );
  for (const response of delivered) {
    assert.equal(
      response.error,
      undefined,
      'A delivered body must be readable before its document closes',
    );
    assert.equal(response.origin, origin);
    assert.equal(response.worker, true);
    assert.equal(response.status, 200);
    const relative =
      response.path === prefix || response.path === `${prefix}index.html`
        ? 'index.html'
        : response.path.startsWith(prefix)
          ? response.path.slice(prefix.length)
          : null;
    const expected = descriptor.essential.find(
      (asset) => asset.path === relative,
    );
    assert(
      expected,
      `Offline delivery must belong to the declared shell: ${response.path}`,
    );
    assert.equal(response.bytes, expected.bytes);
    assert.equal(
      response.sha256,
      expected.sha256,
      'Actual delivered bytes must match the independently inventoried artifact',
    );
  }
  return delivered.length;
}

async function message(page, role, type) {
  return page.evaluate(
    async ({ role, type }) => {
      const registration = await navigator.serviceWorker.getRegistration(
        location.href,
      );
      const worker =
        role === 'controller'
          ? navigator.serviceWorker.controller
          : registration?.[role];
      if (!worker) throw new Error(`Missing native ${role} worker`);
      return new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => {
          channel.port1.close();
          reject(new Error(`No production worker reply: ${type}`));
        }, 10_000);
        channel.port1.onmessage = (event) => {
          clearTimeout(timer);
          channel.port1.close();
          resolve(event.data);
        };
        worker.postMessage({ type, protocolVersion: 1 }, [channel.port2]);
      });
    },
    { role, type },
  );
}

async function assertStatus(page, role, descriptor) {
  const status = await message(page, role, 'GET_STATUS');
  assert.equal(status.type, 'STATUS');
  assert.equal(status.protocolVersion, 1);
  assert.equal(status.releaseId, descriptor.releaseId);
  assert.equal(status.shellId, descriptor.shellId);
  assert.equal(status.schemaVersion, 1);
  assert.deepEqual(status.compatibleSchema, { min: 1, max: 1 });
  assert.equal(
    status.ready,
    true,
    'A ready release needs its complete verified shell',
  );
  return status;
}

// Observe native messages without replacing their payloads or delivery.
// Keep a bounded, fixed-field diagnostic only if the UI assertion fails.
async function observeActivation(page) {
  await page.evaluate(() => {
    const events = [];
    const record = (direction, data) => {
      if (events.length >= 100 || typeof data?.type !== 'string') return;
      events.push({
        direction,
        type: data.type,
        ready: data.ready,
        outcome: data.outcome,
        code: data.code,
      });
    };
    const NativeChannel = globalThis.MessageChannel;
    const originalPost = ServiceWorker.prototype.postMessage;
    globalThis.MessageChannel = class extends NativeChannel {
      constructor() {
        super();
        this.port1.addEventListener('message', (event) =>
          record('reply', event.data),
        );
      }
    };
    ServiceWorker.prototype.postMessage = function (...args) {
      record('sent', args[0]);
      return originalPost.apply(this, args);
    };
    const incoming = (event) => record('received', event.data);
    navigator.serviceWorker.addEventListener('message', incoming);
    globalThis.productionActivationDiagnostic = events;
    globalThis.restoreProductionActivationObserver = () => {
      globalThis.MessageChannel = NativeChannel;
      ServiceWorker.prototype.postMessage = originalPost;
      navigator.serviceWorker.removeEventListener('message', incoming);
    };
  });
}

async function activationDiagnostic(page) {
  const snapshot = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration(
      location.href,
    );
    const panel = document.querySelector('[data-offline-state]');
    return {
      state: panel?.getAttribute('data-offline-state'),
      update: panel?.getAttribute('data-offline-update'),
      updateDisabled: document.querySelector('[data-offline-action="update"]')
        ?.disabled,
      home: Boolean(document.querySelector('.activity-cards')),
      controller: navigator.serviceWorker.controller?.state,
      active: registration?.active?.state,
      waiting: registration?.waiting?.state,
      events: globalThis.productionActivationDiagnostic,
    };
  });
  const statuses = await Promise.allSettled(
    ['controller', 'waiting'].map((role) => message(page, role, 'GET_STATUS')),
  );
  return { snapshot, statuses };
}

async function cacheInventory(page) {
  return page.evaluate(async () => {
    const result = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      result.push({
        name,
        urls: (await cache.keys()).map((request) => request.url).sort(),
      });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  });
}

async function cacheNames(page) {
  return page.evaluate(async () => (await caches.keys()).sort());
}

function releaseCacheNames(statuses) {
  return statuses
    .flatMap((status) => [status.cacheName, status.metadataCacheName])
    .sort();
}

async function cacheComplete(
  page,
  descriptor,
  prefix,
  origin,
  role = 'controller',
  priorReleaseIds = [],
) {
  const status = await assertStatus(page, role, descriptor);
  const cachePrefix = `math-adventure-shell:${encodeURIComponent(prefix)}:schema1:`;
  assert.equal(status.cacheName, `${cachePrefix}${descriptor.releaseId}`);
  assert.equal(
    status.metadataCacheName,
    `${cachePrefix}metadata:${descriptor.releaseId}`,
  );
  assert.equal(
    status.metadataURL,
    new URL('release.json', `${origin}${prefix}`).href,
  );
  const expectedURLs = descriptor.essential
    .map((asset) => new URL(asset.path, `${origin}${prefix}`).href)
    .sort();
  assert.deepEqual([...status.essentialURLs].sort(), expectedURLs);
  const inventory = await cacheInventory(page);
  const current = inventory.find((cache) => cache.name === status.cacheName);
  assert(current, 'The declared coherent release cache must exist');
  assert.deepEqual(
    current.urls,
    expectedURLs,
    'Cache keys must equal the declared shell only',
  );
  assert(current.urls.every((url) => new URL(url).origin === origin));
  assert(
    !current.urls.some((url) =>
      /(?:learner|profile|telemetry|__browser-proof)/i.test(url),
    ),
  );
  const integrity = await page.evaluate(
    async ({ cacheName, essential, base }) => {
      const cache = await caches.open(cacheName);
      const result = [];
      for (const asset of essential) {
        const response = await cache.match(new URL(asset.path, base).href);
        if (!response) throw new Error('Required cache entry missing');
        const bytes = await response.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        result.push({
          path: asset.path,
          bytes: bytes.byteLength,
          sha256: [...new Uint8Array(digest)]
            .map((value) => value.toString(16).padStart(2, '0'))
            .join(''),
        });
      }
      return result;
    },
    {
      cacheName: status.cacheName,
      essential: descriptor.essential,
      base: `${origin}${prefix}`,
    },
  );
  assert.deepEqual(
    integrity,
    descriptor.essential,
    'Actual cached bytes must equal the production artifact inventory',
  );
  const metadataCache = inventory.find(
    (cache) => cache.name === status.metadataCacheName,
  );
  assert(
    metadataCache,
    'Exactly scoped ownership metadata must accompany the shell',
  );
  assert.deepEqual(metadataCache.urls, [status.metadataURL]);
  const metadata = await page.evaluate(
    async ({ name, url }) => {
      const response = await (await caches.open(name)).match(url);
      if (!response || response.status !== 200)
        throw new Error('Missing release ownership record');
      return response.json();
    },
    { name: status.metadataCacheName, url: status.metadataURL },
  );
  assert.deepEqual(
    metadata,
    {
      protocolVersion: 1,
      schemaVersion: 1,
      releaseId: descriptor.releaseId,
      priorReleaseIds: [...priorReleaseIds].sort(),
    },
    'Ownership records contain only the independently expected release/schema information',
  );
  return status;
}

async function loadedShell(page, url, descriptor, fromWorker) {
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout });
  assert.equal(response?.status(), 200);
  if (fromWorker !== undefined)
    assert.equal(response?.fromServiceWorker(), fromWorker);
  await page.locator('main').waitFor({ timeout });
  assert(await page.locator('main').innerText());
  assert.equal(
    await page
      .locator('meta[name="math-adventure-shell"]')
      .getAttribute('content'),
    descriptor.shellId,
  );
  return response;
}

async function home(page) {
  if (await page.locator('.badge-button').count())
    await page.getByRole('button', { name: 'Star', exact: true }).click();
  else if (
    await page.getByRole('button', { name: 'Home', exact: true }).count()
  )
    await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.locator('.activity-cards').waitFor({ timeout });
}

async function waitUntil(assertion, description) {
  const deadline = Date.now() + timeout;
  let latest;
  while (Date.now() < deadline) {
    try {
      return await assertion();
    } catch (error) {
      latest = error;
      await pause(100);
    }
  }
  assert.fail(
    `${description}: ${latest instanceof Error ? latest.message : 'not observed'}`,
  );
}

async function crossOriginProbe() {
  let requests = 0;
  const server = createServer((request, response) => {
    requests += 1;
    if (
      request.method !== 'GET' ||
      request.url !== '/synthetic-cross-origin.txt'
    ) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    response.end('Synthetic cross-origin exclusion probe');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  return {
    url: `http://127.0.0.1:${address.port}/synthetic-cross-origin.txt`,
    count: () => requests,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}

export async function runProductionProof(browser, server, prefix, releases) {
  const [a, b] = releases;
  const releaseName = (name) =>
    `${prefix === '/' ? 'root' : 'subpath'}-${name}`;
  server.setProductionRelease(prefix, releaseName('a'));
  server.setFailedAsset(null);
  const stage = (name) =>
    console.log(`Production browser proof ${prefix}: ${name}`);
  stage('setup');
  const probe = await crossOriginProbe();
  let proxy;
  let observed;
  try {
    proxy = await startProofProxy([server.origin, new URL(probe.url).origin]);
    observed = await newObservedContext(browser, server, {
      allowedProbeURL: probe.url,
      proxyServer: proxy.origin,
      captureResponseBodies: true,
    });
  } catch (error) {
    try {
      if (proxy) await proxy.close();
    } finally {
      await probe.close();
    }
    throw error;
  }
  const { context, observations, bodyRecords } = observed;
  try {
    const first = await context.newPage();
    const appURL = `${server.origin}${prefix}?lang=en`;
    await loadedShell(first, appURL, a.descriptor, false);
    await waitForWorker(first, 'active', 'activated');
    await waitForControl(first);
    await first.locator('[data-offline-state="ready"]').waitFor({ timeout });
    const old = await cacheComplete(first, a.descriptor, prefix, server.origin);
    stage('first install and exact cached bytes observed');
    assert.deepEqual(await cacheNames(first), releaseCacheNames([old]));
    const initialWorker = context.serviceWorkers()[0];
    assert(initialWorker);
    const second = await context.newPage();
    await loadedShell(second, appURL, a.descriptor, true);
    await waitForControl(second);
    const nativeClients = await initialWorker.evaluate(async () =>
      (await self.clients.matchAll({ type: 'window' })).map((client) => ({
        id: client.id,
        url: client.url,
      })),
    );
    assert.equal(nativeClients.length, 2);
    assert.equal(
      new Set(nativeClients.map((client) => client.id)).size,
      2,
      'Independent native client IDs required',
    );

    const cacheBeforeExternal = await cacheInventory(first);
    const external = await first.evaluate(async (url) => {
      const response = await fetch(url, { cache: 'no-store' });
      return { status: response.status, text: await response.text() };
    }, probe.url);
    assert.deepEqual(external, {
      status: 200,
      text: 'Synthetic cross-origin exclusion probe',
    });
    assert.equal(
      probe.count(),
      1,
      'The cross-origin probe must really reach a second owned origin',
    );
    assert.deepEqual(
      await cacheInventory(first),
      cacheBeforeExternal,
      'Undeclared cross-origin response must never enter the shell cache',
    );

    observations.phase = 'offline-production';
    await bounded(
      proxy.setOffline(true),
      'establish owned offline transport gate',
      5_000,
    );
    await context.setOffline(true);
    assert.equal(await first.evaluate(() => navigator.onLine), false);
    const beforeOffline = server.requestCount();
    const beforeOfflineLedger = server.requestSnapshot().length;
    const beforeResponses = observations.responses.length;
    const uncachedPath = `${prefix}deliberately-uncached-production-proof.txt`;
    observations.phase = 'uncached-offline-negative';
    assert.equal(
      await first.evaluate(async (path) => {
        try {
          await fetch(path, { cache: 'no-store' });
          return false;
        } catch {
          return true;
        }
      }, uncachedPath),
      true,
      'An undeclared uncached resource must fail under actual offline controls',
    );
    assert(
      observations.failures.some(
        (failure) =>
          failure.phase === 'uncached-offline-negative' &&
          failure.path === uncachedPath,
      ),
      'The actual failed browser request must be observed',
    );
    observations.phase = 'offline-production';
    const offlineResponse = await first.reload({
      waitUntil: 'networkidle',
      timeout,
    });
    assert.equal(offlineResponse?.status(), 200);
    assert.equal(offlineResponse?.fromServiceWorker(), true);
    assert.equal(
      await first
        .locator('meta[name="math-adventure-shell"]')
        .getAttribute('content'),
      a.descriptor.shellId,
    );
    const newDocument = await context.newPage();
    await loadedShell(newDocument, appURL, a.descriptor, true);
    await waitForControl(newDocument);
    await cacheComplete(newDocument, a.descriptor, prefix, server.origin);
    for (const [query, locale] of [
      ['el', 'el-GR'],
      ['de', 'de-DE'],
    ]) {
      const localized = await context.newPage();
      await loadedShell(
        localized,
        `${server.origin}${prefix}?lang=${query}`,
        a.descriptor,
        true,
      );
      assert.equal(
        await localized.locator('main').getAttribute('lang'),
        locale,
        'Each draft locale uses the same verified cached release',
      );
      await localized.close();
    }
    assert.equal(
      server.requestCount(),
      beforeOffline,
      `Offline documents and application assets cannot contact the live server: ${JSON.stringify(server.requestSnapshot().slice(beforeOfflineLedger))}`,
    );
    const offlineResponses = observations.responses
      .slice(beforeResponses)
      .filter((response) => response.phase !== 'uncached-offline-negative');
    assert(
      offlineResponses.length >= 4,
      'Observe document, JavaScript and style requests on offline documents',
    );
    assert(
      offlineResponses.every(
        (response) => response.worker && response.status === 200,
      ),
      'Every offline runtime response must come from the declared worker shell',
    );
    const servedOfflineBodies = await assertServedBodies(
      bodyRecords,
      a.descriptor,
      prefix,
      server.origin,
      'offline-production',
    );
    stage('offline served bodies independently verified');
    await newDocument.close();
    const onlineControl = await newObservedContext(browser, server);
    try {
      const page = await onlineControl.context.newPage();
      await loadedShell(page, appURL, a.descriptor, false);
      assert.equal(
        await page.evaluate(() => navigator.onLine),
        true,
        'A separate Chromium context remains online while production context/gateway are offline',
      );
      assertCleanObservations(onlineControl.observations);
    } finally {
      await onlineControl.context.close();
    }
    await context.setOffline(false);
    await proxy.setOffline(false);
    observations.phase = 'update';
    await home(first);
    await home(second);
    await first.locator('.offline-controls summary').click();
    await second.getByRole('button', { name: 'Explore', exact: true }).click();
    for (const page of [first, second])
      await page.evaluate(() => {
        globalThis.productionDocumentMarker = 'old-document';
        globalThis.productionControllerChanges = 0;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          globalThis.productionControllerChanges += 1;
        });
      });
    server.setProductionRelease(prefix, releaseName('b'));
    await first.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration(
        location.href,
      );
      if (!registration) throw new Error('Actual registration missing');
      await registration.update();
    });
    await waitForWorker(first, 'waiting', 'installed');
    const waiting = await cacheComplete(
      first,
      b.descriptor,
      prefix,
      server.origin,
      'waiting',
      [a.descriptor.releaseId],
    );
    await assertStatus(first, 'controller', a.descriptor);
    await assertStatus(second, 'controller', a.descriptor);
    assert.equal((await registrationSnapshot(first)).waiting, 'installed');
    assert.equal(
      await first.evaluate(() => globalThis.productionControllerChanges),
      0,
      'Waiting must not automatically call skipWaiting',
    );
    assert.deepEqual(
      new Set(await cacheNames(first)),
      new Set(releaseCacheNames([old, waiting])),
    );
    for (const page of [first, second])
      await page.evaluate((shellId) => {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLIENT_RECOVERED',
          protocolVersion: 1,
          shellId,
        });
      }, a.descriptor.shellId);
    await cacheComplete(first, b.descriptor, prefix, server.origin, 'waiting', [
      a.descriptor.releaseId,
    ]);
    assert.deepEqual(
      new Set(await cacheNames(first)),
      new Set(releaseCacheNames([old, waiting])),
      'Repeated old-release recovery cannot delete the waiting future shell or its ownership record',
    );
    stage('waiting release survived repeated old recovery');
    for (const page of [first, second]) await observeActivation(page);
    try {
      await first.locator('[data-offline-action="update"]').click();
      await first
        .locator('[data-offline-update="blocked"]')
        .waitFor({ timeout });
    } catch (error) {
      console.error(
        `Production activation diagnostic ${prefix}: ${JSON.stringify(
          await Promise.all([first, second].map(activationDiagnostic)),
        )}`,
      );
      throw error;
    } finally {
      for (const page of [first, second])
        await page.evaluate(() =>
          globalThis.restoreProductionActivationObserver(),
        );
    }
    assert.equal(
      (await registrationSnapshot(first)).waiting,
      'installed',
      'One unready client must keep the new worker waiting',
    );
    await assertStatus(first, 'controller', a.descriptor);
    await assertStatus(second, 'controller', a.descriptor);
    for (const page of [first, second]) {
      assert.equal(
        await page.evaluate(() => globalThis.productionDocumentMarker),
        'old-document',
        'Unready update cannot force a mid-task document replacement',
      );
      assert.equal(
        await page.evaluate(() => globalThis.productionControllerChanges),
        0,
      );
    }
    await home(second);
    stage('unready client blocked activation');
    await second.evaluate(() => {
      const original = ServiceWorker.prototype.postMessage;
      ServiceWorker.prototype.postMessage = function (...args) {
        if (args[0]?.type !== 'UPDATE_READY') original.apply(this, args);
      };
      globalThis.restoreProductionReadiness = () => {
        ServiceWorker.prototype.postMessage = original;
      };
    });
    const beforeMissingAcknowledgement = Date.now();
    await first.locator('[data-offline-action="update"]').click();
    await first.locator('[data-offline-update="blocked"]').waitFor({ timeout });
    assert(
      Date.now() - beforeMissingAcknowledgement < 12_000,
      'A missing readiness acknowledgement must reach a bounded blocked outcome',
    );
    assert.equal((await registrationSnapshot(first)).waiting, 'installed');
    await assertStatus(first, 'controller', a.descriptor);
    await assertStatus(second, 'controller', a.descriptor);
    await second.evaluate(() => globalThis.restoreProductionReadiness());
    stage('missing acknowledgement blocked within bound');
    await second.evaluate(() => {
      const original = ServiceWorker.prototype.postMessage;
      globalThis.heldProductionFreeze = [];
      ServiceWorker.prototype.postMessage = function (...args) {
        if (args[0]?.type === 'UPDATE_FROZEN')
          globalThis.heldProductionFreeze.push({ worker: this, args });
        else original.apply(this, args);
      };
      globalThis.releaseProductionFreeze = () => {
        ServiceWorker.prototype.postMessage = original;
        for (const item of globalThis.heldProductionFreeze)
          original.apply(item.worker, item.args);
      };
    });
    await first.locator('[data-offline-action="update"]').click();
    await waitUntil(
      async () =>
        assert(
          await second.evaluate(
            () => globalThis.heldProductionFreeze.length > 0,
          ),
        ),
      'Freeze barrier reached before membership changes',
    );
    const lateClient = await context.newPage();
    await loadedShell(lateClient, appURL, a.descriptor, true);
    await waitForControl(lateClient);
    await second.evaluate(() => globalThis.releaseProductionFreeze());
    await first.locator('[data-offline-update="blocked"]').waitFor({ timeout });
    assert.equal(
      (await registrationSnapshot(first)).waiting,
      'installed',
      'A new native client between readiness phases must block activation',
    );
    await assertStatus(lateClient, 'controller', a.descriptor);
    assert.equal(
      await first.evaluate(() => globalThis.productionControllerChanges),
      0,
    );
    await lateClient.close();
    stage('new native client blocked activation');
    // Deliberately withhold one real recovery acknowledgement in the new document.
    // The production worker/lifecycle itself is neither replaced nor simulated.
    await second.addInitScript(() => {
      const original = ServiceWorker.prototype.postMessage;
      globalThis.heldProductionRecovery = [];
      ServiceWorker.prototype.postMessage = function (...args) {
        if (args[0]?.type === 'CLIENT_RECOVERED')
          globalThis.heldProductionRecovery.push({ worker: this, args });
        else original.apply(this, args);
      };
      globalThis.releaseProductionRecovery = () => {
        ServiceWorker.prototype.postMessage = original;
        for (const item of globalThis.heldProductionRecovery)
          original.apply(item.worker, item.args);
        return globalThis.heldProductionRecovery.length;
      };
    });
    await first.locator('[data-offline-action="update"]').click();
    for (const page of [first, second]) {
      await waitUntil(
        async () =>
          assert.equal(
            await page
              .locator('meta[name="math-adventure-shell"]')
              .getAttribute('content'),
            b.descriptor.shellId,
          ),
        'Both actual documents recover on the new coherent shell',
      );
      await waitForControl(page);
      await assertStatus(page, 'controller', b.descriptor);
      assert.equal(
        await page.evaluate(() => globalThis.productionDocumentMarker),
        undefined,
        'Successful explicit activation recovers each document',
      );
    }
    await waitUntil(
      async () =>
        assert(
          await second.evaluate(
            () => globalThis.heldProductionRecovery?.length > 0,
          ),
        ),
      'Missing recovery acknowledgement observed',
    );
    assert.deepEqual(
      new Set(await cacheNames(first)),
      new Set(releaseCacheNames([old, waiting])),
      'Old cache must survive until all required clients recover',
    );
    assert(
      (await second.evaluate(() => globalThis.releaseProductionRecovery())) > 0,
    );
    await waitUntil(
      async () =>
        assert.deepEqual(await cacheNames(first), releaseCacheNames([waiting])),
      'Old cache cleanup only after successful safe recovery',
    );
    await cacheComplete(
      first,
      b.descriptor,
      prefix,
      server.origin,
      'controller',
      [a.descriptor.releaseId],
    );
    await cacheComplete(
      second,
      b.descriptor,
      prefix,
      server.origin,
      'controller',
      [a.descriptor.releaseId],
    );

    // Reinstall the exact earlier artifacts, preserving their immutable IDs.
    // Historical ownership alone must never retire an identical future candidate.
    async function activateRepeatedRelease(descriptor, predecessor, candidate) {
      for (const page of [first, second]) await home(page);
      await first.locator('.offline-controls summary').click();
      await first
        .locator('[data-offline-update="waiting"]')
        .waitFor({ timeout });
      await first.locator('[data-offline-action="update"]').click();
      for (const page of [first, second]) {
        await waitUntil(
          async () =>
            assert.equal(
              await page
                .locator('meta[name="math-adventure-shell"]')
                .getAttribute('content'),
              descriptor.shellId,
            ),
          'Repeated artifact recovers both real documents',
        );
        await assertStatus(page, 'controller', descriptor);
      }
      await waitUntil(
        async () =>
          assert(
            await second.evaluate(
              () => globalThis.heldProductionRecovery?.length > 0,
            ),
          ),
        'Repeated artifact retains the deliberate recovery barrier',
      );
      assert.deepEqual(
        await cacheNames(first),
        releaseCacheNames([predecessor, candidate]),
        'Identical-release recovery retains the predecessor until every acknowledgement',
      );
      assert(
        (await second.evaluate(() => globalThis.releaseProductionRecovery())) >
          0,
      );
      await waitUntil(
        async () =>
          assert.deepEqual(
            await cacheNames(first),
            releaseCacheNames([candidate]),
          ),
        'Repeated artifact cleans only its recovered predecessor',
      );
    }
    server.setProductionRelease(prefix, releaseName('a'));
    await first.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration(
        location.href,
      );
      await registration.update();
    });
    await waitForWorker(first, 'waiting', 'installed');
    const repeatedA = await cacheComplete(
      first,
      a.descriptor,
      prefix,
      server.origin,
      'waiting',
      [b.descriptor.releaseId],
    );
    await activateRepeatedRelease(a.descriptor, waiting, repeatedA);
    server.setProductionRelease(prefix, releaseName('b'));
    await first.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration(
        location.href,
      );
      await registration.update();
    });
    await waitForWorker(first, 'waiting', 'installed');
    await cacheComplete(first, b.descriptor, prefix, server.origin, 'waiting', [
      a.descriptor.releaseId,
    ]);
    for (const page of [first, second])
      await page.evaluate((shellId) => {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLIENT_RECOVERED',
          protocolVersion: 1,
          shellId,
        });
      }, a.descriptor.shellId);
    await cacheComplete(first, b.descriptor, prefix, server.origin, 'waiting', [
      a.descriptor.releaseId,
    ]);
    assert.deepEqual(
      await cacheNames(first),
      releaseCacheNames([repeatedA, waiting]),
      'A repeated historical B release stays complete while it is a future waiting candidate',
    );
    await activateRepeatedRelease(b.descriptor, repeatedA, waiting);
    stage('identical A/B artifact reuse preserved future waiting release');

    observations.phase = 'partial-install';
    stage('both clients recovered before predecessor cleanup');
    server.setProductionRelease(prefix, releaseName('c'));
    const failedPath = `${prefix}index.html`;
    server.setFailedAsset(failedPath);
    const failedWorker = context.waitForEvent('serviceworker', { timeout });
    await first.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration(
        location.href,
      );
      if (!registration) throw new Error('Actual registration missing');
      registration.addEventListener(
        'updatefound',
        () => {
          const candidate = registration.installing;
          if (!candidate)
            throw new Error('Expected actual failed installation candidate');
          globalThis.failedProductionInstallState = candidate.state;
          candidate.addEventListener('statechange', () => {
            globalThis.failedProductionInstallState = candidate.state;
          });
        },
        { once: true },
      );
      await registration.update();
    });
    await failedWorker;
    await waitUntil(async () => {
      const snapshot = await registrationSnapshot(first);
      assert.equal(
        snapshot.waiting,
        null,
        'A partial required shell must not become waiting/ready',
      );
      assert.equal(snapshot.installing, null);
      assert(
        server
          .requestSnapshot()
          .some(
            (record) => record.path === failedPath && record.status === 404,
          ),
        'Required resource failure must be observed at the server',
      );
    }, 'Deliberately incomplete release must fail native installation');
    await waitUntil(
      async () =>
        assert.equal(
          await first.evaluate(() => globalThis.failedProductionInstallState),
          'redundant',
        ),
      'Failed candidate becomes natively redundant',
    );
    await assertStatus(first, 'controller', b.descriptor);
    assert.deepEqual(
      await cacheNames(first),
      releaseCacheNames([waiting]),
      'Failed partial install removes only its partial cache and preserves the old release',
    );
    observations.phase = 'old-release-offline';
    await bounded(
      proxy.setOffline(true),
      'establish survivor offline transport gate',
      5_000,
    );
    await context.setOffline(true);
    const beforeOldOffline = server.requestCount();
    const survivor = await first.reload({ waitUntil: 'networkidle', timeout });
    assert.equal(survivor?.status(), 200);
    assert.equal(survivor?.fromServiceWorker(), true);
    assert.equal(
      await first
        .locator('meta[name="math-adventure-shell"]')
        .getAttribute('content'),
      b.descriptor.shellId,
    );
    await cacheComplete(
      first,
      b.descriptor,
      prefix,
      server.origin,
      'controller',
      [a.descriptor.releaseId],
    );
    assert.equal(
      server.requestCount(),
      beforeOldOffline,
      'The existing release must remain actually usable offline after failure',
    );
    const servedSurvivorBodies = await assertServedBodies(
      bodyRecords,
      b.descriptor,
      prefix,
      server.origin,
      'old-release-offline',
    );
    stage('partial install rejected; surviving offline bodies verified');
    await context.setOffline(false);
    await proxy.setOffline(false);
    server.setFailedAsset(null);
    // Only this independently observed deliberate 404 is removed from the clean
    // positive-path ledger; all unrelated errors still fail the proof.
    const unexpected = {
      ...observations,
      responses: observations.responses.filter(
        (response) =>
          !(
            response.phase === 'partial-install' &&
            response.path === failedPath &&
            response.status === 404
          ),
      ),
      failures: observations.failures.filter(
        (failure) =>
          !(
            failure.phase === 'uncached-offline-negative' &&
            failure.path === uncachedPath &&
            ['net::ERR_INTERNET_DISCONNECTED', 'net::ERR_FAILED'].includes(
              failure.error,
            )
          ),
      ),
      consoleErrors: observations.consoleErrors.filter(
        (error) =>
          !(
            error.phase === 'uncached-offline-negative' &&
            error.path === uncachedPath &&
            error.source === 'page' &&
            /^Failed to load resource: net::ERR_(?:INTERNET_DISCONNECTED|FAILED)$/.test(
              error.text,
            )
          ),
      ),
    };
    assertCleanObservations(unexpected);
    assert.equal(proxy.droppedObservationCount(), 0);
    assert(
      proxy
        .snapshot()
        .every(
          (record) =>
            record.outcome !== 'rejected' ||
            (record.method === 'CONNECT' &&
              ['[owned-loopback-connect]', '[forbidden-connect]'].includes(
                record.path,
              )),
        ),
      'Only explicitly TCP-denied native CONNECT attempts may accompany clean application request evidence',
    );
    assert(
      proxy
        .snapshot()
        .filter((record) => record.outcome === 'offline')
        .every(
          (record) =>
            record.path === `${prefix}sw.js` || record.path === uncachedPath,
        ),
      'Only explicitly observed native control-plane refresh or the uncached negative probe may reach the offline transport gate',
    );
    return {
      firstInstallComplete: true,
      declaredRequiredResources: a.descriptor.essential.length,
      cacheBytesIndependentlyHashed: true,
      actualOfflineServedBodiesIndependentlyHashed: servedOfflineBodies,
      actualSurvivingOfflineServedBodiesIndependentlyHashed:
        servedSurvivorBodies,
      exactReleaseOwnershipMetadataInspected: true,
      repeatedImmutableArtifactLifecycle: true,
      distinctNativeClients: 2,
      offlineReloadFromDeclaredShell: true,
      newOfflineDocument: true,
      offlinePrototypeLocales: ['el-GR', 'en-GB', 'de-DE'],
      offlineProofOriginRequestReceipts: 0,
      nativeOfflineAndOwnedTransportGate: true,
      uncachedOfflineFetchFailed: true,
      separateContextRemainedOnline: true,
      blockedNativeControlPlanePaths: [
        ...new Set(
          proxy
            .snapshot()
            .filter(
              (record) =>
                record.outcome === 'offline' &&
                record.path === `${prefix}sw.js`,
            )
            .map((record) => record.path),
        ),
      ],
      actualCrossOriginProbeRequests: probe.count(),
      rejectedNativeConnectAttempts: {
        ownedLoopback: proxy
          .snapshot()
          .filter(
            (record) =>
              record.outcome === 'rejected' &&
              record.path === '[owned-loopback-connect]',
          ).length,
        external: proxy
          .snapshot()
          .filter(
            (record) =>
              record.outcome === 'rejected' &&
              record.path === '[forbidden-connect]',
          ).length,
        forwarded: 0,
      },
      crossOriginResponseExcluded: true,
      waitingWithOldActiveController: true,
      unreadyClientPreventedActivation: true,
      missingReadinessAcknowledgementBlockedWithinBound: true,
      changedNativeClientMembershipPreventedActivation: true,
      noMidTaskForcedReload: true,
      explicitAllReadyActivation: true,
      coherentlyRecoveredClients: 2,
      missingRecoveryAcknowledgementPreservedOldCache: true,
      cleanupAfterAllClientRecovery: true,
      repeatedOldRecoveryPreservedWaitingRelease: true,
      requiredResourceFailure: failedPath,
      failedInstallNeverReady: true,
      existingReleaseStillUsableOffline: true,
      unexpectedConsoleScriptOrNetworkErrors: 0,
    };
  } finally {
    stage('owned cleanup begins');
    try {
      await bounded(context.close(), 'owned browser context close');
    } finally {
      server.setFailedAsset(null);
      try {
        await bounded(proxy.close(), 'owned proxy close', 5_000);
      } finally {
        await bounded(probe.close(), 'owned cross-origin probe close', 5_000);
      }
    }
    stage('owned cleanup complete');
  }
}
