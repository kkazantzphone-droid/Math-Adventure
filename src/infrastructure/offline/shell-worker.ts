import {
  essentialURL,
  isAppClientURL,
  MAX_REQUIRED_CLIENTS,
  parseShellRelease,
  parseShellOwnership,
  sameClientSet,
  shellCachePrefix,
  UPDATE_ACK_TIMEOUT_MS,
  validateAppScope,
  type ActivationBlockCode,
  type ActivationResult,
  type EssentialResource,
  type ShellRelease,
  type ShellStatus,
  type ShellOwnership,
} from './shell-policy';

export interface ShellClient {
  readonly id: string;
  readonly type: string;
  readonly url: string;
  postMessage(message: unknown): void;
}

export interface ShellWorkerEnvironment {
  readonly origin: string;
  readonly scope: string;
  readonly caches: Pick<CacheStorage, 'open' | 'keys' | 'delete'>;
  withCacheLock<T>(name: string, operation: () => Promise<T>): Promise<T>;
  readonly clients: {
    matchAll(): Promise<readonly ShellClient[]>;
    get(id: string): Promise<ShellClient | undefined>;
    claim(): Promise<void>;
  };
  fetch(request: Request): Promise<Response>;
  digest(body: ArrayBuffer): Promise<string>;
  token(): string;
  state(): string;
  hasStagedWorker(): boolean;
  schedule(milliseconds: number, callback: () => void): () => void;
  skipWaiting(): Promise<void>;
}

type UpdatePhase = 'prepare' | 'freeze' | 'activating';

interface Attempt {
  readonly id: string;
  readonly clientIds: readonly string[];
  readonly clients: readonly ShellClient[];
  phase: UpdatePhase;
  acknowledgements: Set<string>;
  finishRound: (value: boolean) => void;
  failed: ActivationBlockCode | null;
  irreversible: boolean;
}

interface ReplyPort {
  postMessage(value: unknown): void;
}

function messageRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Owns static shell delivery only. No application, learner or math behavior. */
export class ShellWorker {
  readonly release: ShellRelease;
  readonly scope: URL;
  readonly cacheName: string;
  readonly metadataCacheName: string;
  readonly metadataURL: string;
  private readonly cachePrefix: string;
  private readonly required = new Map<string, EssentialResource>();
  private readonly recovered = new Set<string>();
  private attempt: Attempt | null = null;
  private active = false;
  private activationRequest = false;

  constructor(
    value: unknown,
    private readonly environment: ShellWorkerEnvironment,
  ) {
    this.release = parseShellRelease(value);
    this.scope = validateAppScope(environment.scope, environment.origin);
    this.cachePrefix = shellCachePrefix(this.scope);
    this.cacheName = `${this.cachePrefix}${this.release.releaseId}`;
    this.metadataCacheName = `${this.cachePrefix}metadata:${this.release.releaseId}`;
    this.metadataURL = new URL('release.json', this.scope).href;
    for (const entry of this.release.essential) {
      this.required.set(essentialURL(entry, this.scope), entry);
    }
  }

