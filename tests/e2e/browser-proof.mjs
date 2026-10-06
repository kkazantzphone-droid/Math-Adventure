// Actual-browser assertions; this is neither a mock nor production PWA code.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assertCleanObservations } from '../../scripts/browser-proof/evidence.mjs';

const timeout = 15_000;

export async function newObservedContext(
  browser,
  server,
  { allowedProbeURL, proxyServer, captureResponseBodies = false } = {},
) {
  const context = await browser.newContext({
    serviceWorkers: 'allow',
    acceptDownloads: false,
    ...(proxyServer
      ? { proxy: { server: proxyServer, bypass: '<-loopback>' } }
      : {}),
  });
  const observations = {
    phase: 'online',
    failures: [],
    responses: [],
    consoleErrors: [],
    pageErrors: [],
    externalAttempts: [],
  };
  const requestPhases = new WeakMap();
  const bodyRecords = [];
  context.on('request', (request) =>
    requestPhases.set(request, observations.phase),
  );
  context.on('requestfailed', (request) => {
    observations.failures.push({
      path: new URL(request.url()).pathname,
      error: request.failure()?.errorText,
      phase: requestPhases.get(request) ?? observations.phase,
    });
  });
  context.on('response', (response) => {
    const phase = requestPhases.get(response.request()) ?? observations.phase;
    observations.responses.push({
      path: new URL(response.url()).pathname,
      status: response.status(),
      worker: response.fromServiceWorker(),
      phase,
    });
    if (
      captureResponseBodies &&
      ['offline-production', 'old-release-offline'].includes(phase)
    ) {
      const url = new URL(response.url());
      bodyRecords.push(
        response
          .body()
          .then((body) => ({
            phase,
            origin: url.origin,
            path: url.pathname,
            status: response.status(),
            worker: response.fromServiceWorker(),
            bytes: body.byteLength,
            sha256: createHash('sha256').update(body).digest('hex'),
          }))
          .catch(() => ({
            phase,
            origin: url.origin,
            path: url.pathname,
            error: 'Response body unavailable',
          })),
      );
    }
  });
  context.on('page', (page) => {
    page.on('console', (message) => {
      if (message.type() === 'error') {
        const url = message.location().url;
        const path = url ? new URL(url).pathname : null;
        const correlated =
          observations.failures.findLast((failure) => failure.path === path) ??
          observations.responses.findLast(
            (response) => response.path === path && response.status >= 400,
          );
        observations.consoleErrors.push({
          text: message.text(),
          path,
          source: 'page',
          phase: correlated?.phase ?? observations.phase,
        });
      }
    });
    page.on('pageerror', (error) =>
      observations.pageErrors.push(error.message),
    );
  });
  // Continue real same-origin traffic. Offline failures are decided by Chromium.
  context.on('serviceworker', (worker) => {
    worker.on('console', (message) => {
      if (message.type() === 'error')
        observations.consoleErrors.push({
          text: message.text(),
          path: new URL(worker.url()).pathname,
          source: 'worker',
          phase: observations.phase,
        });
    });
  });
  // This also disables HTTP cache, avoiding a false no-worker offline success.
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== server.origin && url.href !== allowedProbeURL) {
      observations.externalAttempts.push(url.origin);
      await route.abort('blockedbyclient');
    } else await route.continue();
  });
  return { context, observations, bodyRecords };
}

async function loadWorkerlessFixture(page, url) {
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout });
  assert(response, 'Online navigation must produce a response');
  assert.equal(response.status(), 200);
  assert.equal(response.fromServiceWorker(), false);
  await page.locator('main').waitFor({ timeout });
  assert(
    await page.locator('main').innerText(),
    'Actual workerless negative-control fixture must render',
  );
}

export async function registrationSnapshot(page) {
  return page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const registration = await navigator.serviceWorker.getRegistration(
      location.href,
    );
    return {
      registrations: registrations.length,
      scope: registration?.scope ?? null,
      installing: registration?.installing?.state ?? null,
      waiting: registration?.waiting?.state ?? null,
      active: registration?.active?.state ?? null,
      controller: navigator.serviceWorker.controller?.state ?? null,
    };
  });
}

