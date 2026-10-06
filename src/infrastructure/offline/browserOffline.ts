import type {
  OfflineController,
  OfflineSnapshot,
} from '../../presentation/offline/controller';

interface WorkerStatus {
  readonly type: 'STATUS';
  readonly protocolVersion: 1;
  readonly releaseId: string;
  readonly shellId: string;
  readonly schemaVersion: 1;
  readonly compatibleSchema: { readonly min: 1; readonly max: 1 };
  readonly ready: boolean;
  readonly updateInProgress: boolean;
}

interface UpdateMessage {
  readonly type: string;
  readonly protocolVersion: 1;
  readonly releaseId: string;
  readonly attemptId: string;
}

interface UpdateAttempt {
  readonly worker: ServiceWorker;
  readonly releaseId: string;
  readonly attemptId: string;
  committed: boolean;
}

export interface BrowserOfflineEnvironment {
  readonly serviceWorker: ServiceWorkerContainer | null;
  readonly baseURL: URL;
  readonly shellId: string;
  readonly reload: () => void;
  readonly makeChannel?: () => MessageChannel;
  readonly onFreeze?: (frozen: boolean) => void;
  readonly online?: () => boolean;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function identifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 128 &&
    /^[A-Za-z0-9._:-]+$/.test(value)
  );
}

function workerStatus(value: unknown): WorkerStatus | null {
  if (
    !record(value) ||
    value.type !== 'STATUS' ||
    value.protocolVersion !== 1 ||
    !identifier(value.releaseId) ||
    !identifier(value.shellId) ||
    value.schemaVersion !== 1 ||
    !record(value.compatibleSchema) ||
    value.compatibleSchema.min !== 1 ||
    value.compatibleSchema.max !== 1 ||
    typeof value.ready !== 'boolean' ||
    typeof value.updateInProgress !== 'boolean'
  )
    return null;
  return {
    type: 'STATUS',
    protocolVersion: 1,
    releaseId: value.releaseId,
    shellId: value.shellId,
    schemaVersion: 1,
    compatibleSchema: { min: 1, max: 1 },
    ready: value.ready,
    updateInProgress: value.updateInProgress,
  };
}

function updateMessage(value: unknown): UpdateMessage | null {
  if (
    !record(value) ||
    typeof value.type !== 'string' ||
    value.protocolVersion !== 1 ||
    !identifier(value.releaseId) ||
    !identifier(value.attemptId)
  )
    return null;
  return {
    type: value.type,
    protocolVersion: 1,
    releaseId: value.releaseId,
    attemptId: value.attemptId,
  };
}

