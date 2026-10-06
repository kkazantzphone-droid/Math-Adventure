import { ShellWorker, type ShellClient } from './shell-worker';
import { withNativeCacheLock } from './cache-lock';

interface LifecycleEvent {
  waitUntil(work: Promise<unknown>): void;
}

interface WorkerMessageEvent extends LifecycleEvent {
  readonly data: unknown;
  readonly source: unknown;
  readonly ports: readonly MessagePort[];
}

interface WorkerFetchEvent extends LifecycleEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}

interface WorkerScope {
  readonly __MATH_ADVENTURE_RELEASE__: unknown;
  readonly location: { readonly origin: string };
  readonly registration: {
    readonly scope: string;
    readonly installing: ServiceWorker | null;
    readonly waiting: ServiceWorker | null;
  };
  readonly clients: {
    matchAll(options: {
      readonly type: 'window';
      readonly includeUncontrolled: true;
    }): Promise<readonly ShellClient[]>;
    get(id: string): Promise<ShellClient | undefined>;
    claim(): Promise<void>;
  };
  readonly caches: CacheStorage;
  readonly crypto: Crypto;
  readonly serviceWorker?: { readonly state: string };
  readonly navigator?: { readonly locks?: LockManager };
  fetch(request: Request): Promise<Response>;
  skipWaiting(): Promise<void>;
  addEventListener(
    type: 'install' | 'activate',
    listener: (event: LifecycleEvent) => void,
  ): void;
  addEventListener(
    type: 'message',
    listener: (event: WorkerMessageEvent) => void,
  ): void;
  addEventListener(
    type: 'fetch',
    listener: (event: WorkerFetchEvent) => void,
  ): void;
}

const scope = globalThis as unknown as WorkerScope;
const worker = new ShellWorker(scope.__MATH_ADVENTURE_RELEASE__, {
  origin: scope.location.origin,
  scope: scope.registration.scope,
  caches: scope.caches,
  withCacheLock: (name, operation) =>
    withNativeCacheLock(scope.navigator?.locks, name, operation),
  clients: {
    matchAll: () =>
      scope.clients.matchAll({ type: 'window', includeUncontrolled: true }),
    get: (id) => scope.clients.get(id),
    claim: () => scope.clients.claim(),
  },
  fetch: (request) => scope.fetch(request),
  async digest(body) {
    const bytes = new Uint8Array(
      await scope.crypto.subtle.digest('SHA-256', body),
    );
    return [...bytes]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  },
  token: () => scope.crypto.randomUUID(),
  state: () => scope.serviceWorker?.state ?? 'unknown',
  hasStagedWorker: () =>
    scope.registration.installing !== null ||
    scope.registration.waiting !== null,
  schedule(milliseconds, callback) {
    const timer = globalThis.setTimeout(callback, milliseconds);
    return () => globalThis.clearTimeout(timer);
  },
  skipWaiting: () => scope.skipWaiting(),
});

scope.addEventListener('install', (event) => event.waitUntil(worker.install()));
scope.addEventListener('activate', (event) =>
  event.waitUntil(worker.activate()),
);
scope.addEventListener('message', (event) => {
  event.waitUntil(worker.message(event.data, event.source, event.ports[0]));
});
scope.addEventListener('fetch', (event) => {
  event.respondWith(
    worker
      .responseFor(event.request)
      .then((response) => response ?? scope.fetch(event.request)),
  );
});