async function sendWorkerMessage(page, role, type) {
  return page.evaluate(
    async ({ role, type }) => {
      const registration = await navigator.serviceWorker.getRegistration(
        location.href,
      );
      const worker =
        role === 'controller'
          ? navigator.serviceWorker.controller
          : registration?.[role];
      if (!worker) throw new Error(`Missing actual ${role} worker`);
      return new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => {
          channel.port1.close();
          reject(new Error(`No fixture reply: ${type}`));
        }, 5000);
        channel.port1.onmessage = (event) => {
          clearTimeout(timer);
          channel.port1.close();
          resolve(event.data);
        };
        worker.postMessage({ type }, [channel.port2]);
      });
    },
    { role, type },
  );
}

export async function waitForWorker(page, role, state) {
  await page.evaluate(async () => {
    globalThis.proofRegistration =
      await navigator.serviceWorker.getRegistration(location.href);
  });
  await page.waitForFunction(
    ({ role, state }) => globalThis.proofRegistration?.[role]?.state === state,
    { role, state },
    { timeout, polling: 100 },
  );
}

export async function waitForControl(page) {
  await page.waitForFunction(
    () => navigator.serviceWorker.controller?.state === 'activated',
    undefined,
    { timeout, polling: 100 },
  );
}

async function status(page, expectedVersion) {
  const value = await sendWorkerMessage(page, 'controller', 'GET_TEST_STATUS');
  assert.equal(value.ok, true);
  assert.equal(value.fixture, 'synthetic-test-only');
  assert.equal(value.version, expectedVersion);
  return value;
}

async function proveNoWorker(browser, server, prefix) {
  const { context, observations } = await newObservedContext(browser, server);
  const control = await newObservedContext(browser, server);
  try {
    const first = await context.newPage();
    const second = await context.newPage();
    const onlineControl = await control.context.newPage();
    const controlPath = `${prefix}__browser-proof/no-worker.html`;
    const appUrl = `${server.origin}${controlPath}`;
    await loadWorkerlessFixture(first, appUrl);
    await loadWorkerlessFixture(second, appUrl);
    await loadWorkerlessFixture(onlineControl, appUrl);
    assert.equal(context.pages().length, 2);
    assert.notEqual(first, second);
    await first.evaluate(() => {
      globalThis.proofTab = 'first';
    });
    await second.evaluate(() => {
      globalThis.proofTab = 'second';
    });
    assert.equal(await first.evaluate(() => globalThis.proofTab), 'first');
    assert.equal(await second.evaluate(() => globalThis.proofTab), 'second');
    const noWorker = await registrationSnapshot(first);
    assert.equal(noWorker.registrations, 0);
    assert.equal(noWorker.controller, null);
    assert.equal(context.serviceWorkers().length, 0);

    const missingPath = `${prefix}deliberately-missing-proof-asset.js`;
    observations.phase = 'missing-asset';
    const missing = await first.evaluate(async (path) => {
      const response = await fetch(path, { cache: 'no-store' });
      return { status: response.status, ok: response.ok };
    }, missingPath);
    assert.deepEqual(missing, { status: 404, ok: false });
    assert(
      observations.responses.some(
        (item) => item.path === missingPath && item.status === 404,
      ),
    );
    assert(
      server
        .requestSnapshot()
        .some((item) => item.path === missingPath && item.status === 404),
    );

    observations.phase = 'offline';
    const beforeOffline = server.requestCount();
    await context.setOffline(true);
    assert.equal(await first.evaluate(() => navigator.onLine), false);
    const uncachedFailure = await first.evaluate(async (path) => {
      try {
        await fetch(`${path}?offline-proof=1`, { cache: 'no-store' });
        return false;
      } catch {
        return true;
      }
    }, controlPath);
    assert.equal(
      uncachedFailure,
      true,
      'Offline same-origin network request must fail',
    );
    await assert.rejects(
      first.reload({ waitUntil: 'domcontentloaded', timeout }),
      /net::ERR_INTERNET_DISCONNECTED/,
    );
    await assert.rejects(
      second.reload({ waitUntil: 'domcontentloaded', timeout }),
      /net::ERR_INTERNET_DISCONNECTED/,
    );
    assert.equal(
      server.requestCount(),
      beforeOffline,
      'Offline traffic must not reach the live server',
    );
    assert(
      observations.failures.filter(
        (item) => item.error === 'net::ERR_INTERNET_DISCONNECTED',
      ).length >= 3,
    );
    await loadWorkerlessFixture(onlineControl, appUrl);
    assert.equal(
      await onlineControl.evaluate(() => navigator.onLine),
      true,
      'Separate online context remains online',
    );

    await context.setOffline(false);
    observations.phase = 'recovery';
    await loadWorkerlessFixture(first, appUrl);
    await loadWorkerlessFixture(second, appUrl);
    const recovery = await first.reload({ waitUntil: 'networkidle', timeout });
    assert.equal(recovery?.status(), 200);
    assert.equal(await first.evaluate(() => navigator.onLine), true);
    assert.equal((await registrationSnapshot(first)).registrations, 0);
    assertCleanObservations(observations, {
      missingPath,
      offlinePaths: [controlPath],
    });
    assertCleanObservations(control.observations);
    return {
      onlineWorkerlessFixtureLoad: true,
      distinctPageDocuments: 2,
      registrations: 0,
      missingAssetDetected: 404,
      nativeOfflineFetchFailed: true,
      nativeOfflineReloadsFailed: 2,
      offlineServerRequests: 0,
      separateContextRemainedOnline: true,
      onlineReloadRecovered: true,
      unexpectedConsoleOrScriptErrors: 0,
    };
  } finally {
    try {
      await context.close();
    } finally {
      await control.context.close();
    }
  }
}