/** All platform reads and registration/recovery effects stay in this browser adapter. */
export function createBrowserOfflineController(
  environment: BrowserOfflineEnvironment,
): OfflineController {
  const container = environment.serviceWorker;
  const listeners = new Set<() => void>();
  const removers: (() => void)[] = [];
  let snapshot: OfflineSnapshot = {
    shell: container === null ? 'unsupported' : 'checking',
    update: 'none',
    frozen: container !== null,
    safeBoundary: false,
    releaseId: null,
  };
  let registration: ServiceWorkerRegistration | null = null;
  let attempt: UpdateAttempt | null = null;
  let preparation: UpdateAttempt | null = null;
  let started = false;
  let disposed = false;
  let reloadIssued = false;
  let refreshing = 0;
  let requesting = false;
  let blockedWorker: ServiceWorker | null = null;
  let startupHold = container !== null;
  const baseURL = new URL(environment.baseURL.href);
  const workerURL = new URL('sw.js', baseURL);
  const makeChannel = environment.makeChannel ?? (() => new MessageChannel());
  const online = environment.online ?? (() => true);

  function ownRegistration(candidate: ServiceWorkerRegistration) {
    const workers = [
      candidate.active,
      candidate.waiting,
      candidate.installing,
    ].filter((worker) => worker !== null);
    return (
      candidate.scope === baseURL.href &&
      workers.length > 0 &&
      workers.every((worker) => worker.scriptURL === workerURL.href)
    );
  }

  function ownController(worker: ServiceWorker | null): ServiceWorker | null {
    return registration?.scope === baseURL.href &&
      worker?.scriptURL === workerURL.href
      ? worker
      : null;
  }

  function publish(change: Partial<OfflineSnapshot>) {
    if (disposed) return;
    const next = { ...snapshot, ...change };
    if (
      Object.keys(change).every(
        (key) =>
          next[key as keyof OfflineSnapshot] ===
          snapshot[key as keyof OfflineSnapshot],
      )
    )
      return;
    if (next.frozen !== snapshot.frozen) environment.onFreeze?.(next.frozen);
    snapshot = next;
    for (const listener of listeners) listener();
  }

  function ask(
    worker: ServiceWorker,
    message: unknown,
    timeout = 1_500,
  ): Promise<unknown> {
    return new Promise((resolve) => {
      let channel: MessageChannel;
      try {
        channel = makeChannel();
      } catch {
        resolve(null);
        return;
      }
      let settled = false;
      const finish = (value: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        channel.port1.close();
        channel.port2.close();
        resolve(value);
      };
      const timer = setTimeout(() => finish(null), timeout);
      channel.port1.onmessage = (event: MessageEvent<unknown>) =>
        finish(event.data);
      try {
        worker.postMessage(message, [channel.port2]);
      } catch {
        finish(null);
      }
    });
  }

  async function status(worker: ServiceWorker): Promise<WorkerStatus | null> {
    return workerStatus(
      await ask(worker, { type: 'STATUS', protocolVersion: 1 }),
    );
  }

  function recovered(worker: ServiceWorker, current: WorkerStatus) {
    if (current.ready && current.shellId === environment.shellId) {
      try {
        worker.postMessage({
          type: 'CLIENT_RECOVERED',
          protocolVersion: 1,
          shellId: environment.shellId,
        });
      } catch {
        // A vanished worker cannot confirm recovery; its old cache stays retained.
      }
    }
  }

  async function refresh() {
    if (disposed || container === null || registration === null) return;
    const generation = ++refreshing;
    const controlling = ownController(container.controller);
    const waiting = registration.waiting;
    const [current, staged] = await Promise.all([
      controlling === null ? null : status(controlling),
      waiting === null ? null : status(waiting),
    ]);
    if (disposed || generation !== refreshing) return;
    if (startupHold) {
      // A newly opened document never starts a task under an already changed
      // controller. It recovers before its first interactive boundary instead.
      if (current?.ready === true && current.shellId !== environment.shellId) {
        publish({ update: 'recovering' });
        if (!reloadIssued) {
          reloadIssued = true;
          environment.reload();
        }
        return;
      }
      if (staged?.updateInProgress === true) {
        publish({ update: 'preparing' });
        const timer = setTimeout(() => {
          void refresh();
        }, 250);
        removers.push(() => clearTimeout(timer));
        return;
      }
      startupHold = false;
      publish({ frozen: false });
    }
    publish({
      shell:
        current?.ready === true && current.shellId === environment.shellId
          ? 'ready'
          : controlling === null && registration.installing !== null
            ? 'checking'
            : 'unavailable',
      releaseId: current?.releaseId ?? null,
      ...(attempt === null && !requesting
        ? {
            update:
              staged?.ready === true
                ? snapshot.update === 'blocked' && blockedWorker === waiting
                  ? ('blocked' as const)
                  : ('waiting' as const)
                : ('none' as const),
          }
        : {}),
    });
    if (controlling !== null && current !== null)
      recovered(controlling, current);
  }

  function acknowledge(
    message: UpdateMessage,
    worker: ServiceWorker,
    ready: boolean,
    type: string,
  ) {
    try {
      worker.postMessage({
        type,
        protocolVersion: 1,
        releaseId: message.releaseId,
        attemptId: message.attemptId,
        ready,
      });
    } catch {
      // Missing acknowledgement fails the worker's bounded transaction closed.
    }
  }

  async function receive(event: MessageEvent<unknown>) {
    const message = updateMessage(event.data);
    if (message === null || disposed || registration === null) return;
    const source = event.source;
    if (
      message.type === 'CANCEL_UPDATE' &&
      preparation !== null &&
      source === preparation.worker &&
      message.releaseId === preparation.releaseId &&
      message.attemptId === preparation.attemptId
    ) {
      blockedWorker = preparation.worker;
      preparation = null;
      if (startupHold) await refresh();
      else publish({ frozen: false, update: 'blocked' });
      return;
    }
    if (
      message.type === 'CANCEL_UPDATE' &&
      startupHold &&
      source === registration.waiting &&
      source !== null
    ) {
      await refresh();
      return;
    }
    if (message.type === 'PREPARE_UPDATE') {
      const waiting = registration.waiting;
      if (
        source !== waiting ||
        waiting === null ||
        attempt !== null ||
        preparation !== null
      )
        return;
      const prepared: UpdateAttempt = {
        worker: waiting,
        releaseId: message.releaseId,
        attemptId: message.attemptId,
        committed: false,
      };
      // Reserve before async status: cancellation may arrive while it is pending.
      preparation = prepared;
      const staged = await status(waiting);
      if (disposed || preparation !== prepared) return;
      preparation = null;
      if (waiting !== registration.waiting) return;
      const ready =
        snapshot.safeBoundary &&
        !snapshot.frozen &&
        waiting.state === 'installed' &&
        staged?.ready === true &&
        staged.releaseId === message.releaseId;
      if (ready) {
        attempt = prepared;
        const stateChanged = () => {
          // Native redundancy proves this worker can no longer activate. A
          // replacement may terminate it before CANCEL_UPDATE reaches the page.
          if (
            attempt !== prepared ||
            waiting.state !== 'redundant' ||
            container?.controller === waiting
          )
            return;
          blockedWorker = waiting;
          attempt = null;
          publish({ frozen: false, update: 'blocked' });
          void refresh();
        };
        waiting.addEventListener('statechange', stateChanged);
        removers.push(() =>
          waiting.removeEventListener('statechange', stateChanged),
        );
        publish({ update: 'preparing' });
      }
      acknowledge(message, waiting, ready, 'UPDATE_READY');
      return;
    }
    if (
      attempt === null ||
      source !== attempt.worker ||
      message.releaseId !== attempt.releaseId ||
      message.attemptId !== attempt.attemptId
    )
      return;
    if (message.type === 'CANCEL_UPDATE') {
      // A cancelled worker transaction cannot authorize later controller recovery.
      blockedWorker = attempt.worker;
      attempt = null;
      publish({ frozen: false, update: 'blocked' });
      return;
    }
    if (message.type === 'FREEZE_UPDATE') {
      const ready = snapshot.safeBoundary && !snapshot.frozen;
      if (ready) publish({ frozen: true, update: 'preparing' });
      acknowledge(message, attempt.worker, ready, 'UPDATE_FROZEN');
      return;
    }
    if (message.type === 'ACTIVATING_UPDATE') {
      const ready = snapshot.frozen && snapshot.safeBoundary;
      if (ready) {
        attempt.committed = true;
        publish({ update: 'recovering' });
      }
      acknowledge(message, attempt.worker, ready, 'UPDATE_ACTIVATING');
    }
  }

  async function controllerChanged() {
    if (container === null || disposed) return;
    const current = ownController(container.controller);
    const authorized = attempt;
    if (current !== null && authorized?.committed === true && snapshot.frozen) {
      const installed = await status(current);
      if (
        !disposed &&
        attempt === authorized &&
        installed?.ready === true &&
        installed.releaseId === authorized.releaseId
      ) {
        if (!reloadIssued) {
          reloadIssued = true;
          environment.reload();
        }
        return;
      }
      // Keep the accepted safe boundary frozen on a mismatched/incomplete controller.
      publish({ shell: 'unavailable' });
      return;
    }
    await refresh();
  }

  function observeInstalling() {
    const installing = registration?.installing;
    if (installing === null || installing === undefined) return;
    const changed = () => {
      void refresh();
    };
    installing.addEventListener('statechange', changed);
    removers.push(() => installing.removeEventListener('statechange', changed));
  }

  return {
    snapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async start() {
      if (started || disposed || container === null) return;
      started = true;
      const changed = () => {
        void controllerChanged();
      };
      const received = (event: MessageEvent<unknown>) => {
        void receive(event);
      };
      container.addEventListener('controllerchange', changed);
      container.addEventListener('message', received);
      removers.push(() =>
        container.removeEventListener('controllerchange', changed),
      );
      removers.push(() => container.removeEventListener('message', received));
      try {
        const existing = await container.getRegistration(baseURL.href);
        if (disposed) return;
        if (existing !== undefined && ownRegistration(existing)) {
          registration = existing;
        } else if (online()) {
          registration = await container.register(workerURL.href, {
            scope: baseURL.pathname,
            updateViaCache: 'none',
            type: 'classic',
          });
        } else {
          startupHold = false;
          publish({ shell: 'unavailable', frozen: false });
          return;
        }
        if (disposed) return;
        const found = () => {
          observeInstalling();
          void refresh();
        };
        registration.addEventListener('updatefound', found);
        removers.push(() =>
          registration?.removeEventListener('updatefound', found),
        );
        observeInstalling();
        await refresh();
        if (online()) {
          // Discovery is optional network work; cached readiness is established
          // independently. Never refresh the worker script on an offline document.
          void registration.update().catch(() => undefined);
        }
      } catch {
        startupHold = false;
        publish({ shell: 'unavailable', frozen: false });
      }
    },
    setSafeBoundary(safe) {
      // A frozen page cannot open a task between acknowledgement and recovery.
      if (!snapshot.frozen) publish({ safeBoundary: safe });
    },
    canInteract: () => !snapshot.frozen,
    async requestUpdate() {
      if (
        disposed ||
        !snapshot.safeBoundary ||
        snapshot.frozen ||
        requesting ||
        registration?.waiting === null ||
        registration?.waiting === undefined
      )
        return;
      const waiting = registration.waiting;
      const staged = await status(waiting);
      if (
        disposed ||
        waiting !== registration.waiting ||
        requesting ||
        !snapshot.safeBoundary ||
        snapshot.frozen
      )
        return;
      if (staged?.ready !== true) {
        blockedWorker = waiting;
        publish({ update: 'blocked' });
        return;
      }
      requesting = true;
      blockedWorker = null;
      publish({ update: 'preparing' });
      // Worker protocol bounds the transaction at five seconds; the reply needs more time.
      const result = await ask(
        waiting,
        { type: 'REQUEST_ACTIVATION', protocolVersion: 1 },
        7_000,
      );
      requesting = false;
      if (disposed) return;
      if (
        !record(result) ||
        result.type !== 'ACTIVATION_RESULT' ||
        result.protocolVersion !== 1 ||
        result.releaseId !== staged.releaseId ||
        result.outcome !== 'activating'
      ) {
        // The worker sends CANCEL_UPDATE to every prepared/frozen participant on failure.
        // Do not independently unlock a committed page while activation can still complete.
        if (attempt?.committed !== true) {
          preparation = null;
          blockedWorker = waiting;
          attempt = null;
          publish({ frozen: false, update: 'blocked' });
        }
      }
    },
    dispose() {
      disposed = true;
      for (const remove of removers) remove();
      listeners.clear();
    },
  };
}
