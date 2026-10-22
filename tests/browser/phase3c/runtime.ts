import {
  createSyntheticLoopBackup,
  createSyntheticLoopRestorePlan,
  createSyntheticLoopSession,
  syntheticLoopCodec,
  syntheticLoopRecordId,
} from '../../../src/application/synthetic-loop';
import type {
  LoopPreferences,
  SyntheticLoopRecord,
  ValidatedSyntheticBackup,
} from '../../../src/application/synthetic-loop';
import type { RepositoryCommand } from '../../../src/application/ports/repository';
import type {
  BackupPreparation,
  DestinationCheck,
  RestoreOutcome,
} from '../../../src/ui/synthetic-loop/BackupRestore';
import {
  destinationEpoch,
  probeSyntheticLoopDestination,
  readSyntheticLoopWorld,
  restoreSyntheticLoopWorld,
  verifySyntheticLoopRestore,
} from '../../../src/infrastructure/persistence/synthetic-loop-backup';
import type { SyntheticProfileId } from '../../../src/domain/adaptation/types';
import { SYNTHETIC_PROFILE_IDS } from '../../../src/domain/adaptation/types';
import type { AtomicRecordRepository } from '../../../src/application/ports/repository';
import { applicationFailure } from '../../../src/application/core/result';
import { createIndexedDbRepository } from '../../../src/infrastructure/persistence/adapter';
import type {
  IndexedDbRepositoryHandle,
  WriteFault,
} from '../../../src/infrastructure/persistence/adapter';
import {
  openSyntheticLoopDatabase,
  validateSyntheticLoopDatabase,
  SYNTHETIC_LOOP_RECEIPT_LIMIT,
} from '../../../src/infrastructure/persistence/synthetic-loop-database';
import type {
  LearnerDataLifecycle,
  LearnerShellIdentity,
  LearnerUpdateIdentity,
} from '../../../src/infrastructure/offline/browserOffline';