async function proveFixture(browser, server, prefix) {
  server.setFixtureVersion('v1');
  const { context, observations } = await newObservedContext(browser, server);
  try {
    const first = await context.newPage();
    const second = await context.newPage();
    const fixtureUrl = `${server.origin}${prefix}__browser-proof/`;
    await first.goto(fixtureUrl, { waitUntil: 'networkidle', timeout });
    await second.goto(fixtureUrl, { waitUntil: 'networkidle', timeout });
    const scope = await first.evaluate(async () => {
      const registration = await navigator.serviceWorker.register(
        new URL('sw.js', location.href),
        {
          scope: new URL('./', location.href).href,
          updateViaCache: 'none',
        },
      );
      return registration.scope;
    });
    assert.equal(
      scope,
      fixtureUrl,
      'Worker scope must stay inside test fixtures',
    );
    await waitForWorker(first, 'installing', 'installing');
    const installation = await registrationSnapshot(first);
    assert.equal(installation.installing, 'installing');
    assert.equal(installation.active, null);
    const installReply = await sendWorkerMessage(
      first,
      'installing',
      'RELEASE_INSTALL',
    );
    assert.equal(installReply.version, 'v1');
    await waitForWorker(first, 'active', 'activated');
    await waitForControl(first);
    await waitForControl(second);
    const v1 = await status(first, 'v1');
    assert.equal((await status(second, 'v1')).scope, fixtureUrl);
    const clients = await sendWorkerMessage(first, 'active', 'GET_CLIENT_IDS');
    assert.equal(clients.clients.length, 2);
    assert.equal(
      new Set(clients.clients.map((client) => client.id)).size,
      2,
      'Two actual controlled client IDs required',
    );
    assert(clients.clients.every((client) => client.url === fixtureUrl));
    const cache = await first.evaluate(async (name) => {
      const names = await caches.keys();
      const selected = await caches.open(name);
      return {
        names,
        paths: (await selected.keys())
          .map((request) => new URL(request.url).pathname)
          .sort(),
      };
    }, v1.cacheName);
    assert.deepEqual(cache.names, [v1.cacheName]);
    assert.equal(cache.paths.length, 2);
    assert(
      cache.paths.every((path) => path.startsWith(`${prefix}__browser-proof/`)),
    );

    observations.phase = 'offline';
    const beforeOffline = server.requestCount();
    await context.setOffline(true);
    const offline = await first.reload({ waitUntil: 'networkidle', timeout });
    assert.equal(offline?.status(), 200);
    assert.equal(offline?.fromServiceWorker(), true);
    assert.equal(offline?.headers()['x-browser-proof-version'], 'v1');
    assert.equal(await first.evaluate(() => navigator.onLine), false);
    assert.equal(
      server.requestCount(),
      beforeOffline,
      'Fixture offline reload must use cache',
    );
    const restarted = await context.newPage();
    const restartedResponse = await restarted.goto(fixtureUrl, {
      waitUntil: 'networkidle',
      timeout,
    });
    assert.equal(
      restartedResponse?.fromServiceWorker(),
      true,
      'New offline document must be served by active worker',
    );
    assert.equal(restartedResponse?.headers()['x-browser-proof-version'], 'v1');
    await restarted.close();
    await context.setOffline(false);
    observations.phase = 'recovery';

    for (const page of [first, second]) {
      await page.evaluate(() => {
        globalThis.proofControllerChanges = 0;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          globalThis.proofControllerChanges += 1;
        });
      });
    }
    server.setFixtureVersion('v2');
    await first.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration(
        location.href,
      );
      if (!registration) throw new Error('Registration lost');
      await registration.update();
    });
    await waitForWorker(first, 'installing', 'installing');
    assert.equal((await registrationSnapshot(first)).active, 'activated');
    assert.equal(
      (await sendWorkerMessage(first, 'installing', 'RELEASE_INSTALL')).version,
      'v2',
    );
    await waitForWorker(first, 'waiting', 'installed');
    const waiting = await registrationSnapshot(first);
    assert.equal(waiting.waiting, 'installed', JSON.stringify(waiting));
    assert.equal(waiting.active, 'activated');
    await status(first, 'v1');
    await status(second, 'v1');
    assert.equal(
      await first.evaluate(() => globalThis.proofControllerChanges),
      0,
      'Waiting update cannot activate itself',
    );
    assert.equal(
      await second.evaluate(() => globalThis.proofControllerChanges),
      0,
    );
    assert.equal(
      (await sendWorkerMessage(first, 'waiting', 'ACTIVATE_TEST_UPDATE'))
        .version,
      'v2',
    );
    for (const page of [first, second]) {
      await page.waitForFunction(
        () => globalThis.proofControllerChanges === 1,
        undefined,
        { timeout, polling: 100 },
      );
      await waitForControl(page);
      await status(page, 'v2');
      const response = await page.reload({ waitUntil: 'networkidle', timeout });
      assert.equal(response?.fromServiceWorker(), true);
      assert.equal(response?.headers()['x-browser-proof-version'], 'v2');
      await status(page, 'v2');
    }
    const v2 = await status(first, 'v2');
    assert.deepEqual(await first.evaluate(() => caches.keys()), [v2.cacheName]);
    const finalClients = await sendWorkerMessage(
      first,
      'active',
      'GET_CLIENT_IDS',
    );
    assert.equal(
      new Set(finalClients.clients.map((client) => client.id)).size,
      2,
    );
    assertCleanObservations(observations, {
      offlinePaths: [
        `${prefix}__browser-proof/`,
        `${prefix}__browser-proof/sw.js`,
      ],
    });
    return {
      fixtureOnlyScope: `${prefix}__browser-proof/`,
      installingObserved: true,
      activeAndControlledObserved: true,
      distinctControlledClients: 2,
      cacheStorageInspected: true,
      cachedOfflineReload: true,
      newOfflineDocument: true,
      waitingObservedWithOldController: true,
      explicitUpdateActivation: true,
      controllerChangesBeforeRecovery: 2,
      recoveredClientsOnV2: 2,
      unexpectedConsoleOrScriptErrors: 0,
    };
  } finally {
    await context.close();
  }
}

export async function runBrowserProof(browser, server, prefix) {
  assert(['/', '/math-adventure/'].includes(prefix));
  return {
    prefix,
    noWorkerNegativeControl: await proveNoWorker(browser, server, prefix),
    lifecycleFixture: await proveFixture(browser, server, prefix),
  };
}
