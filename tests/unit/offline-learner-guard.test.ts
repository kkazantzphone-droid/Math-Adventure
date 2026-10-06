import { describe, expect, it, vi } from 'vitest';
import { createBrowserOfflineController } from '../../src/infrastructure/offline/browserOffline';
import type {
  LearnerDataLifecycle,
  LearnerUpdateIdentity,
} from '../../src/infrastructure/offline/browserOffline';

const scope = 'http://localhost/math-adventure/';
const oldShell = 'a'.repeat(64);
const newShell = 'b'.repeat(64);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

class Worker extends EventTarget {
  readonly messages: Record<string, unknown>[] = [];
  readonly scriptURL = `${scope}sw.js`;
  state = 'installed';
  constructor(
    readonly releaseId: string,
    readonly shellId: string,
  ) {
    super();
  }
  postMessage(message: Record<string, unknown>, transfers?: Transferable[]) {
    this.messages.push(message);
    if (message.type === 'STATUS')
      (transfers?.[0] as MessagePort | undefined)?.postMessage({
        type: 'STATUS',
        protocolVersion: 1,
        releaseId: this.releaseId,
        shellId: this.shellId,
        schemaVersion: 1,
        compatibleSchema: { min: 1, max: 1 },
        ready: true,
        updateInProgress: false,
      });
  }
  native() {
    return this as unknown as ServiceWorker;
  }
}

class Container extends EventTarget {
  controller: ServiceWorker;
  readonly registration: ServiceWorkerRegistration;
  constructor(current: Worker, waiting: Worker) {
    super();
    this.controller = current.native();
    const registration = new EventTarget();
    this.registration = Object.assign(registration, {
      active: current.native(),
      waiting: waiting.native(),
      installing: null,
      scope,
      update: () => Promise.resolve(),
    }) as unknown as ServiceWorkerRegistration;
  }
  getRegistration() {
    return Promise.resolve(this.registration);
  }
  native() {
    return this as unknown as ServiceWorkerContainer;
  }
  message(worker: Worker, type: string, attemptId = 'attempt-1') {
    const event = new Event('message');
    Object.defineProperties(event, {
      source: { value: worker.native() },
      data: {
        value: {
          type,
          protocolVersion: 1,
          releaseId: worker.releaseId,
          attemptId,
        },
      },
    });
    this.dispatchEvent(event);
  }
  control(worker: Worker) {
    this.controller = worker.native();
    this.dispatchEvent(new Event('controllerchange'));
  }
}

function learner() {
  let fenced: LearnerUpdateIdentity | null = null;
  const port = {
    fence: vi.fn((identity: LearnerUpdateIdentity) => {
      fenced = identity;
    }),
    reconcile: vi.fn<LearnerDataLifecycle['reconcile']>(() =>
      Promise.resolve(true),
    ),
    isReady: vi.fn(
      (identity: LearnerUpdateIdentity) =>
        fenced?.releaseId === identity.releaseId &&
        fenced.attemptId === identity.attemptId,
    ),
    cancel: vi.fn((identity: LearnerUpdateIdentity) => {
      if (
        fenced?.releaseId === identity.releaseId &&
        fenced.attemptId === identity.attemptId
      )
        fenced = null;
    }),
    reopen: vi.fn<LearnerDataLifecycle['reopen']>(() => Promise.resolve(true)),
  } satisfies LearnerDataLifecycle;
  return port;
}

function setup(port = learner()) {
  const current = new Worker('release-old', oldShell);
  const waiting = new Worker('release-new', newShell);
  const container = new Container(current, waiting);
  const reload = vi.fn();
  const controller = createBrowserOfflineController({
    serviceWorker: container.native(),
    baseURL: new URL(scope),
    shellId: oldShell,
    reload,
    learnerData: port,
  });
  return { port, current, waiting, container, reload, controller };
}

async function acknowledged(worker: Worker, type: string) {
  await vi.waitFor(() =>
    expect(worker.messages.some((message) => message.type === type)).toBe(true),
  );
  return worker.messages.findLast((message) => message.type === type);
}

async function prepare(state: ReturnType<typeof setup>) {
  await state.controller.start();
  state.controller.setSafeBoundary(true);
  state.container.message(state.waiting, 'PREPARE_UPDATE');
  expect(await acknowledged(state.waiting, 'UPDATE_READY')).toMatchObject({
    ready: true,
  });
}