/** Developer-only runtime. Normal composition cannot reach this module. */
export function createSliceRuntime(baseURL: URL) {
  let handle: IndexedDbRepositoryHandle<SyntheticLoopRecord> | null = null;
  let session = createSyntheticLoopSession(null);
  let selected: SyntheticProfileId | null = null;
  let generation = 0;
  let held: (() => void)[] = [];
  let hold = false;
  let fault: WriteFault;
  let attempt: LearnerUpdateIdentity | null = null;
  let recovering = false;
  let recoveryError: string | null = null;
  let compatible = false;
  let restoring = false;
  let restoreHold = false;
  let restoreHeld: (() => void)[] = [];
  // Same destination operation IDs for an identical retry/check: exact receipts
  // make a repeated commit impossible. Cleared only after verified readback.
  let unresolvedRestore: {
    readonly backup: ValidatedSyntheticBackup;
    readonly plan: readonly RepositoryCommand<SyntheticLoopRecord>[];
  } | null = null;
  const selections = new Set<Promise<void>>();
  const commands = new Set<Promise<unknown>>();
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const matches = (id: LearnerUpdateIdentity) =>
    attempt?.attemptId === id.attemptId && attempt.releaseId === id.releaseId;

  function wrap(
    repository: AtomicRecordRepository<SyntheticLoopRecord>,
  ): AtomicRecordRepository<SyntheticLoopRecord> {
    const lease = generation;
    return {
      getEpoch: () => repository.getEpoch(),
      load: (id) => repository.load(id),
      execute: (command) => {
        const work = (async () => {
          if (hold) await new Promise<void>((resolve) => held.push(resolve));
          if (lease !== generation)
            return applicationFailure('operation_conflict');
          return repository.execute(command);
        })();
        commands.add(work);
        notify();
        void work
          .finally(() => {
            commands.delete(work);
            notify();
          })
          .catch(() => undefined);
        return work;
      },
    };
  }

  async function connect(bootstrap: boolean, token: number): Promise<boolean> {
    const opened = await openSyntheticLoopDatabase({ bootstrap });
    if (token !== generation) {
      if (opened.ok) opened.value.close();
      return false;
    }
    if (!opened.ok) {
      recoveryError = opened.error.code;
      return false;
    }
    const valid = await validateSyntheticLoopDatabase(opened.value);
    if (token !== generation) {
      opened.value.close();
      return false;
    }
    if (!valid.ok) {
      opened.value.close();
      recoveryError = valid.error.code;
      return false;
    }
    const created = createIndexedDbRepository(
      opened.value,
      syntheticLoopCodec,
      { receiptCapacity: SYNTHETIC_LOOP_RECEIPT_LIMIT, fault: () => fault },
    );
    if (!created.ok) {
      opened.value.close();
      recoveryError = created.error.code;
      return false;
    }
    session.invalidate();
    handle?.close();
    handle = created.value;
    session = createSyntheticLoopSession(wrap(handle.repository));
    recoveryError = null;
    return true;
  }

  async function inspect(requireSettled = true): Promise<boolean> {
    if (!handle || handle.isRevoked()) return false;
    const opened = await openSyntheticLoopDatabase({ bootstrap: false });
    if (!opened.ok) return false;
    const valid = await validateSyntheticLoopDatabase(opened.value);
    opened.value.close();
    if (!valid.ok) return false;
    const before = await handle.repository.getEpoch();
    if (!before.ok) return false;
    for (const profile of SYNTHETIC_PROFILE_IDS) {
      const id = syntheticLoopRecordId(profile);
      if (!id.ok) return false;
      const row = await handle.repository.load(id.value);
      if (!row.ok && row.error.code !== 'record_not_found') return false;
      if (
        row.ok &&
        (row.value.storageEpoch !== before.value ||
          (requireSettled && row.value.payload.pending !== null) ||
          !syntheticLoopCodec.decode(row.value.payload).ok)
      )
        return false;
      const selectedSnapshot = session.state().snapshot;
      if (
        row.ok &&
        selectedSnapshot?.recordId === row.value.recordId &&
        (selectedSnapshot.revision !== row.value.revision ||
          selectedSnapshot.storageEpoch !== row.value.storageEpoch)
      )
        return false;
    }
    const after = await handle.repository.getEpoch();
    return after.ok && after.value === before.value;
  }

  /** Read the target worker's verified owned cache, with no network learner data.
   * Shell schema 1 never establishes compatibility with learner layout/records.
   */
  async function targetReader(shell: LearnerShellIdentity): Promise<boolean> {
    if (shell.releaseId === null) return true;
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration(
      baseURL.href,
    );
    const workers = [registration?.waiting, registration?.active];
    for (const worker of workers) {
      if (!worker || worker.scriptURL !== new URL('sw.js', baseURL).href)
        continue;
      const status: unknown = await new Promise((resolve) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => {
          channel.port1.close();
          channel.port2.close();
          resolve(null);
        }, 1500);
        channel.port1.onmessage = (event: MessageEvent<unknown>) => {
          clearTimeout(timer);
          channel.port1.close();
          channel.port2.close();
          resolve(event.data);
        };
        worker.postMessage({ type: 'STATUS', protocolVersion: 1 }, [
          channel.port2,
        ]);
      });
      if (!status || typeof status !== 'object') continue;
      const data = status as Record<string, unknown>;
      const url = new URL('learner-reader.json', baseURL).href;
      if (
        data.releaseId !== shell.releaseId ||
        data.shellId !== shell.shellId ||
        data.ready !== true ||
        typeof data.cacheName !== 'string' ||
        !Array.isArray(data.essentialURLs) ||
        !data.essentialURLs.includes(url)
      )
        continue;
      if (!(await caches.keys()).includes(data.cacheName)) return false;
      const response = await (await caches.open(data.cacheName)).match(url);
      if (!response) return false;
      const text = await response.text();
      return (
        text ===
        JSON.stringify({
          schema: 'growing-world-learner-reader-v2',
          layout: 2,
          recordSchema: syntheticLoopCodec.schema,
          payloadSchemas: [
            'phase3c-synthetic-loop-v1',
            'growing-world-synthetic-loop-v2',
          ],
        })
      );
    }
    return false;
  }

  const learnerData: LearnerDataLifecycle = {
    fence(identity) {
      attempt = identity;
      compatible = false;
      session.freeze();
      notify();
    },
    async reconcile(identity, shell) {
      if (
        !matches(identity) ||
        recovering ||
        restoring ||
        selections.size ||
        commands.size ||
        held.length ||
        session.state().busy ||
        session.state().uncertain ||
        session.state().record?.pending
      )
        return false;
      const token = generation;
      const reader = await targetReader(shell);
      if (!matches(identity) || token !== generation || !reader) return false;
      const valid = handle ? await inspect() : false;
      if (!matches(identity) || token !== generation || !valid) return false;
      if (selected && !session.isUpdateReady()) return false;
      if (!matches(identity) || token !== generation) return false;
      compatible = true;
      notify();
      return true;
    },
    isReady(identity) {
      const state = session.state();
      return (
        matches(identity) &&
        compatible &&
        !recovering &&
        !restoring &&
        !selections.size &&
        !commands.size &&
        !held.length &&
        !state.busy &&
        !state.uncertain &&
        !state.record?.pending &&
        (!selected || session.isUpdateReady())
      );
    },
    cancel(identity) {
      if (!matches(identity)) return;
      attempt = null;
      compatible = false;
      session.unfreeze();
      notify();
    },
    async reopen(shell) {
      recovering = true;
      compatible = false;
      session.freeze();
      notify();
      await Promise.allSettled([...selections]);
      await Promise.allSettled([...commands]);
      const token = ++generation;
      const reader = await targetReader(shell);
      if (token !== generation) return false;
      if (!reader) {
        recoveryError = 'unsupported_schema';
        recovering = false;
        notify();
        return false;
      }
      // With no profile selected, no record is opened/created. Selection is an
      // explicit later bootstrap; a missing store never reconstructs stale data.
      if (!selected) {
        recovering = false;
        session.unfreeze();
        notify();
        return true;
      }
      if (
        session.state().record &&
        session.state().snapshot === null &&
        !session.state().uncertain &&
        !session.state().readOnly
      ) {
        recovering = false;
        session.unfreeze();
        notify();
        return true;
      }
      const opened = await connect(false, token);
      if (token !== generation) return false;
      if (opened) {
        const loaded = await session.selectProfile(selected);
        if (token !== generation) return false;
        const safeRecovery =
          session.state().readOnly &&
          session.state().snapshot !== null &&
          session.state().error === 'epoch_conflict';
        if ((!loaded.ok && !safeRecovery) || !(await inspect(false)))
          recoveryError = loaded.ok ? 'unsupported_schema' : loaded.error.code;
      }
      recovering = false;
      if (opened && recoveryError === null) {
        session.unfreeze();
        notify();
        return true;
      }
      session.freeze();
      notify();
      return false;
    },
  };

  function restoreBlocked(): boolean {
    const state = session.state();
    return (
      recovering ||
      restoring ||
      attempt !== null ||
      selections.size > 0 ||
      commands.size > 0 ||
      held.length > 0 ||
      state.busy ||
      state.record?.pending != null
    );
  }

  async function withOwnedDatabase<R>(
    bootstrap: boolean,
    use: (database: IDBDatabase) => Promise<R>,
    unavailable: R,
  ): Promise<R> {
    const opened = await openSyntheticLoopDatabase({ bootstrap });
    if (!opened.ok) return unavailable;
    try {
      const valid = await validateSyntheticLoopDatabase(opened.value);
      return valid.ok ? await use(opened.value) : unavailable;
    } finally {
      opened.value.close();
    }
  }

  /** Read-only native snapshot; unsaved play and other windows' writes in
   * progress cannot enter it. Nothing is written or repaired. */
  async function prepareBackup(): Promise<BackupPreparation> {
    const destination = await probeSyntheticLoopDestination();
    if (!destination.ok) return { kind: 'failed' };
    if (destination.value.kind !== 'occupied') return { kind: 'nothing-saved' };
    return withOwnedDatabase<BackupPreparation>(
      false,
      async (database) => {
        const world = await readSyntheticLoopWorld(database);
        if (!world.ok) return { kind: 'failed' };
        const file = createSyntheticLoopBackup(world.value.records);
        return file.ok
          ? { kind: 'ready', file: file.value }
          : file.error.code === 'nothing_saved'
            ? { kind: 'nothing-saved' }
            : { kind: 'failed' };
      },
      { kind: 'failed' },
    );
  }

  async function inspectDestination(): Promise<DestinationCheck> {
    const probe = await probeSyntheticLoopDestination();
    if (!probe.ok) return { kind: 'unavailable' };
    if (probe.value.kind === 'occupied')
      return { kind: 'occupied', profiles: probe.value.profiles };
    const epoch = destinationEpoch(probe.value);
    return epoch.ok
      ? {
          kind: 'available',
          epoch: epoch.value,
          fresh: probe.value.kind === 'absent',
        }
      : { kind: 'unavailable' };
  }

  async function readback(
    plan: readonly RepositoryCommand<SyntheticLoopRecord>[],
    knownPresent: boolean,
  ) {
    // Probing first keeps a check in a never-used browser from creating storage.
    const probe = knownPresent ? null : await probeSyntheticLoopDestination();
    if (probe?.ok && probe.value.kind === 'absent')
      return { ok: true as const, value: 'absent' as const };
    return withOwnedDatabase(
      false,
      (database) => verifySyntheticLoopRestore(database, plan),
      applicationFailure('storage_unavailable'),
    );
  }

  async function restore(
    backup: ValidatedSyntheticBackup,
    epoch: number,
  ): Promise<RestoreOutcome> {
    if (restoreBlocked()) return { kind: 'not-restored', reason: 'blocked' };
    restoring = true;
    // Restore is an explicit parent boundary: close this window's open badge
    // and fence obsolete callbacks. It never reuses the closed session.
    ++generation;
    session.invalidate();
    handle?.close();
    handle = null;
    selected = null;
    session = createSyntheticLoopSession(null);
    notify();
    try {
      let plan =
        unresolvedRestore?.backup === backup &&
        unresolvedRestore.plan[0]?.storageEpoch === epoch
          ? unresolvedRestore.plan
          : null;
      if (!plan) {
        const created = createSyntheticLoopRestorePlan(
          backup,
          epoch,
          backup.profiles.map(() => `synthetic-restore-${crypto.randomUUID()}`),
        );
        if (!created.ok) return { kind: 'not-restored', reason: 'unavailable' };
        plan = created.value;
      }
      unresolvedRestore = { backup, plan };
      if (restoreHold)
        await new Promise<void>((resolve) => restoreHeld.push(resolve));
      const selectedPlan = plan;
      // Explicit parent confirmation is the bootstrap authority for a browser
      // that never saved. Restore itself never deletes or resets a database.
      const committed = await withOwnedDatabase(
        true,
        (database) =>
          restoreSyntheticLoopWorld(database, selectedPlan, {
            receiptCapacity: SYNTHETIC_LOOP_RECEIPT_LIMIT,
            fault: () => fault,
          }),
        applicationFailure('storage_unavailable'),
      );
      const checked = await readback(selectedPlan, true);
      if (checked.ok && checked.value === 'restored') {
        unresolvedRestore = null;
        return { kind: 'restored' };
      }
      if (!committed.ok) {
        const code = committed.error.code;
        return {
          kind: 'not-restored',
          reason:
            code === 'record_already_exists'
              ? 'occupied'
              : code === 'epoch_conflict' || code === 'operation_conflict'
                ? 'changed'
                : code === 'quota_exceeded'
                  ? 'quota'
                  : 'unavailable',
        };
      }
      return checked.ok && checked.value === 'different'
        ? { kind: 'not-restored', reason: 'changed' }
        : { kind: 'uncertain' };
    } finally {
      restoring = false;
      notify();
    }
  }

  async function checkRestore(): Promise<RestoreOutcome> {
    const pending = unresolvedRestore;
    if (!pending || restoreBlocked())
      return { kind: 'not-restored', reason: 'blocked' };
    restoring = true;
    notify();
    try {
      const checked = await readback(pending.plan, false);
      if (!checked.ok) return { kind: 'uncertain' };
      if (checked.value === 'restored') {
        unresolvedRestore = null;
        return { kind: 'restored' };
      }
      return {
        kind: 'not-restored',
        reason: checked.value === 'absent' ? 'unavailable' : 'changed',
      };
    } finally {
      restoring = false;
      notify();
    }
  }

  return {
    learnerData,
    session: () => session,
    recovery: () => ({ recovering, error: recoveryError }),
    restoring: () => restoring,
    backup: { prepareBackup, inspectDestination, restore, checkRestore },
    holdRestore(value: boolean) {
      restoreHold = value;
      if (!value) {
        const pending = restoreHeld;
        restoreHeld = [];
        for (const release of pending) release();
      }
    },
    restoreHeld: () => restoreHeld.length,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async selectProfile(
      profile: SyntheticProfileId,
      operation: string,
      save: boolean,
      initialPreferences?: LoopPreferences,
    ) {
      if (recovering || attempt || restoring) return;
      let releaseSelection = () => {};
      const done = new Promise<void>((resolve) => {
        releaseSelection = resolve;
      });
      selections.add(done);
      try {
        const token = ++generation;
        if (save && (!handle || handle.isRevoked())) {
          if (!(await connect(true, token))) {
            notify();
            return;
          }
        }
        if (token !== generation) return;
        selected = profile;
        session.invalidate();
        session = createSyntheticLoopSession(
          save && handle ? wrap(handle.repository) : null,
        );
        const pending = session.selectProfile(
          profile,
          save ? operation : undefined,
          initialPreferences,
        );
        notify();
        await pending;
        if (token === generation) notify();
      } finally {
        selections.delete(done);
        releaseSelection();
        notify();
      }
    },
    notify,
    fault(value: WriteFault) {
      fault = value;
    },
    holdWrites(value: boolean) {
      hold = value;
      if (!value) {
        const pending = held;
        held = [];
        for (const release of pending) release();
      }
    },
    held: () => held.length,
  };
}
