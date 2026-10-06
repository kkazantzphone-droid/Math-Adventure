// TEST-ONLY synthetic lifecycle fixture. Never imported by the application.
// The harness supplies a MessagePort and controls every install/update/reload.
const VERSION = 'v2';
const SCOPE = self.registration.scope;
const FIXTURE_URLS = [SCOPE, new URL('index.html', SCOPE).href];
const CACHE_PREFIX = `math-adventure-test-only-browser-proof:${new URL(SCOPE).pathname}:`;
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;

let releaseInstall;
const installGate = new Promise((resolve) => {
  releaseInstall = resolve;
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    installGate.then(async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const url of FIXTURE_URLS) {
        const response = await fetch(new Request(url, { cache: 'no-store' }));
        if (!response.ok || response.type !== 'basic') {
          throw new Error('TEST-ONLY fixture HTML could not be fetched');
        }
        const headers = new Headers(response.headers);
        headers.set('X-Browser-Proof-Version', VERSION);
        await cache.put(
          url,
          new Response(await response.arrayBuffer(), {
            status: response.status,
            statusText: response.statusText,
            headers,
          }),
        );
      }
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) {
          await caches.delete(name);
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  if (
    event.request.method !== 'GET' ||
    event.request.mode !== 'navigate' ||
    !FIXTURE_URLS.includes(event.request.url)
  ) {
    return;
  }
  event.respondWith(
    (async () => {
      const response = await (
        await caches.open(CACHE_NAME)
      ).match(event.request);
      return (
        response ??
        new Response('TEST-ONLY fixture cache is missing', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      );
    })(),
  );
});

self.addEventListener('message', (event) => {
  const type = event.data?.type;
  const reply = (data) =>
    event.ports[0]?.postMessage({
      fixture: 'synthetic-test-only',
      type,
      version: VERSION,
      scope: SCOPE,
      cacheName: CACHE_NAME,
      ...data,
    });
  if (!event.source || !FIXTURE_URLS.includes(event.source.url)) {
    reply({ ok: false, error: 'fixture-source-required' });
    return;
  }
  if (type === 'RELEASE_INSTALL') {
    releaseInstall();
    reply({ ok: true });
  } else if (type === 'ACTIVATE_TEST_UPDATE') {
    event.waitUntil(self.skipWaiting().then(() => reply({ ok: true })));
  } else if (type === 'GET_CLIENT_IDS') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) =>
        reply({
          ok: true,
          clients: clients
            .filter((client) => FIXTURE_URLS.includes(client.url))
            .map((client) => ({ id: client.id, url: client.url }))
            .sort((first, second) => first.id.localeCompare(second.id)),
        }),
      ),
    );
  } else if (type === 'GET_TEST_STATUS') {
    event.waitUntil(
      (async () => {
        const exists = (await caches.keys()).includes(CACHE_NAME);
        const keys = exists ? await (await caches.open(CACHE_NAME)).keys() : [];
        reply({
          ok: true,
          cachedURLs: keys.map((request) => request.url).sort(),
        });
      })(),
    );
  } else {
    reply({ ok: false, error: 'unknown-test-message' });
  }
});
