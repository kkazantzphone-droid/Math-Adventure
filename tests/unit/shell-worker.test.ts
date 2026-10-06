import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  isAppClientURL,
  parseShellRelease,
  parseShellOwnership,
  sameClientSet,
  shellCachePrefix,
  validateAppScope,
  type ActivationResult,
  type ShellRelease,
} from '../../src/infrastructure/offline/shell-policy';
import {
  ShellWorker,
  type ShellClient,
  type ShellWorkerEnvironment,
} from '../../src/infrastructure/offline/shell-worker';

function hash(value: string | ArrayBuffer): string {
  return createHash('sha256')
    .update(typeof value === 'string' ? value : new Uint8Array(value))
    .digest('hex');
}

function release(version = '1'): ShellRelease {
  return {
    protocolVersion: 1,
    releaseId: `sha256-${version.repeat(64)}`,
    shellId: version.repeat(64),
    schemaVersion: 1,
    compatibleSchema: { min: 1, max: 1 },
    prototypeLocales: ['el-GR', 'en-GB', 'de-DE'],
    essential: ['assets/main.js', 'index.html'].map((path) => {
      const body = `synthetic ${version} ${path}`;
      return { path, sha256: hash(body), bytes: Buffer.byteLength(body) };
    }),
  };
}

function response(body: string, url: string, status = 200): Response {
  const value = new Response(body, { status });
  Object.defineProperty(value, 'url', { value: url });
  return value;
}

function copy(value: Response): Response {
  const cloned = value.clone();
  Object.defineProperty(cloned, 'url', { value: value.url });
  return cloned;
}

class SyntheticCache {
  readonly members = new Map<string, Response>();
  failPut = false;

  match(input: RequestInfo | URL): Promise<Response | undefined> {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const found = this.members.get(url);
    return Promise.resolve(found === undefined ? undefined : copy(found));
  }

  put(input: RequestInfo | URL, value: Response): Promise<void> {
    if (this.failPut) return Promise.reject(new Error('SYNTHETIC_QUOTA'));
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    this.members.set(url, copy(value));
    return Promise.resolve();
  }

  keys(): Promise<Request[]> {
    return Promise.resolve(
      [...this.members.keys()].map((url) => new Request(url)),
    );
  }
}

class SyntheticClient implements ShellClient {
  readonly type = 'window';
  readonly messages: unknown[] = [];
  onMessage: (value: unknown) => void = () => {};

  constructor(
    readonly id: string,
    readonly url: string,
  ) {}

  postMessage(value: unknown): void {
    this.messages.push(value);
    this.onMessage(value);
  }
}

function setup(version = '1', scope = 'https://synthetic.invalid/') {
  const descriptor = release(version);
  const cacheSets = new Map<string, SyntheticCache>();
  const clients = [
    new SyntheticClient('synthetic-client-a', scope),
    new SyntheticClient('synthetic-client-b', `${scope}?lang=de`),
  ];
  const requests: Request[] = [];
  const deleted: string[] = [];
  let skipped = 0;
  let claimed = 0;
  let state = 'installed';
  let timer: () => void = () => {};
  let fetchResource = (request: Request) => {
    const path = request.url.slice(scope.length);
    return Promise.resolve(
      response(`synthetic ${version} ${path}`, request.url),
    );
  };
  const environment: ShellWorkerEnvironment = {
    origin: new URL(scope).origin,
    scope,
    withCacheLock: (_name, operation) => operation(),
    caches: {
      open(name) {
        let cache = cacheSets.get(name);
        if (cache === undefined) {
          cache = new SyntheticCache();
          cacheSets.set(name, cache);
        }
        return Promise.resolve(cache as unknown as Cache);
      },
      keys: () => Promise.resolve([...cacheSets.keys()]),
      delete(name) {
        deleted.push(name);
        return Promise.resolve(cacheSets.delete(name));
      },
    },
    clients: {
      matchAll: () => Promise.resolve([...clients]),
      get: (id) => Promise.resolve(clients.find((client) => client.id === id)),
      claim() {
        claimed += 1;
        state = 'activated';
        return Promise.resolve();
      },
    },
    fetch(request) {
      requests.push(request);
      return fetchResource(request);
    },
    digest: (body) => Promise.resolve(hash(body)),
    token: () => 'synthetic-attempt-token',
    state: () => state,
    hasStagedWorker: () => false,
    schedule(_milliseconds, callback) {
      timer = callback;
      return () => {
        timer = () => {};
      };
    },
    skipWaiting() {
      skipped += 1;
      return Promise.resolve();
    },
  };
  const worker = new ShellWorker(descriptor, environment);
  return {
    worker,
    environment,
    clients,
    requests,
    deleted,
    cacheSets,
    descriptor,
    skipped: () => skipped,
    claimed: () => claimed,
    timeout: () => timer(),
    setState: (value: string) => {
      state = value;
    },
    setFetch: (implementation: typeof fetchResource) => {
      fetchResource = implementation;
    },
  };
}

async function activation(
  worker: ShellWorker,
  client: ShellClient,
): Promise<ActivationResult> {
  let result: ActivationResult | null = null;
  await worker.message(
    { type: 'REQUEST_ACTIVATION', protocolVersion: 1 },
    client,
    {
      postMessage: (value) => {
        result = value as ActivationResult;
      },
    },
  );
  if (result === null) throw new Error('SYNTHETIC_RESULT_MISSING');
  return result;
}

