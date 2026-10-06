import { describe, expect, it, vi } from 'vitest';
import { createBrowserOfflineController } from '../../src/infrastructure/offline/browserOffline';

const oldShell = 'a'.repeat(64);
const newShell = 'b'.repeat(64);

function status(releaseId = 'release-old', shellId = oldShell) {
  return {
    type: 'STATUS',
    protocolVersion: 1,
    releaseId,
    shellId,
    schemaVersion: 1,
    compatibleSchema: { min: 1, max: 1 },
    ready: true,
    updateInProgress: false,
  };
}

class Worker extends EventTarget {
  readonly messages: Record<string, unknown>[] = [];
  response: unknown;
  activationResponse: unknown = null;
  state = 'installed';
  scriptURL = 'http://localhost/math-adventure/sw.js';
  constructor(response: unknown) {
    super();
    this.response = response;
  }
  postMessage(message: Record<string, unknown>, transfers?: Transferable[]) {
    this.messages.push(message);
    const port = transfers?.[0] as MessagePort | undefined;
    if (message.type === 'STATUS') port?.postMessage(this.response);
    if (message.type === 'REQUEST_ACTIVATION')
      port?.postMessage(this.activationResponse);
  }
  native() {
    return this as unknown as ServiceWorker;
  }
}

class Registration extends EventTarget {
  installing = null;
  active: ServiceWorker | null = null;
  scope = 'http://localhost/math-adventure/';
  readonly update = vi.fn(() => Promise.resolve(this.native()));
  waiting: ServiceWorker | null;
  constructor(waiting: Worker | null) {
    super();
    this.waiting = waiting?.native() ?? null;
  }
  native() {
    return this as unknown as ServiceWorkerRegistration;
  }
}

class Container extends EventTarget {
  controller: ServiceWorker | null;
  readonly registration: Registration;
  readonly register: ReturnType<
    typeof vi.fn<
      (
        url: string,
        options: RegistrationOptions,
      ) => Promise<ServiceWorkerRegistration>
    >
  >;
  readonly getRegistration = vi.fn<
    () => Promise<ServiceWorkerRegistration | undefined>
  >(() => Promise.resolve(undefined));
  constructor(
    current: Worker | null,
    waiting: Worker | null,
    scope = 'http://localhost/math-adventure/',
  ) {
    super();
    this.controller = current?.native() ?? null;
    this.registration = new Registration(waiting);
    this.registration.active = current?.native() ?? null;
    this.registration.scope = scope;
    for (const worker of [current, waiting]) {
      if (worker !== null) worker.scriptURL = new URL('sw.js', scope).href;
    }
    this.register = vi.fn(() => Promise.resolve(this.registration.native()));
  }
  native() {
    return this as unknown as ServiceWorkerContainer;
  }
  message(
    worker: Worker,
    type: string,
    releaseId = 'release-new',
    attemptId = 'attempt-1',
  ) {
    const event = new Event('message');
    Object.defineProperties(event, {
      source: { value: worker.native() },
      data: { value: { type, protocolVersion: 1, releaseId, attemptId } },
    });
    this.dispatchEvent(event);
  }
  control(worker: Worker) {
    this.controller = worker.native();
    this.dispatchEvent(new Event('controllerchange'));
  }
}

async function setup() {
  const current = new Worker(status());
  const waiting = new Worker(status('release-new', newShell));
  const container = new Container(current, waiting);
  const reload = vi.fn();
  const freeze = vi.fn();
  const controller = createBrowserOfflineController({
    serviceWorker: container.native(),
    baseURL: new URL('http://localhost/math-adventure/'),
    shellId: oldShell,
    reload,
    onFreeze: freeze,
  });
  await controller.start();
  return { current, waiting, container, reload, freeze, controller };
}

async function acknowledgement(worker: Worker, type: string) {
  await vi.waitFor(() =>
    expect(worker.messages.some((message) => message.type === type)).toBe(true),
  );
  return worker.messages.findLast((message) => message.type === type);
}