  private async verifiedResponse(
    response: Response | undefined,
    entry: EssentialResource,
    expectedURL: string,
  ): Promise<boolean> {
    if (
      response === undefined ||
      response.status !== 200 ||
      response.url !== expectedURL ||
      response.type === 'opaque' ||
      response.type === 'opaqueredirect' ||
      response.redirected
    ) {
      return false;
    }
    if (response.body === null) return false;
    const reader = response.clone().body?.getReader();
    if (reader === undefined) return false;
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > entry.bytes) {
        // Cancel both tee branches without awaiting an unread branch. An
        // overlong response must not allocate its complete untrusted body.
        void reader.cancel().catch(() => {});
        void response.body.cancel().catch(() => {});
        return false;
      }
      chunks.push(chunk.value);
    }
    if (length !== entry.bytes) return false;
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const body = bytes.buffer;
    return (
      body.byteLength === entry.bytes &&
      (await this.environment.digest(body)) === entry.sha256
    );
  }

  private async existingCache(name: string): Promise<Cache | null> {
    // CacheStorage has no non-creating named-handle getter. Hold the same
    // release-only lock as retirement across the existence check and open.
    return this.environment.withCacheLock(this.cacheName, async () => {
      if (!(await this.environment.caches.keys()).includes(name)) return null;
      return this.environment.caches.open(name);
    });
  }

  private async deleteRelease(id: string, retiring = false): Promise<boolean> {
    const name = `${this.cachePrefix}${id}`;
    return this.environment.withCacheLock(name, async () => {
      if (
        retiring &&
        (this.environment.state() !== 'activated' ||
          this.environment.hasStagedWorker())
      )
        return false;
      await this.environment.caches.delete(name);
      await this.environment.caches.delete(`${this.cachePrefix}metadata:${id}`);
      return true;
    });
  }

  private async ownership(): Promise<ShellOwnership | null> {
    try {
      const cache = await this.existingCache(this.metadataCacheName);
      if (cache === null) return null;
      const keys = await cache.keys();
      if (keys.length !== 1 || keys[0]?.url !== this.metadataURL) return null;
      const response = await cache.match(this.metadataURL);
      if (response === undefined || response.status !== 200) return null;
      if (response.body === null) return null;
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let byteLength = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        byteLength += chunk.value.byteLength;
        if (byteLength > 8192) {
          // A cloned response can have another unread tee branch; cancellation
          // must not turn the bounded rejection into an unbounded wait.
          void reader.cancel().catch(() => {});
          return null;
        }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(byteLength);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const value: unknown = JSON.parse(text);
      return parseShellOwnership(value, this.release.releaseId);
    } catch {
      return null;
    }
  }

  async ready(): Promise<boolean> {
    return (await this.shellComplete()) && (await this.ownership()) !== null;
  }

  private async shellComplete(): Promise<boolean> {
    try {
      const cache = await this.existingCache(this.cacheName);
      if (cache === null) return false;
      const actual = (await cache.keys()).map((request) => request.url);
      if (
        actual.length !== this.required.size ||
        actual.some((url) => !this.required.has(url))
      ) {
        return false;
      }
      for (const [url, entry] of this.required) {
        if (
          !(await this.verifiedResponse(await cache.match(url), entry, url))
        ) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /** Failed installation rejects native install and discards only its new set. */
  async install(): Promise<void> {
    const existing = await this.environment.caches.keys();
    const existed =
      existing.includes(this.cacheName) ||
      existing.includes(this.metadataCacheName);
    if (existed) {
      if (await this.ready()) return;
      // Never overwrite a previously named release, even if it is damaged.
      throw new Error('EXISTING_SHELL_INCOMPLETE');
    }
    const priorReleaseIds = existing
      .filter((name) => name.startsWith(this.cachePrefix))
      .map((name) => name.slice(this.cachePrefix.length))
      .filter((id) => /^sha256-[a-f0-9]{64}$/.test(id))
      .sort();
    const ownership = parseShellOwnership(
      {
        protocolVersion: 1,
        schemaVersion: 1,
        releaseId: this.release.releaseId,
        priorReleaseIds,
      },
      this.release.releaseId,
    );
    if (ownership === null) throw new Error('SHELL_OWNERSHIP_BOUNDS');
    try {
      const cache = await this.environment.withCacheLock(this.cacheName, () =>
        this.environment.caches.open(this.cacheName),
      );
      for (const [url, entry] of this.required) {
        const response = await this.environment.fetch(
          new Request(url, {
            credentials: 'omit',
            mode: 'same-origin',
            cache: 'reload',
            redirect: 'error',
          }),
        );
        if (!(await this.verifiedResponse(response, entry, url))) {
          throw new Error('REQUIRED_SHELL_RESOURCE_FAILED');
        }
        await cache.put(url, response);
      }
      if (!(await this.shellComplete()))
        throw new Error('SHELL_INSTALL_INCOMPLETE');
      const metadata = await this.environment.withCacheLock(
        this.cacheName,
        () => this.environment.caches.open(this.metadataCacheName),
      );
      await metadata.put(
        this.metadataURL,
        new Response(JSON.stringify(ownership), {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        }),
      );
      if (!(await this.ready())) throw new Error('SHELL_INSTALL_INCOMPLETE');
      // Native install completion provides readiness; activation is never requested here.
    } catch {
      await this.deleteRelease(this.release.releaseId);
      throw new Error('SHELL_INSTALL_FAILED');
    }
  }

  async activate(): Promise<void> {
    if (!(await this.ready())) throw new Error('SHELL_ACTIVATION_INCOMPLETE');
    this.active = true;
    await this.environment.clients.claim();
    // Old releases survive activation until all live documents announce recovery.
  }

  /** Returns undefined for undeclared requests: there is no runtime caching. */
  async responseFor(request: Request): Promise<Response | undefined> {
    // Fetch events belong only to the native active worker, including a restarted one.
    this.active = true;
    if (request.method !== 'GET') return undefined;
    const url = new URL(request.url);
    if (url.origin !== this.scope.origin) return undefined;
    let key: string;
    if (
      request.mode === 'navigate' &&
      (url.pathname === this.scope.pathname ||
        url.pathname === `${this.scope.pathname}index.html`)
    ) {
      key = new URL('index.html', this.scope).href;
    } else {
      if (url.search || url.hash) return undefined;
      key = url.href;
    }
    const entry = this.required.get(key);
    if (entry === undefined) return undefined;
    try {
      const cache = await this.existingCache(this.cacheName);
      const response = await cache?.match(key);
      if (await this.verifiedResponse(response, entry, key)) return response;
    } catch {
      /* Never mix a missing/corrupt member with a newer network release. */
    }
    return new Response('OFFLINE_SHELL_INCOMPLETE', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  async status(): Promise<ShellStatus> {
    return {
      type: 'STATUS',
      protocolVersion: 1,
      releaseId: this.release.releaseId,
      shellId: this.release.shellId,
      schemaVersion: 1,
      compatibleSchema: { min: 1, max: 1 },
      ready: await this.ready(),
      updateInProgress: this.attempt !== null,
      cacheName: this.cacheName,
      metadataCacheName: this.metadataCacheName,
      metadataURL: this.metadataURL,
      essentialURLs: [...this.required.keys()],
    };
  }

  private async authenticatedClient(
    source: unknown,
  ): Promise<ShellClient | null> {
    if (
      !messageRecord(source) ||
      typeof source.id !== 'string' ||
      source.id.length > 128 ||
      source.type !== 'window' ||
      typeof source.url !== 'string' ||
      !isAppClientURL(source.url, this.scope)
    ) {
      return null;
    }
    const client = await this.environment.clients.get(source.id);
    return client !== undefined &&
      client.type === 'window' &&
      client.url === source.url &&
      isAppClientURL(client.url, this.scope)
      ? client
      : null;
  }

  private async appClients(): Promise<readonly ShellClient[]> {
    return (await this.environment.clients.matchAll()).filter(
      (client) =>
        client.type === 'window' && isAppClientURL(client.url, this.scope),
    );
  }

  private notify(attempt: Attempt, type: string): void {
    for (const client of attempt.clients) {
      try {
        client.postMessage({
          type,
          protocolVersion: 1,
          releaseId: this.release.releaseId,
          attemptId: attempt.id,
        });
      } catch {
        this.abort(attempt, 'clients-changed');
      }
    }
  }

  private abort(attempt: Attempt, code: ActivationBlockCode): void {
    if (attempt.irreversible) return;
    if (attempt.failed === null) attempt.failed = code;
    attempt.finishRound(false);
  }

  private round(
    attempt: Attempt,
    phase: UpdatePhase,
    type: string,
  ): Promise<boolean> {
    if (attempt.failed !== null) return Promise.resolve(false);
    attempt.phase = phase;
    attempt.acknowledgements.clear();
    return new Promise((resolve) => {
      attempt.finishRound = resolve;
      this.notify(attempt, type);
    });
  }

  private async clientsUnchanged(attempt: Attempt): Promise<boolean> {
    const ids = (await this.appClients()).map((client) => client.id);
    if (!sameClientSet(attempt.clientIds, ids)) {
      this.abort(attempt, 'clients-changed');
      return false;
    }
    return true;
  }

  private result(
    outcome: 'activating' | 'blocked',
    code?: ActivationBlockCode,
  ): ActivationResult {
    return {
      type: 'ACTIVATION_RESULT',
      protocolVersion: 1,
      releaseId: this.release.releaseId,
      outcome,
      ...(code === undefined ? {} : { code }),
    };
  }

  private async requestActivation(
    client: ShellClient,
  ): Promise<ActivationResult> {
    if (
      this.active ||
      this.environment.state() !== 'installed' ||
      this.activationRequest
    )
      return this.result('blocked', 'busy');
    this.activationRequest = true;
    try {
      return await this.activateAtSafeBoundary(client);
    } finally {
      this.activationRequest = false;
    }
  }

  private async activateAtSafeBoundary(
    client: ShellClient,
  ): Promise<ActivationResult> {
    if (!(await this.ready()))
      return this.result('blocked', 'cache-incomplete');
    const clients = await this.appClients();
    if (
      clients.length === 0 ||
      clients.length > MAX_REQUIRED_CLIENTS ||
      !clients.some((candidate) => candidate.id === client.id)
    ) {
      return this.result('blocked', 'clients-changed');
    }
    const attempt: Attempt = {
      id: this.environment.token(),
      clients,
      clientIds: clients.map((candidate) => candidate.id),
      phase: 'prepare',
      acknowledgements: new Set(),
      finishRound: () => {},
      failed: null,
      irreversible: false,
    };
    this.attempt = attempt;
    const cancelTimeout = this.environment.schedule(UPDATE_ACK_TIMEOUT_MS, () =>
      this.abort(attempt, 'timeout'),
    );
    try {
      for (const [phase, message] of [
        ['prepare', 'PREPARE_UPDATE'],
        ['freeze', 'FREEZE_UPDATE'],
        ['activating', 'ACTIVATING_UPDATE'],
      ] as const) {
        if (this.environment.state() !== 'installed') {
          this.abort(attempt, 'busy');
          return this.result('blocked', 'busy');
        }
        if (!(await this.round(attempt, phase, message))) {
          return this.result('blocked', attempt.failed ?? 'unready');
        }
        if (!(await this.clientsUnchanged(attempt))) {
          return this.result('blocked', 'clients-changed');
        }
        if (this.environment.state() !== 'installed') {
          this.abort(attempt, 'busy');
          return this.result('blocked', 'busy');
        }
      }
      if (!(await this.ready())) {
        this.abort(attempt, 'cache-incomplete');
        return this.result('blocked', 'cache-incomplete');
      }
      if (!(await this.clientsUnchanged(attempt)) || attempt.failed !== null) {
        return this.result('blocked', attempt.failed ?? 'clients-changed');
      }
      if (this.environment.state() !== 'installed') {
        this.abort(attempt, 'busy');
        return this.result('blocked', 'busy');
      }
      // Native activation cannot be revoked. Never unlock committed clients after
      // queuing it, even if a new document or timer event arrives during this await.
      attempt.irreversible = true;
      cancelTimeout();
      await this.environment.skipWaiting();
      return this.result('activating');
    } catch {
      this.abort(attempt, 'clients-changed');
      return this.result('blocked', attempt.failed ?? 'clients-changed');
    } finally {
      cancelTimeout();
      if (attempt.failed !== null && !attempt.irreversible)
        this.notify(attempt, 'CANCEL_UPDATE');
      if (this.attempt === attempt) this.attempt = null;
    }
  }

  private acknowledge(
    client: ShellClient,
    data: Record<string, unknown>,
  ): void {
    const attempt = this.attempt;
    if (
      attempt === null ||
      data.releaseId !== this.release.releaseId ||
      data.attemptId !== attempt.id ||
      !attempt.clientIds.includes(client.id)
    )
      return;
    const expected = {
      prepare: 'UPDATE_READY',
      freeze: 'UPDATE_FROZEN',
      activating: 'UPDATE_ACTIVATING',
    }[attempt.phase];
    if (data.type !== expected) return;
    if (data.ready !== true) {
      this.abort(attempt, 'unready');
      return;
    }
    attempt.acknowledgements.add(client.id);
    if (attempt.acknowledgements.size === attempt.clientIds.length) {
      attempt.finishRound(true);
    }
  }

  private async cleanupRecovered(): Promise<void> {
    if (
      this.environment.state() !== 'activated' ||
      this.environment.hasStagedWorker() ||
      !(await this.ready())
    )
      return;
    const clients = await this.appClients();
    if (
      clients.length === 0 ||
      clients.length > MAX_REQUIRED_CLIENTS ||
      clients.some((client) => !this.recovered.has(client.id))
    )
      return;
    const ownership = await this.ownership();
    if (ownership === null) return;
    for (const id of ownership.priorReleaseIds) {
      const current = await this.appClients();
      if (
        !sameClientSet(
          clients.map((client) => client.id),
          current.map((client) => client.id),
        )
      )
        return;
      if (current.some((client) => !this.recovered.has(client.id))) return;
      // Ownership is captured before installation and persisted. An old active
      // worker cannot retire a newer complete release that is currently waiting.
      try {
        if (!(await this.deleteRelease(id, true))) return;
      } catch {
        // Missing/blocked coordination preserves prior caches; it cannot justify
        // an unsafe fallback deletion or a claim of completed retirement.
        return;
      }
    }
  }

  async message(
    data: unknown,
    source: unknown,
    port?: ReplyPort,
  ): Promise<void> {
    if (!messageRecord(data) || data.protocolVersion !== 1) return;
    const client = await this.authenticatedClient(source);
    if (client === null) {
      if (data.type === 'REQUEST_ACTIVATION') {
        port?.postMessage(this.result('blocked', 'invalid-source'));
      }
      return;
    }
    if (data.type === 'GET_STATUS' || data.type === 'STATUS') {
      const attempt = this.attempt;
      if (
        attempt !== null &&
        !attempt.irreversible &&
        !attempt.clientIds.includes(client.id)
      ) {
        this.abort(attempt, 'clients-changed');
        client.postMessage({
          type: 'CANCEL_UPDATE',
          protocolVersion: 1,
          releaseId: this.release.releaseId,
          attemptId: attempt.id,
        });
      }
      port?.postMessage(await this.status());
    } else if (data.type === 'REQUEST_ACTIVATION') {
      port?.postMessage(await this.requestActivation(client));
    } else if (data.type === 'CLIENT_RECOVERED') {
      if (data.shellId === this.release.shellId) {
        this.recovered.add(client.id);
        await this.cleanupRecovered();
      }
    } else {
      this.acknowledge(client, data);
    }
  }
}