function automaticReplies(
  worker: ShellWorker,
  clients: readonly SyntheticClient[],
  ready = true,
) {
  for (const client of clients) {
    client.onMessage = (value) => {
      const message = value as {
        type: string;
        protocolVersion: number;
        releaseId: string;
        attemptId: string;
      };
      const type = {
        PREPARE_UPDATE: 'UPDATE_READY',
        FREEZE_UPDATE: 'UPDATE_FROZEN',
        ACTIVATING_UPDATE: 'UPDATE_ACTIVATING',
      }[message.type];
      if (type !== undefined) {
        queueMicrotask(() => {
          void worker.message({ ...message, type, ready }, client);
        });
      }
    };
  }
}

describe('strict static shell policy', () => {
  it('copies bounded metadata and freezes all nested release data', () => {
    const source = release();
    const parsed = parseShellRelease(source);
    expect(parsed).toEqual(source);
    expect(parsed).not.toBe(source);
    expect(Object.isFrozen(parsed.essential[0])).toBe(true);
    expect(Object.isFrozen(parsed.compatibleSchema)).toBe(true);
  });

  it.each([
    ['unknown field', { ...release(), learner: 'synthetic' }],
    ['wrong schema', { ...release(), schemaVersion: 2 }],
    [
      'wrong compatibility',
      { ...release(), compatibleSchema: { min: 1, max: 2 } },
    ],
    [
      'wrong locale completeness',
      { ...release(), prototypeLocales: ['en-GB'] },
    ],
    [
      'external path',
      {
        ...release(),
        essential: [
          {
            path: 'https://external.invalid/a',
            sha256: '1'.repeat(64),
            bytes: 1,
          },
        ],
      },
    ],
    [
      'traversal path',
      {
        ...release(),
        essential: [
          { path: '../index.html', sha256: '1'.repeat(64), bytes: 1 },
        ],
      },
    ],
    [
      'query path',
      {
        ...release(),
        essential: [
          {
            path: 'index.html?learner=synthetic',
            sha256: '1'.repeat(64),
            bytes: 1,
          },
        ],
      },
    ],
    ['missing index', { ...release(), essential: [release().essential[0]] }],
    [
      'duplicate path',
      {
        ...release(),
        essential: [
          release().essential[0],
          release().essential[0],
          release().essential[1],
        ],
      },
    ],
    [
      'unbounded bytes',
      {
        ...release(),
        essential: [
          {
            path: 'index.html',
            sha256: '1'.repeat(64),
            bytes: 10 * 1024 * 1024 + 1,
          },
        ],
      },
    ],
  ])('rejects %s', (_name, value) => {
    expect(() => parseShellRelease(value)).toThrow();
  });

  it('separates root/subpath cache ownership and excludes cross-origin clients', () => {
    const root = validateAppScope(
      'https://synthetic.invalid/',
      'https://synthetic.invalid',
    );
    const sub = validateAppScope(
      'https://synthetic.invalid/math-adventure/',
      'https://synthetic.invalid',
    );
    expect(shellCachePrefix(root)).not.toBe(shellCachePrefix(sub));
    expect(isAppClientURL('https://outside.invalid/math-adventure/', sub)).toBe(
      false,
    );
    expect(
      isAppClientURL('https://synthetic.invalid/math-adventure-x/', sub),
    ).toBe(false);
    expect(() =>
      validateAppScope('https://outside.invalid/', root.origin),
    ).toThrow();
  });

  it('requires the entire nonempty bounded distinct native client set', () => {
    expect(sameClientSet(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(sameClientSet(['a'], ['a', 'new'])).toBe(false);
    expect(sameClientSet(['a', 'a'], ['a', 'a'])).toBe(false);
    expect(sameClientSet([], [])).toBe(false);
    expect(
      sameClientSet(
        Array.from({ length: 17 }, (_, i) => String(i)),
        Array.from({ length: 17 }, (_, i) => String(i)),
      ),
    ).toBe(false);
  });

  it('bounds persistent ownership to strict prior release IDs and schema metadata', () => {
    const current = release().releaseId;
    const prior = release('0').releaseId;
    const value = {
      protocolVersion: 1,
      schemaVersion: 1,
      releaseId: current,
      priorReleaseIds: [prior],
    };
    expect(parseShellOwnership(value, current)?.priorReleaseIds).toEqual([
      prior,
    ]);
    expect(
      parseShellOwnership({ ...value, learner: 'synthetic' }, current),
    ).toBeNull();
    expect(
      parseShellOwnership({ ...value, priorReleaseIds: [current] }, current),
    ).toBeNull();
    expect(
      parseShellOwnership(
        { ...value, priorReleaseIds: [prior, prior] },
        current,
      ),
    ).toBeNull();
    expect(
      parseShellOwnership(
        { ...value, priorReleaseIds: ['../other-cache'] },
        current,
      ),
    ).toBeNull();
    expect(
      parseShellOwnership(
        {
          ...value,
          priorReleaseIds: Array.from(
            { length: 65 },
            (_, index) => `sha256-${index.toString(16).padStart(64, '0')}`,
          ),
        },
        current,
      ),
    ).toBeNull();
  });
});

describe('coherent shell installation and delivery', () => {
  it('verifies every exact member, omits credentials and never skips waiting at install', async () => {
    const fixture = setup();
    fixture.cacheSets.set('unrelated-app-cache', new SyntheticCache());
    await fixture.worker.install();
    expect(await fixture.worker.ready()).toBe(true);
    expect(fixture.requests).toHaveLength(2);
    expect(
      fixture.requests.every(
        (request) =>
          request.credentials === 'omit' &&
          request.mode === 'same-origin' &&
          request.redirect === 'error' &&
          request.cache === 'reload',
      ),
    ).toBe(true);
    expect(fixture.skipped()).toBe(0);
    expect(fixture.deleted).toEqual([]);
  });

  it.each(['404', 'wrong bytes', 'wrong hash', 'redirect', 'cross origin'])(
    'rejects required %s and preserves a prior cache',
    async (kind) => {
      const fixture = setup();
      const oldName =
        'math-adventure-shell:%2F:schema1:sha256-' + '0'.repeat(64);
      fixture.cacheSets.set(oldName, new SyntheticCache());
      fixture.setFetch((request) => {
        const body = `synthetic 1 ${request.url.slice(fixture.environment.scope.length)}`;
        const value = response(
          kind === 'wrong bytes'
            ? 'bad'
            : kind === 'wrong hash'
              ? 'x'.repeat(Buffer.byteLength(body))
              : body,
          kind === 'cross origin' ? 'https://external.invalid/a' : request.url,
          kind === '404' ? 404 : 200,
        );
        if (kind === 'redirect')
          Object.defineProperty(value, 'redirected', { value: true });
        return Promise.resolve(value);
      });
      await expect(fixture.worker.install()).rejects.toThrow(
        'SHELL_INSTALL_FAILED',
      );
      expect(await fixture.worker.ready()).toBe(false);
      expect(fixture.cacheSets.has(oldName)).toBe(true);
      expect(fixture.cacheSets.has(fixture.worker.cacheName)).toBe(false);
      expect(fixture.skipped()).toBe(0);
    },
  );

  it('does not overwrite or delete an existing damaged release', async () => {
    const fixture = setup();
    fixture.cacheSets.set(fixture.worker.cacheName, new SyntheticCache());
    await expect(fixture.worker.install()).rejects.toThrow(
      'EXISTING_SHELL_INCOMPLETE',
    );
    expect(fixture.deleted).toEqual([]);
    expect(fixture.requests).toEqual([]);
  });

  it('cannot recreate a retired namespace between read existence and handle acquisition', async () => {
    const fixture = setup();
    await fixture.worker.install();
    const tails = new Map<string, Promise<void>>();
    fixture.environment.withCacheLock = async <T>(
      name: string,
      work: () => Promise<T>,
    ) => {
      const previous = tails.get(name) ?? Promise.resolve();
      let unlock = () => {};
      const held = new Promise<void>((resolve) => {
        unlock = resolve;
      });
      tails.set(
        name,
        previous.then(() => held),
      );
      await previous;
      try {
        return await work();
      } finally {
        unlock();
      }
    };
    const originalKeys = fixture.environment.caches.keys;
    let retirement = Promise.resolve();
    let retirementScheduled = false;
    fixture.environment.caches.keys = async () => {
      const names = await originalKeys();
      if (!retirementScheduled) {
        retirementScheduled = true;
        retirement = fixture.environment.withCacheLock(
          fixture.worker.cacheName,
          async () => {
            await fixture.environment.caches.delete(fixture.worker.cacheName);
            await fixture.environment.caches.delete(
              fixture.worker.metadataCacheName,
            );
          },
        );
      }
      return names;
    };
    expect(await fixture.worker.ready()).toBe(false);
    expect(retirementScheduled).toBe(true);
    await retirement;
    expect(await originalKeys()).toEqual([]);
    await fixture.worker.responseFor(
      new Request(`${fixture.environment.scope}assets/main.js`),
    );
    expect(await originalKeys()).toEqual([]);
  });

  it('keeps working caches when native lifetime coordination is unavailable', async () => {
    const fixture = setup();
    await fixture.worker.install();
    fixture.environment.withCacheLock = () =>
      Promise.reject(new Error('SYNTHETIC_LOCK_UNAVAILABLE'));
    expect(await fixture.worker.ready()).toBe(false);
    const delivered = await fixture.worker.responseFor(
      new Request(`${fixture.environment.scope}assets/main.js`),
    );
    expect(delivered?.status).toBe(503);
    expect(fixture.cacheSets.has(fixture.worker.cacheName)).toBe(true);
    expect(fixture.cacheSets.has(fixture.worker.metadataCacheName)).toBe(true);
    expect(fixture.deleted).toEqual([]);
  });

  it('rejects and cancels an overlong unfinished essential stream at its declared byte bound', async () => {
    const fixture = setup();
    let cancelled = false;
    fixture.setFetch((request) => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(128));
        },
        cancel() {
          cancelled = true;
        },
      });
      const value = new Response(stream);
      Object.defineProperty(value, 'url', { value: request.url });
      return Promise.resolve(value);
    });
    await expect(fixture.worker.install()).rejects.toThrow(
      'SHELL_INSTALL_FAILED',
    );
    await vi.waitFor(() => expect(cancelled).toBe(true));
    expect(await fixture.worker.ready()).toBe(false);
    expect(fixture.cacheSets.has(fixture.worker.cacheName)).toBe(false);
    expect(fixture.skipped()).toBe(0);
  });

  it('discards a failed cache write without touching the working prior release', async () => {
    const fixture = setup();
    const oldName = 'math-adventure-shell:%2F:schema1:old';
    fixture.cacheSets.set(oldName, new SyntheticCache());
    const originalOpen = fixture.environment.caches.open;
    fixture.environment.caches.open = async (name) => {
      const cache = await originalOpen(name);
      const synthetic = fixture.cacheSets.get(name);
      if (synthetic !== undefined && name === fixture.worker.cacheName) {
        synthetic.failPut = true;
      }
      return cache;
    };
    await expect(fixture.worker.install()).rejects.toThrow(
      'SHELL_INSTALL_FAILED',
    );
    expect(fixture.cacheSets.has(oldName)).toBe(true);
    expect(fixture.cacheSets.has(fixture.worker.cacheName)).toBe(false);
  });

  it('recognizes an already complete identical release without network or activation', async () => {
    const fixture = setup();
    await fixture.worker.install();
    fixture.requests.length = 0;
    await fixture.worker.install();
    expect(fixture.requests).toEqual([]);
    expect(fixture.skipped()).toBe(0);
  });

  it('current readiness detects absent, extraneous and hash-corrupt members', async () => {
    const fixture = setup();
    await fixture.worker.install();
    const cache = fixture.cacheSets.get(fixture.worker.cacheName);
    if (cache === undefined) throw new Error('SYNTHETIC_CACHE_MISSING');
    const index = new URL('index.html', fixture.environment.scope).href;
    const original = cache.members.get(index);
    if (original === undefined) throw new Error('SYNTHETIC_MEMBER_MISSING');
    cache.members.delete(index);
    expect(await fixture.worker.ready()).toBe(false);
    cache.members.set(index, original);
    cache.members.set(
      'https://external.invalid/resource',
      response('bad', 'https://external.invalid/resource'),
    );
    expect(await fixture.worker.ready()).toBe(false);
    cache.members.delete('https://external.invalid/resource');
    cache.members.set(
      index,
      response('x'.repeat(fixture.descriptor.essential[1]?.bytes ?? 1), index),
    );
    expect(await fixture.worker.ready()).toBe(false);
  });

  it('readiness rejects missing, malformed or extraneous ownership metadata', async () => {
    const fixture = setup();
    await fixture.worker.install();
    const metadata = fixture.cacheSets.get(fixture.worker.metadataCacheName);
    if (metadata === undefined) throw new Error('SYNTHETIC_METADATA_MISSING');
    const record = metadata.members.get(fixture.worker.metadataURL);
    if (record === undefined)
      throw new Error('SYNTHETIC_METADATA_RECORD_MISSING');
    metadata.members.delete(fixture.worker.metadataURL);
    expect(await fixture.worker.ready()).toBe(false);
    metadata.members.set(
      fixture.worker.metadataURL,
      response('{"learner":"synthetic"}', fixture.worker.metadataURL),
    );
    expect(await fixture.worker.ready()).toBe(false);
    metadata.members.set(fixture.worker.metadataURL, record);
    metadata.members.set(
      'https://external.invalid/private',
      response('synthetic', 'https://external.invalid/private'),
    );
    expect(await fixture.worker.ready()).toBe(false);
  });

  it('bounds ownership body reads before parsing stored metadata', async () => {
    const fixture = setup();
    await fixture.worker.install();
    const metadata = fixture.cacheSets.get(fixture.worker.metadataCacheName);
    if (metadata === undefined) throw new Error('SYNTHETIC_METADATA_MISSING');
    metadata.members.set(
      fixture.worker.metadataURL,
      response(' '.repeat(8193), fixture.worker.metadataURL),
    );
    expect(await fixture.worker.ready()).toBe(false);
  });

  it('failed ownership write discards the incomplete new set and preserves prior releases', async () => {
    const fixture = setup();
    const oldName =
      'math-adventure-shell:%2F:schema1:' + release('0').releaseId;
    fixture.cacheSets.set(oldName, new SyntheticCache());
    const originalOpen = fixture.environment.caches.open;
    fixture.environment.caches.open = async (name) => {
      const cache = await originalOpen(name);
      const synthetic = fixture.cacheSets.get(name);
      if (synthetic !== undefined && name === fixture.worker.metadataCacheName)
        synthetic.failPut = true;
      return cache;
    };
    await expect(fixture.worker.install()).rejects.toThrow(
      'SHELL_INSTALL_FAILED',
    );
    expect(fixture.cacheSets.has(oldName)).toBe(true);
    expect(fixture.cacheSets.has(fixture.worker.cacheName)).toBe(false);
    expect(fixture.cacheSets.has(fixture.worker.metadataCacheName)).toBe(false);
  });

  it('serves declared exact bytes and cannot admit external or arbitrary requests', async () => {
    const fixture = setup();
    await fixture.worker.install();
    const before = fixture.requests.length;
    const cached = await fixture.worker.responseFor(
      new Request('https://synthetic.invalid/assets/main.js'),
    );
    expect(await cached?.text()).toBe('synthetic 1 assets/main.js');
    expect(
      await fixture.worker.responseFor(
        new Request('https://external.invalid/remote.js'),
      ),
    ).toBeUndefined();
    expect(
      await fixture.worker.responseFor(
        new Request('https://synthetic.invalid/learner/synthetic'),
      ),
    ).toBeUndefined();
    expect(
      await fixture.worker.responseFor(
        new Request('https://synthetic.invalid/assets/main.js?synthetic=1'),
      ),
    ).toBeUndefined();
    expect(fixture.requests).toHaveLength(before);
    expect(await fixture.worker.ready()).toBe(true);
  });

  it('maps root/subpath navigation queries to one declared index without storing values', async () => {
    const fixture = setup('1', 'https://synthetic.invalid/math-adventure/');
    await fixture.worker.install();
    const navigation = new Request(
      `${fixture.environment.scope}?lang=de&familyProof=1`,
    );
    Object.defineProperty(navigation, 'mode', { value: 'navigate' });
    expect(await (await fixture.worker.responseFor(navigation))?.text()).toBe(
      'synthetic 1 index.html',
    );
    const status = await fixture.worker.status();
    expect(status.essentialURLs.every((url) => !url.includes('?'))).toBe(true);
    expect(
      status.essentialURLs.every((url) =>
        url.startsWith(fixture.environment.scope),
      ),
    ).toBe(true);
  });

  it('refuses a corrupt cached member rather than mixing in a newer network resource', async () => {
    const fixture = setup();
    await fixture.worker.install();
    const url = 'https://synthetic.invalid/assets/main.js';
    fixture.cacheSets.get(fixture.worker.cacheName)?.members.delete(url);
    expect((await fixture.worker.responseFor(new Request(url)))?.status).toBe(
      503,
    );
    expect(fixture.requests).toHaveLength(2);
  });

  it('claims first-install clients without deleting old or unrelated releases', async () => {
    const fixture = setup();
    fixture.cacheSets.set(
      'math-adventure-shell:%2F:schema1:old',
      new SyntheticCache(),
    );
    fixture.cacheSets.set(
      'math-adventure-shell:%2Fmath-adventure%2F:schema1:old',
      new SyntheticCache(),
    );
    await fixture.worker.install();
    await fixture.worker.activate();
    expect(fixture.claimed()).toBe(1);
    expect(fixture.deleted).toEqual([]);
  });
});