describe('production offline browser client protocol (synthetic mocks)', () => {
  it('reuses an exact existing registration offline without refreshing its worker script', async () => {
    const current = new Worker(status());
    const container = new Container(current, null);
    container.getRegistration.mockResolvedValue(
      container.registration.native(),
    );
    const controller = createBrowserOfflineController({
      serviceWorker: container.native(),
      baseURL: new URL('http://localhost/math-adventure/'),
      shellId: oldShell,
      reload: vi.fn(),
      online: () => false,
    });
    await controller.start();
    expect(container.register).not.toHaveBeenCalled();
    expect(container.registration.update).not.toHaveBeenCalled();
    expect(controller.snapshot().shell).toBe('ready');
    expect(controller.canInteract()).toBe(true);
    controller.dispose();
  });

  it('never reuses a broader or unrelated worker to claim subpath readiness or force recovery', async () => {
    const current = new Worker(status('unrelated-release', newShell));
    const container = new Container(current, null, 'http://localhost/');
    container.getRegistration.mockResolvedValue(
      container.registration.native(),
    );
    const reload = vi.fn();
    const controller = createBrowserOfflineController({
      serviceWorker: container.native(),
      baseURL: new URL('http://localhost/math-adventure/'),
      shellId: oldShell,
      reload,
      online: () => false,
    });
    await controller.start();
    expect(container.register).not.toHaveBeenCalled();
    expect(container.registration.update).not.toHaveBeenCalled();
    expect(current.messages).toEqual([]);
    expect(controller.snapshot().shell).toBe('unavailable');
    expect(controller.canInteract()).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('does not attempt first registration without connectivity, while visual interaction remains usable', async () => {
    const container = new Container(null, null);
    const controller = createBrowserOfflineController({
      serviceWorker: container.native(),
      baseURL: new URL('http://localhost/math-adventure/'),
      shellId: oldShell,
      reload: vi.fn(),
      online: () => false,
    });
    await controller.start();
    expect(container.register).not.toHaveBeenCalled();
    expect(controller.snapshot().shell).toBe('unavailable');
    expect(controller.canInteract()).toBe(true);
    controller.dispose();
  });

  it('registers exactly the scoped same-origin worker once and separates complete readiness from a staged update', async () => {
    const { controller, container, current } = await setup();
    await controller.start();
    expect(container.register).toHaveBeenCalledExactlyOnceWith(
      'http://localhost/math-adventure/sw.js',
      {
        scope: '/math-adventure/',
        updateViaCache: 'none',
        type: 'classic',
      },
    );
    expect(controller.snapshot()).toEqual({
      shell: 'ready',
      update: 'waiting',
      frozen: false,
      safeBoundary: false,
      releaseId: 'release-old',
    });
    expect(current.messages).toContainEqual({
      type: 'CLIENT_RECOVERED',
      protocolVersion: 1,
      shellId: oldShell,
    });
    controller.dispose();
  });

  it('withholds readiness off Home and refuses arbitrary worker sources', async () => {
    const { controller, container, waiting } = await setup();
    const foreign = new Worker(status('release-new', newShell));
    container.message(foreign, 'PREPARE_UPDATE');
    container.message(waiting, 'PREPARE_UPDATE');
    expect(await acknowledgement(waiting, 'UPDATE_READY')).toMatchObject({
      ready: false,
    });
    expect(foreign.messages).toEqual([]);
    expect(controller.canInteract()).toBe(true);
    controller.dispose();
  });

  it('rechecks Home at freeze so an activity opened after initial readiness cannot be committed', async () => {
    const { controller, container, waiting } = await setup();
    controller.setSafeBoundary(true);
    container.message(waiting, 'PREPARE_UPDATE');
    expect(await acknowledgement(waiting, 'UPDATE_READY')).toMatchObject({
      ready: true,
    });
    controller.setSafeBoundary(false);
    container.message(waiting, 'FREEZE_UPDATE');
    expect(await acknowledgement(waiting, 'UPDATE_FROZEN')).toMatchObject({
      ready: false,
    });
    expect(controller.snapshot().frozen).toBe(false);
    controller.dispose();
  });

  it('freezes before its acknowledgement, prevents reopening tasks, and coherently reloads once only after committed expected control', async () => {
    const { controller, container, waiting, reload, freeze } = await setup();
    controller.setSafeBoundary(true);
    container.message(waiting, 'PREPARE_UPDATE');
    await acknowledgement(waiting, 'UPDATE_READY');
    container.message(waiting, 'FREEZE_UPDATE');
    expect(await acknowledgement(waiting, 'UPDATE_FROZEN')).toMatchObject({
      ready: true,
    });
    expect(freeze).toHaveBeenLastCalledWith(true);
    expect(controller.canInteract()).toBe(false);
    controller.setSafeBoundary(false);
    expect(controller.snapshot().safeBoundary).toBe(true);
    container.message(waiting, 'ACTIVATING_UPDATE');
    expect(await acknowledgement(waiting, 'UPDATE_ACTIVATING')).toMatchObject({
      ready: true,
    });
    container.control(waiting);
    container.control(waiting);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(controller.snapshot().update).toBe('recovering');
    controller.dispose();
  });

  it('unlocks a cancelled matching attempt and ignores a mismatched cancellation token', async () => {
    const { controller, container, waiting } = await setup();
    controller.setSafeBoundary(true);
    container.message(waiting, 'PREPARE_UPDATE');
    await acknowledgement(waiting, 'UPDATE_READY');
    container.message(waiting, 'FREEZE_UPDATE');
    await acknowledgement(waiting, 'UPDATE_FROZEN');
    container.message(
      waiting,
      'CANCEL_UPDATE',
      'release-new',
      'another-attempt',
    );
    expect(controller.canInteract()).toBe(false);
    container.message(waiting, 'CANCEL_UPDATE');
    expect(controller.canInteract()).toBe(true);
    expect(controller.snapshot().update).toBe('blocked');
    controller.dispose();
  });

  it('does not force an interacting document to reload on an unauthorized controller change', async () => {
    const { controller, container, waiting, reload } = await setup();
    container.control(waiting);
    await vi.waitFor(() =>
      expect(controller.snapshot().shell).toBe('unavailable'),
    );
    expect(reload).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('keeps a blocked attempt observable when a prior passive readiness refresh completes late', async () => {
    const { controller, container, waiting } = await setup();
    controller.setSafeBoundary(true);
    container.message(waiting, 'PREPARE_UPDATE');
    await acknowledgement(waiting, 'UPDATE_READY');
    const original = waiting.postMessage.bind(waiting);
    const held: MessagePort[] = [];
    waiting.postMessage = (message, transfers) => {
      if (message.type === 'STATUS') {
        const port = transfers?.[0] as MessagePort | undefined;
        if (port !== undefined) held.push(port);
      } else original(message, transfers);
    };
    container.registration.dispatchEvent(new Event('updatefound'));
    await vi.waitFor(() => expect(held).toHaveLength(1));
    container.message(waiting, 'CANCEL_UPDATE');
    expect(controller.snapshot().update).toBe('blocked');
    for (const port of held) port.postMessage(waiting.response);
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    expect(controller.snapshot().update).toBe('blocked');
    controller.dispose();
  });

  it('cancels an in-flight preparation before its delayed status can recreate the abandoned attempt', async () => {
    const { controller, container, waiting } = await setup();
    controller.setSafeBoundary(true);
    const original = waiting.postMessage.bind(waiting);
    const held: MessagePort[] = [];
    waiting.postMessage = (message, transfers) => {
      if (message.type === 'STATUS') {
        const port = transfers?.[0] as MessagePort | undefined;
        if (port !== undefined) held.push(port);
      } else original(message, transfers);
    };
    container.message(waiting, 'PREPARE_UPDATE');
    await vi.waitFor(() => expect(held).toHaveLength(1));
    container.message(waiting, 'CANCEL_UPDATE');
    for (const port of held) port.postMessage(waiting.response);
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    expect(controller.snapshot().update).toBe('blocked');
    expect(controller.canInteract()).toBe(true);
    expect(
      waiting.messages.some((message) => message.type === 'UPDATE_READY'),
    ).toBe(false);
    waiting.postMessage = original;
    container.message(waiting, 'PREPARE_UPDATE', 'release-new', 'attempt-2');
    expect(await acknowledgement(waiting, 'UPDATE_READY')).toMatchObject({
      ready: true,
      attemptId: 'attempt-2',
    });
    controller.dispose();
  });

  it('releases a frozen committed attempt when its native waiting worker is superseded, and ignores its stale messages', async () => {
    const { controller, container, waiting, reload } = await setup();
    controller.setSafeBoundary(true);
    container.message(waiting, 'PREPARE_UPDATE');
    await acknowledgement(waiting, 'UPDATE_READY');
    container.message(waiting, 'FREEZE_UPDATE');
    await acknowledgement(waiting, 'UPDATE_FROZEN');
    container.message(waiting, 'ACTIVATING_UPDATE');
    await acknowledgement(waiting, 'UPDATE_ACTIVATING');
    expect(controller.canInteract()).toBe(false);
    const replacement = new Worker(status('release-third', 'c'.repeat(64)));
    container.registration.waiting = replacement.native();
    waiting.state = 'redundant';
    waiting.dispatchEvent(new Event('statechange'));
    expect(controller.canInteract()).toBe(true);
    expect(controller.snapshot().update).toBe('blocked');
    container.message(waiting, 'ACTIVATING_UPDATE');
    container.message(waiting, 'FREEZE_UPDATE');
    expect(controller.canInteract()).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    await vi.waitFor(() =>
      expect(controller.snapshot().update).toBe('waiting'),
    );
    controller.dispose();
  });

  it('does not recover a committed page into an incomplete or wrong release', async () => {
    const { controller, container, waiting, reload } = await setup();
    controller.setSafeBoundary(true);
    container.message(waiting, 'PREPARE_UPDATE');
    await acknowledgement(waiting, 'UPDATE_READY');
    container.message(waiting, 'FREEZE_UPDATE');
    await acknowledgement(waiting, 'UPDATE_FROZEN');
    container.message(waiting, 'ACTIVATING_UPDATE');
    await acknowledgement(waiting, 'UPDATE_ACTIVATING');
    container.control(new Worker(status('unexpected-release', newShell)));
    await vi.waitFor(() =>
      expect(controller.snapshot().shell).toBe('unavailable'),
    );
    expect(reload).not.toHaveBeenCalled();
    expect(controller.canInteract()).toBe(false);
    controller.dispose();
  });

  it('does not unlock a committed page solely because its current controller becomes redundant', async () => {
    const { controller, container, waiting, reload } = await setup();
    controller.setSafeBoundary(true);
    container.message(waiting, 'PREPARE_UPDATE');
    await acknowledgement(waiting, 'UPDATE_READY');
    container.message(waiting, 'FREEZE_UPDATE');
    await acknowledgement(waiting, 'UPDATE_FROZEN');
    container.message(waiting, 'ACTIVATING_UPDATE');
    await acknowledgement(waiting, 'UPDATE_ACTIVATING');
    container.controller = waiting.native();
    waiting.state = 'redundant';
    waiting.dispatchEvent(new Event('statechange'));
    expect(controller.canInteract()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('requires an explicit Home action and retains usability after worker-blocked activation', async () => {
    const { controller, waiting } = await setup();
    await controller.requestUpdate();
    expect(
      waiting.messages.some((message) => message.type === 'REQUEST_ACTIVATION'),
    ).toBe(false);
    controller.setSafeBoundary(true);
    waiting.activationResponse = {
      type: 'ACTIVATION_RESULT',
      protocolVersion: 1,
      releaseId: 'release-new',
      outcome: 'blocked',
      code: 'unready',
    };
    await controller.requestUpdate();
    expect(controller.snapshot().update).toBe('blocked');
    expect(controller.canInteract()).toBe(true);
    controller.dispose();
  });

  it('shows a blocked retry outcome when an explicit update cannot reconfirm staged readiness', async () => {
    const { controller, waiting } = await setup();
    controller.setSafeBoundary(true);
    waiting.response = null;
    await controller.requestUpdate();
    expect(controller.snapshot().update).toBe('blocked');
    expect(controller.canInteract()).toBe(true);
    expect(
      waiting.messages.some((message) => message.type === 'REQUEST_ACTIVATION'),
    ).toBe(false);
    controller.dispose();
  });

  it('withholds first interaction until startup status and recovers a mismatched shell before any task can start', async () => {
    const current = new Worker(status('release-new', newShell));
    const container = new Container(current, null, 'http://localhost/');
    const reload = vi.fn();
    const controller = createBrowserOfflineController({
      serviceWorker: container.native(),
      baseURL: new URL('http://localhost/'),
      shellId: oldShell,
      reload,
    });
    expect(controller.canInteract()).toBe(false);
    await controller.start();
    expect(controller.canInteract()).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('never marks incompatible or incomplete worker data ready', async () => {
    const current = new Worker({
      ...status(),
      compatibleSchema: { min: 2, max: 2 },
    });
    const container = new Container(current, null, 'http://localhost/');
    const controller = createBrowserOfflineController({
      serviceWorker: container.native(),
      baseURL: new URL('http://localhost/'),
      shellId: oldShell,
      reload: vi.fn(),
    });
    await controller.start();
    expect(controller.snapshot().shell).toBe('unavailable');
    expect(
      current.messages.some((message) => message.type === 'CLIENT_RECOVERED'),
    ).toBe(false);
    expect(controller.canInteract()).toBe(true);
    controller.dispose();
  });

  it('keeps visual interaction available when registration or support is unavailable', async () => {
    const unsupported = createBrowserOfflineController({
      serviceWorker: null,
      baseURL: new URL('http://localhost/'),
      shellId: oldShell,
      reload: vi.fn(),
    });
    await unsupported.start();
    expect(unsupported.snapshot().shell).toBe('unsupported');
    expect(unsupported.canInteract()).toBe(true);
    const container = new Container(null, null, 'http://localhost/');
    container.register.mockRejectedValue(new Error('denied'));
    const failed = createBrowserOfflineController({
      serviceWorker: container.native(),
      baseURL: new URL('http://localhost/'),
      shellId: oldShell,
      reload: vi.fn(),
    });
    await failed.start();
    expect(failed.snapshot().shell).toBe('unavailable');
    expect(failed.canInteract()).toBe(true);
    failed.dispose();
    unsupported.dispose();
  });
});