describe('injected learner data update guards (synthetic port evidence only)', () => {
  it('withholds startup interaction and cache retirement until persistence reopens', async () => {
    const state = setup();
    const recovery = deferred<boolean>();
    state.port.reopen.mockReturnValue(recovery.promise);
    const start = state.controller.start();
    await vi.waitFor(() => expect(state.port.reopen).toHaveBeenCalledOnce());
    expect(state.controller.canInteract()).toBe(false);
    expect(
      state.current.messages.some((m) => m.type === 'CLIENT_RECOVERED'),
    ).toBe(false);
    recovery.resolve(true);
    await start;
    expect(state.port.reopen).toHaveBeenCalledWith({
      releaseId: 'release-old',
      shellId: oldShell,
    });
    expect(state.controller.canInteract()).toBe(true);
    expect(
      state.current.messages.some((m) => m.type === 'CLIENT_RECOVERED'),
    ).toBe(true);
    state.controller.dispose();
  });

  it('synchronously fences PREPARE and waits for receipt/epoch compatibility reconciliation', async () => {
    const state = setup();
    await state.controller.start();
    state.controller.setSafeBoundary(true);
    const pending = deferred<boolean>();
    state.port.reconcile.mockReturnValue(pending.promise);
    state.container.message(state.waiting, 'PREPARE_UPDATE');
    expect(state.port.fence).toHaveBeenCalledOnce();
    expect(state.controller.canInteract()).toBe(false);
    await vi.waitFor(() => expect(state.port.reconcile).toHaveBeenCalledOnce());
    expect(state.waiting.messages.some((m) => m.type === 'UPDATE_READY')).toBe(
      false,
    );
    expect(state.port.reconcile).toHaveBeenCalledWith(
      expect.objectContaining({
        releaseId: 'release-new',
        attemptId: 'attempt-1',
      }),
      { releaseId: 'release-new', shellId: newShell },
    );
    pending.resolve(true);
    expect(await acknowledged(state.waiting, 'UPDATE_READY')).toMatchObject({
      ready: true,
    });
    state.container.message(state.waiting, 'CANCEL_UPDATE');
    expect(state.controller.canInteract()).toBe(true);
    state.controller.dispose();
  });

  it.each(['reconciliation', 'readiness'])(
    'reports UNREADY for unresolved/incompatible learner %s and releases the reversible fence',
    async (failure) => {
      const state = setup();
      await state.controller.start();
      state.controller.setSafeBoundary(true);
      if (failure === 'reconciliation')
        state.port.reconcile.mockResolvedValue(false);
      else state.port.isReady.mockReturnValue(false);
      state.container.message(state.waiting, 'PREPARE_UPDATE');
      expect(await acknowledged(state.waiting, 'UPDATE_READY')).toMatchObject({
        ready: false,
      });
      expect(state.port.cancel).toHaveBeenCalledOnce();
      expect(state.controller.canInteract()).toBe(true);
      state.controller.dispose();
    },
  );

  it('ignores foreign/mismatched cancellation and discards completion after matching cancellation', async () => {
    const state = setup();
    await state.controller.start();
    state.controller.setSafeBoundary(true);
    const pending = deferred<boolean>();
    state.port.reconcile.mockReturnValue(pending.promise);
    state.container.message(state.waiting, 'PREPARE_UPDATE');
    await vi.waitFor(() => expect(state.port.reconcile).toHaveBeenCalledOnce());
    const foreign = new Worker('release-new', newShell);
    state.container.message(foreign, 'CANCEL_UPDATE');
    state.container.message(state.waiting, 'CANCEL_UPDATE', 'stale-attempt');
    expect(state.port.cancel).not.toHaveBeenCalled();
    expect(state.controller.canInteract()).toBe(false);
    state.container.message(state.waiting, 'CANCEL_UPDATE');
    expect(state.port.cancel).toHaveBeenCalledOnce();
    expect(state.controller.canInteract()).toBe(true);
    pending.resolve(true);
    await Promise.resolve();
    expect(state.waiting.messages.some((m) => m.type === 'UPDATE_READY')).toBe(
      false,
    );
    state.controller.dispose();
  });

  it.each(['FREEZE_UPDATE', 'ACTIVATING_UPDATE'])(
    'rereads learner compatibility before %s and refuses a changed epoch or schema',
    async (round) => {
      const state = setup();
      await prepare(state);
      if (round === 'ACTIVATING_UPDATE') {
        state.container.message(state.waiting, 'FREEZE_UPDATE');
        expect(
          await acknowledged(state.waiting, 'UPDATE_FROZEN'),
        ).toMatchObject({ ready: true });
      }
      state.port.reconcile.mockResolvedValue(false);
      state.container.message(state.waiting, round);
      expect(
        await acknowledged(
          state.waiting,
          round === 'FREEZE_UPDATE' ? 'UPDATE_FROZEN' : 'UPDATE_ACTIVATING',
        ),
      ).toMatchObject({ ready: false });
      expect(state.port.reconcile).toHaveBeenCalledTimes(
        round === 'FREEZE_UPDATE' ? 2 : 3,
      );
      expect(state.reload).not.toHaveBeenCalled();
      state.container.message(state.waiting, 'CANCEL_UPDATE');
      expect(state.controller.canInteract()).toBe(true);
      state.controller.dispose();
    },
  );

  it('requires successful post-controller persistence reopening before a committed reload', async () => {
    const state = setup();
    await prepare(state);
    state.container.message(state.waiting, 'FREEZE_UPDATE');
    await acknowledged(state.waiting, 'UPDATE_FROZEN');
    state.container.message(state.waiting, 'ACTIVATING_UPDATE');
    await acknowledged(state.waiting, 'UPDATE_ACTIVATING');
    const recovery = deferred<boolean>();
    state.port.reopen.mockReturnValue(recovery.promise);
    state.container.control(state.waiting);
    await vi.waitFor(() => expect(state.port.reopen).toHaveBeenCalledTimes(2));
    expect(state.port.reopen).toHaveBeenLastCalledWith({
      releaseId: 'release-new',
      shellId: newShell,
    });
    expect(state.reload).not.toHaveBeenCalled();
    expect(state.controller.canInteract()).toBe(false);
    state.container.message(state.waiting, 'CANCEL_UPDATE');
    expect(state.port.cancel).not.toHaveBeenCalled();
    recovery.resolve(true);
    await vi.waitFor(() => expect(state.reload).toHaveBeenCalledOnce());
    expect(state.controller.canInteract()).toBe(false);
    expect(
      state.waiting.messages.some((m) => m.type === 'CLIENT_RECOVERED'),
    ).toBe(false);
    state.controller.dispose();
  });

  it('keeps incompatible post-controller data frozen without reload or cache-retirement acknowledgement', async () => {
    const state = setup();
    await prepare(state);
    state.container.message(state.waiting, 'FREEZE_UPDATE');
    await acknowledged(state.waiting, 'UPDATE_FROZEN');
    state.container.message(state.waiting, 'ACTIVATING_UPDATE');
    await acknowledged(state.waiting, 'UPDATE_ACTIVATING');
    state.port.reopen.mockResolvedValue(false);
    state.container.control(state.waiting);
    await vi.waitFor(() =>
      expect(state.controller.snapshot().shell).toBe('unavailable'),
    );
    expect(state.controller.canInteract()).toBe(false);
    expect(state.reload).not.toHaveBeenCalled();
    expect(
      state.waiting.messages.some((m) => m.type === 'CLIENT_RECOVERED'),
    ).toBe(false);
    state.controller.dispose();
  });

  it('keeps learner recovery distinct from unsupported service workers', async () => {
    const port = learner();
    port.reopen.mockResolvedValue(false);
    const controller = createBrowserOfflineController({
      serviceWorker: null,
      baseURL: new URL(scope),
      shellId: oldShell,
      reload: vi.fn(),
      learnerData: port,
    });
    await controller.start();
    expect(port.reopen).toHaveBeenCalledWith({
      releaseId: null,
      shellId: oldShell,
    });
    expect(controller.snapshot().shell).toBe('unsupported');
    expect(controller.canInteract()).toBe(false);
    controller.dispose();
  });

  it('cannot release a newer fence when an earlier reconciliation finishes after cancellation', async () => {
    const state = setup();
    await state.controller.start();
    state.controller.setSafeBoundary(true);
    const earlier = deferred<boolean>();
    state.port.reconcile.mockReturnValueOnce(earlier.promise);
    state.container.message(state.waiting, 'PREPARE_UPDATE');
    await vi.waitFor(() => expect(state.port.reconcile).toHaveBeenCalledOnce());
    state.container.message(state.waiting, 'CANCEL_UPDATE');
    state.container.message(state.waiting, 'PREPARE_UPDATE', 'attempt-2');
    expect(await acknowledged(state.waiting, 'UPDATE_READY')).toMatchObject({
      ready: true,
      attemptId: 'attempt-2',
    });
    earlier.resolve(true);
    await Promise.resolve();
    expect(state.controller.canInteract()).toBe(false);
    expect(state.port.cancel).toHaveBeenCalledOnce();
    expect(
      state.waiting.messages.filter((m) => m.type === 'UPDATE_READY'),
    ).toHaveLength(1);
    state.container.message(state.waiting, 'CANCEL_UPDATE', 'attempt-2');
    expect(state.controller.canInteract()).toBe(true);
    state.controller.dispose();
  });

  it('retains a recovery boundary when cancellation cannot safely release learner commands', async () => {
    const state = setup();
    await prepare(state);
    state.port.cancel.mockImplementation(() => {
      throw new Error('synthetic release refusal');
    });
    state.container.message(state.waiting, 'CANCEL_UPDATE');
    expect(state.controller.canInteract()).toBe(false);
    expect(state.controller.snapshot().frozen).toBe(true);
    expect(state.controller.snapshot().update).toBe('blocked');
    state.controller.dispose();
  });

  it.each(['fence', 'reconcile', 'isReady'] as const)(
    'fails readiness closed if the injected %s guard throws',
    async (method) => {
      const state = setup();
      await state.controller.start();
      state.controller.setSafeBoundary(true);
      state.port[method].mockImplementation(() => {
        throw new Error('synthetic guard failure');
      });
      state.container.message(state.waiting, 'PREPARE_UPDATE');
      expect(await acknowledged(state.waiting, 'UPDATE_READY')).toMatchObject({
        ready: false,
      });
      expect(state.reload).not.toHaveBeenCalled();
      state.controller.dispose();
    },
  );
});