describe('bounded explicit all-client update barrier', () => {
  it('one unready client blocks activation and cancels all frozen clients', async () => {
    const fixture = setup();
    await fixture.worker.install();
    automaticReplies(fixture.worker, [fixture.clients[0] as SyntheticClient]);
    automaticReplies(
      fixture.worker,
      [fixture.clients[1] as SyntheticClient],
      false,
    );
    expect(
      await activation(fixture.worker, fixture.clients[0] as SyntheticClient),
    ).toMatchObject({ outcome: 'blocked', code: 'unready' });
    expect(fixture.skipped()).toBe(0);
    expect(
      fixture.clients.every((client) =>
        client.messages.some(
          (value) => (value as { type: string }).type === 'CANCEL_UPDATE',
        ),
      ),
    ).toBe(true);
  });

  it('requires each native client in all three acknowledged phases before explicit skipWaiting', async () => {
    const fixture = setup();
    await fixture.worker.install();
    automaticReplies(fixture.worker, fixture.clients);
    expect(
      await activation(fixture.worker, fixture.clients[0] as SyntheticClient),
    ).toMatchObject({ outcome: 'activating' });
    expect(fixture.skipped()).toBe(1);
    expect(
      fixture.clients.map((client) =>
        client.messages.map((value) => (value as { type: string }).type),
      ),
    ).toEqual([
      ['PREPARE_UPDATE', 'FREEZE_UPDATE', 'ACTIVATING_UPDATE'],
      ['PREPARE_UPDATE', 'FREEZE_UPDATE', 'ACTIVATING_UPDATE'],
    ]);
    expect(fixture.deleted).toEqual([]);
  });

  it('missing acknowledgement times out while leaving the new worker waiting', async () => {
    const fixture = setup();
    await fixture.worker.install();
    const pending = activation(
      fixture.worker,
      fixture.clients[0] as SyntheticClient,
    );
    await new Promise<void>((resolve) => {
      const original = fixture.clients[0]?.onMessage;
      const client = fixture.clients[0];
      if (client === undefined) throw new Error('SYNTHETIC_CLIENT_MISSING');
      client.onMessage = (value) => {
        original?.(value);
        resolve();
      };
    });
    fixture.timeout();
    expect(await pending).toMatchObject({
      outcome: 'blocked',
      code: 'timeout',
    });
    expect(fixture.skipped()).toBe(0);
  });

  it('rejects a concurrent request while the first request is inspecting completeness', async () => {
    const fixture = setup();
    await fixture.worker.install();
    const firstClient = fixture.clients[0] as SyntheticClient;
    const prepared = new Promise<void>((resolve) => {
      firstClient.onMessage = () => resolve();
    });
    const pending = activation(fixture.worker, firstClient);
    expect(
      await activation(fixture.worker, fixture.clients[1] as SyntheticClient),
    ).toMatchObject({ outcome: 'blocked', code: 'busy' });
    await prepared;
    fixture.timeout();
    expect(await pending).toMatchObject({
      outcome: 'blocked',
      code: 'timeout',
    });
    expect(fixture.skipped()).toBe(0);
  });

  it('new client status observation cancels an in-progress transaction', async () => {
    const fixture = setup();
    await fixture.worker.install();
    const firstClient = fixture.clients[0] as SyntheticClient;
    const prepared = new Promise<void>((resolve) => {
      firstClient.onMessage = () => resolve();
    });
    const pending = activation(fixture.worker, firstClient);
    await prepared;
    expect((await fixture.worker.status()).updateInProgress).toBe(true);
    const opened = new SyntheticClient(
      'opened-during-update',
      fixture.environment.scope,
    );
    fixture.clients.push(opened);
    await fixture.worker.message(
      { type: 'GET_STATUS', protocolVersion: 1 },
      opened,
      { postMessage: () => {} },
    );
    expect(await pending).toMatchObject({
      outcome: 'blocked',
      code: 'clients-changed',
    });
    expect(fixture.skipped()).toBe(0);
    expect(opened.messages).toEqual([
      expect.objectContaining({ type: 'CANCEL_UPDATE' }),
    ]);
  });

  it('never sends cancellation after native activation has been queued', async () => {
    const fixture = setup();
    await fixture.worker.install();
    automaticReplies(fixture.worker, fixture.clients);
    let releaseNativeActivation: () => void = () => {};
    let observeNativeActivation: () => void = () => {};
    const nativeEntered = new Promise<void>((resolve) => {
      observeNativeActivation = resolve;
    });
    fixture.environment.skipWaiting = () => {
      observeNativeActivation();
      return new Promise<void>((resolve) => {
        releaseNativeActivation = resolve;
      });
    };
    const pending = activation(
      fixture.worker,
      fixture.clients[0] as SyntheticClient,
    );
    await nativeEntered;
    fixture.timeout();
    const opened = new SyntheticClient(
      'opened-after-native-commit',
      fixture.environment.scope,
    );
    fixture.clients.push(opened);
    await fixture.worker.message(
      { type: 'GET_STATUS', protocolVersion: 1 },
      opened,
      { postMessage: () => {} },
    );
    expect((await fixture.worker.status()).updateInProgress).toBe(true);
    releaseNativeActivation();
    expect(await pending).toMatchObject({ outcome: 'activating' });
    expect(
      fixture.clients.every((client) =>
        client.messages.every(
          (value) => (value as { type: string }).type !== 'CANCEL_UPDATE',
        ),
      ),
    ).toBe(true);
  });

  it('a superseded worker cannot activate after clients acknowledge commitment', async () => {
    const fixture = setup();
    await fixture.worker.install();
    automaticReplies(fixture.worker, fixture.clients);
    const first = fixture.clients[0] as SyntheticClient;
    const original = first.onMessage;
    first.onMessage = (value) => {
      if ((value as { type: string }).type === 'ACTIVATING_UPDATE')
        fixture.setState('redundant');
      original(value);
    };
    expect(await activation(fixture.worker, first)).toMatchObject({
      outcome: 'blocked',
      code: 'busy',
    });
    expect(fixture.skipped()).toBe(0);
    expect(
      fixture.clients.every((client) =>
        client.messages.some(
          (value) => (value as { type: string }).type === 'CANCEL_UPDATE',
        ),
      ),
    ).toBe(true);
  });

  it('a restarted active worker uses native lifecycle state for cleanup and rejects activation', async () => {
    const fixture = setup();
    const oldName =
      'math-adventure-shell:%2F:schema1:' + release('0').releaseId;
    fixture.cacheSets.set(oldName, new SyntheticCache());
    await fixture.worker.install();
    fixture.setState('activated');
    const restarted = new ShellWorker(fixture.descriptor, fixture.environment);
    expect(
      await activation(restarted, fixture.clients[0] as SyntheticClient),
    ).toMatchObject({ outcome: 'blocked', code: 'busy' });
    for (const client of fixture.clients) {
      await restarted.message(
        {
          type: 'CLIENT_RECOVERED',
          protocolVersion: 1,
          shellId: fixture.descriptor.shellId,
        },
        client,
      );
    }
    expect(fixture.cacheSets.has(oldName)).toBe(false);
  });

  it('an unavailable native lifecycle state safely declines update activation', async () => {
    const fixture = setup();
    await fixture.worker.install();
    fixture.setState('unknown');
    expect(
      await activation(fixture.worker, fixture.clients[0] as SyntheticClient),
    ).toMatchObject({ outcome: 'blocked', code: 'busy' });
    expect(fixture.skipped()).toBe(0);
  });

  it('newly opened unacknowledged clients prevent activation after the initial snapshot', async () => {
    const fixture = setup();
    await fixture.worker.install();
    automaticReplies(fixture.worker, fixture.clients);
    const client = fixture.clients[0] as SyntheticClient;
    const original = client.onMessage;
    client.onMessage = (value) => {
      if ((value as { type: string }).type === 'FREEZE_UPDATE') {
        fixture.clients.push(
          new SyntheticClient(
            'new-unacknowledged-client',
            fixture.environment.scope,
          ),
        );
      }
      original(value);
    };
    expect(await activation(fixture.worker, client)).toMatchObject({
      outcome: 'blocked',
      code: 'clients-changed',
    });
    expect(fixture.skipped()).toBe(0);
  });

  it('authenticates native source identity and refuses cross-origin or forged requests', async () => {
    const fixture = setup();
    await fixture.worker.install();
    expect(
      await activation(
        fixture.worker,
        new SyntheticClient('synthetic-client-a', 'https://external.invalid/'),
      ),
    ).toMatchObject({ outcome: 'blocked', code: 'invalid-source' });
    expect(
      await activation(
        fixture.worker,
        new SyntheticClient('forged-id', fixture.environment.scope),
      ),
    ).toMatchObject({ outcome: 'blocked', code: 'invalid-source' });
    expect(fixture.skipped()).toBe(0);
  });

  it('does not activate from stale, wrong-version, duplicate or unsolicited replies', async () => {
    const fixture = setup();
    await fixture.worker.install();
    const client = fixture.clients[0] as SyntheticClient;
    await fixture.worker.message(
      {
        type: 'UPDATE_READY',
        protocolVersion: 1,
        releaseId: fixture.worker.release.releaseId,
        attemptId: 'old',
        ready: true,
      },
      client,
    );
    await fixture.worker.message(
      { type: 'REQUEST_ACTIVATION', protocolVersion: 2 },
      client,
    );
    expect(fixture.skipped()).toBe(0);
    expect(client.messages).toEqual([]);
  });

  it('does not clean stale caches before every current document recovers its exact shell', async () => {
    const fixture = setup();
    const ownOld = 'math-adventure-shell:%2F:schema1:sha256-' + '0'.repeat(64);
    const otherScope =
      'math-adventure-shell:%2Fmath-adventure%2F:schema1:sha256-' +
      '0'.repeat(64);
    fixture.cacheSets.set(ownOld, new SyntheticCache());
    fixture.cacheSets.set(otherScope, new SyntheticCache());
    fixture.cacheSets.set('unrelated-app', new SyntheticCache());
    await fixture.worker.install();
    await fixture.worker.activate();
    await fixture.worker.message(
      {
        type: 'CLIENT_RECOVERED',
        protocolVersion: 1,
        shellId: fixture.worker.release.shellId,
      },
      fixture.clients[0],
    );
    await fixture.worker.message(
      { type: 'CLIENT_RECOVERED', protocolVersion: 1, shellId: '0'.repeat(64) },
      fixture.clients[1],
    );
    expect(fixture.cacheSets.has(ownOld)).toBe(true);
    await fixture.worker.message(
      {
        type: 'CLIENT_RECOVERED',
        protocolVersion: 1,
        shellId: fixture.worker.release.shellId,
      },
      fixture.clients[1],
    );
    expect(fixture.cacheSets.has(ownOld)).toBe(false);
    expect(fixture.cacheSets.has(otherScope)).toBe(true);
    expect(fixture.cacheSets.has('unrelated-app')).toBe(true);
    expect(fixture.cacheSets.has(fixture.worker.cacheName)).toBe(true);
  });

  it('an unrelated in-scope client conservatively blocks cleanup', async () => {
    const fixture = setup();
    const oldName =
      'math-adventure-shell:%2F:schema1:' + release('0').releaseId;
    fixture.cacheSets.set(oldName, new SyntheticCache());
    await fixture.worker.install();
    await fixture.worker.activate();
    fixture.clients.push(
      new SyntheticClient(
        'unrelated-same-origin-client',
        'https://synthetic.invalid/another-app/',
      ),
    );
    for (const client of fixture.clients.slice(0, 2)) {
      await fixture.worker.message(
        {
          type: 'CLIENT_RECOVERED',
          protocolVersion: 1,
          shellId: fixture.worker.release.shellId,
        },
        client,
      );
    }
    expect(fixture.cacheSets.has(oldName)).toBe(true);
  });

  it('preserves a newer waiting identical release through A to B to A to B reinstallation', async () => {
    const fixture = setup();
    let staged = false;
    fixture.environment.hasStagedWorker = () => staged;
    const installed = (version: string) => {
      let nativeState = 'installed';
      const worker = new ShellWorker(release(version), {
        ...fixture.environment,
        state: () => nativeState,
      });
      return {
        worker,
        setState: (value: string) => {
          nativeState = value;
        },
      };
    };
    const recovered = async (worker: ShellWorker) => {
      for (const client of fixture.clients)
        await worker.message(
          {
            type: 'CLIENT_RECOVERED',
            protocolVersion: 1,
            shellId: worker.release.shellId,
          },
          client,
        );
    };
    await fixture.worker.install();
    await fixture.worker.activate();
    const b = installed('2');
    fixture.setFetch((request) =>
      Promise.resolve(
        response(
          `synthetic 2 ${request.url.slice(fixture.environment.scope.length)}`,
          request.url,
        ),
      ),
    );
    await b.worker.install();
    await b.worker.activate();
    b.setState('activated');
    await recovered(b.worker);
    expect(fixture.cacheSets.has(fixture.worker.cacheName)).toBe(false);
    const aAgain = installed('1');
    fixture.setFetch((request) =>
      Promise.resolve(
        response(
          `synthetic 1 ${request.url.slice(fixture.environment.scope.length)}`,
          request.url,
        ),
      ),
    );
    await aAgain.worker.install();
    await aAgain.worker.activate();
    aAgain.setState('activated');
    await recovered(aAgain.worker);
    expect(fixture.cacheSets.has(b.worker.cacheName)).toBe(false);
    const bAgain = installed('2');
    fixture.setFetch((request) =>
      Promise.resolve(
        response(
          `synthetic 2 ${request.url.slice(fixture.environment.scope.length)}`,
          request.url,
        ),
      ),
    );
    staged = true;
    await bAgain.worker.install();
    await recovered(aAgain.worker);
    expect(await bAgain.worker.ready()).toBe(true);
    expect(fixture.cacheSets.has(bAgain.worker.cacheName)).toBe(true);
    expect(fixture.cacheSets.has(bAgain.worker.metadataCacheName)).toBe(true);
    staged = false;
    aAgain.setState('redundant');
    await bAgain.worker.activate();
    bAgain.setState('activated');
    await recovered(bAgain.worker);
    expect(fixture.cacheSets.has(aAgain.worker.cacheName)).toBe(false);
    expect(fixture.cacheSets.has(aAgain.worker.metadataCacheName)).toBe(false);
    expect(await bAgain.worker.ready()).toBe(true);
  });

  it('retains prior caches if a native staged candidate appears before the retirement lock is granted', async () => {
    const fixture = setup();
    const prior =
      shellCachePrefix(new URL(fixture.environment.scope)) +
      release('0').releaseId;
    fixture.cacheSets.set(prior, new SyntheticCache());
    await fixture.worker.install();
    await fixture.worker.activate();
    let staged = false;
    fixture.environment.hasStagedWorker = () => staged;
    fixture.environment.withCacheLock = (name, work) => {
      if (name === prior) staged = true;
      return work();
    };
    for (const client of fixture.clients)
      await fixture.worker.message(
        {
          type: 'CLIENT_RECOVERED',
          protocolVersion: 1,
          shellId: fixture.descriptor.shellId,
        },
        client,
      );
    expect(staged).toBe(true);
    expect(fixture.cacheSets.has(prior)).toBe(true);
    expect(fixture.deleted).toEqual([]);
  });

  it('a redundant old worker cannot retire caches using its former active memory flag', async () => {
    const fixture = setup();
    const prior =
      shellCachePrefix(new URL(fixture.environment.scope)) +
      release('0').releaseId;
    fixture.cacheSets.set(prior, new SyntheticCache());
    await fixture.worker.install();
    await fixture.worker.activate();
    fixture.setState('redundant');
    for (const client of fixture.clients)
      await fixture.worker.message(
        {
          type: 'CLIENT_RECOVERED',
          protocolVersion: 1,
          shellId: fixture.descriptor.shellId,
        },
        client,
      );
    expect(fixture.cacheSets.has(prior)).toBe(true);
    expect(fixture.deleted).toEqual([]);
  });

  it('an active release recovery never deletes a newer waiting release or its metadata', async () => {
    const fixture = setup();
    await fixture.worker.install();
    await fixture.worker.activate();
    fixture.setFetch((request) =>
      Promise.resolve(
        response(
          `synthetic 2 ${request.url.slice(fixture.environment.scope.length)}`,
          request.url,
        ),
      ),
    );
    const waiting = new ShellWorker(release('2'), fixture.environment);
    await waiting.install();
    for (const client of fixture.clients) {
      await fixture.worker.message(
        {
          type: 'CLIENT_RECOVERED',
          protocolVersion: 1,
          shellId: fixture.worker.release.shellId,
        },
        client,
      );
    }
    expect(fixture.cacheSets.has(waiting.cacheName)).toBe(true);
    expect(fixture.cacheSets.has(waiting.metadataCacheName)).toBe(true);
    expect(await waiting.ready()).toBe(true);
  });

  it('a restarted new release retires only its persisted prior sets after every document recovers', async () => {
    const fixture = setup();
    await fixture.worker.install();
    await fixture.worker.activate();
    const foreign =
      'math-adventure-shell:%2Fmath-adventure%2F:schema1:' +
      release('0').releaseId;
    fixture.cacheSets.set(foreign, new SyntheticCache());
    fixture.setFetch((request) =>
      Promise.resolve(
        response(
          `synthetic 2 ${request.url.slice(fixture.environment.scope.length)}`,
          request.url,
        ),
      ),
    );
    const installed = new ShellWorker(release('2'), fixture.environment);
    await installed.install();
    await installed.activate();
    fixture.setState('activated');
    const restarted = new ShellWorker(release('2'), fixture.environment);
    await restarted.message(
      {
        type: 'CLIENT_RECOVERED',
        protocolVersion: 1,
        shellId: restarted.release.shellId,
      },
      fixture.clients[0],
    );
    expect(fixture.cacheSets.has(fixture.worker.cacheName)).toBe(true);
    expect(fixture.cacheSets.has(fixture.worker.metadataCacheName)).toBe(true);
    await restarted.message(
      {
        type: 'CLIENT_RECOVERED',
        protocolVersion: 1,
        shellId: restarted.release.shellId,
      },
      fixture.clients[1],
    );
    expect(fixture.cacheSets.has(fixture.worker.cacheName)).toBe(false);
    expect(fixture.cacheSets.has(fixture.worker.metadataCacheName)).toBe(false);
    expect(fixture.cacheSets.has(restarted.cacheName)).toBe(true);
    expect(fixture.cacheSets.has(restarted.metadataCacheName)).toBe(true);
    expect(fixture.cacheSets.has(foreign)).toBe(true);
  });
});
