import { SYNTHETIC_PROFILE_IDS } from '../../domain/adaptation/types';
import type { SyntheticProfileId } from '../../domain/adaptation/types';
import type { SyntheticSnapshot } from '../../domain/adaptation/types';
import { canonicalize } from '../../domain/replay/canonical';
import {
  advanceRevision,
  operationId,
  recordId,
  storageEpoch,
} from '../core/integrity';
import { applicationFailure, applicationSuccess } from '../core/result';
import type { ApplicationErrorCode, ApplicationResult } from '../core/result';
import { COMMAND_VERSION } from '../ports/repository';
import type {
  AtomicRecordRepository,
  RecordSnapshot,
  RepositoryCommand,
} from '../ports/repository';
import { receiptFromData, snapshotFromData } from '../repository/validation';
import { prepareSyntheticLoopAnswer } from './answer';
import {
  completePendingSyntheticLoop,
  deriveSyntheticLoop,
  initialSyntheticLoop,
  loopPreferencesFromInput,
  syntheticLoopCodec,
} from './record';
import type {
  LoopFamilyId,
  LoopPreferences,
  SyntheticLoopMode,
  SyntheticLoopRecord,
  SyntheticLoopState,
} from './types';

export function syntheticLoopRecordId(profileId: SyntheticProfileId) {
  return recordId(profileId.toLowerCase());
}

function sameData(a: unknown, b: unknown): boolean {
  const left = canonicalize(a),
    right = canonicalize(b);
  return left.ok && right.ok && left.value === right.value;
}

/** Application-only coordinator: repository transactions own durability/integrity.
 * Selection tokens suppress obsolete local results; they cannot undo a committed
 * transaction. Every command remains bound to its original record and epoch.
 */
export function createSyntheticLoopSession(
  repository: AtomicRecordRepository<SyntheticLoopRecord> | null,
) {
  let record: SyntheticLoopRecord | null = null;
  let snapshot: RecordSnapshot<SyntheticLoopRecord> | null = null;
  let saved = false;
  let uncertain = false;
  let readOnly = false;
  let frozen = false;
  let error: ApplicationErrorCode | null = null;
  let sessionOnlyCompletion: SyntheticLoopState['sessionOnlyCompletion'] = null;
  let explorationCount = 0;
  let fence = 0;
  let inFlight = 0;
  let unsaved = repository === null;
  let cachedRecord: SyntheticLoopRecord | null = null;
  let cachedAdaptation: SyntheticSnapshot | null = null;
  // At most one explicit completed request lives in memory for a immediate
  // same-page exact retry. It is cleared at profile/session/settings boundaries
  // and never enters an aggregate, journal or internal receipt fingerprint.
  let lastRetry: {
    readonly request: string;
    readonly command: RepositoryCommand<SyntheticLoopRecord>;
  } | null = null;

  function state(): SyntheticLoopState {
    if (record !== cachedRecord) {
      const derived = record
        ? deriveSyntheticLoop(record.profileId, record.events)
        : null;
      cachedRecord = record;
      cachedAdaptation = derived?.ok ? derived.value.snapshot : null;
    }
    return {
      record,
      snapshot,
      adaptation: cachedAdaptation,
      saved,
      busy: inFlight > 0,
      uncertain,
      readOnly,
      frozen,
      error,
      sessionOnlyCompletion,
      explorationCount,
    };
  }

  function failure(
    code: ApplicationErrorCode,
  ): ApplicationResult<SyntheticLoopState> {
    error = code;
    saved = false;
    return applicationFailure(code);
  }

  function accept(
    loaded: RecordSnapshot<SyntheticLoopRecord>,
  ): ApplicationResult<SyntheticLoopState> {
    const payload = syntheticLoopCodec.decode(loaded.payload);
    if (!payload.ok) {
      readOnly = true;
      return failure(payload.error.code);
    }
    if (
      loaded.payload.pending &&
      (loaded.payload.pending.expectedRevision !== loaded.revision ||
        loaded.payload.pending.storageEpoch !== loaded.storageEpoch)
    ) {
      // Preserve a stale prepared survivor for inspection and explicit deletion.
      // Its command must never cross a later global deletion fence.
      record = payload.value;
      snapshot = Object.freeze({ ...loaded, payload: payload.value });
      readOnly = true;
      uncertain = true;
      sessionOnlyCompletion = null;
      lastRetry = null;
      return failure(
        loaded.payload.pending.storageEpoch !== loaded.storageEpoch
          ? 'epoch_conflict'
          : 'invalid_record',
      );
    }
    record = payload.value;
    snapshot = Object.freeze({ ...loaded, payload: payload.value });
    saved = record.pending === null;
    uncertain = record.pending !== null;
    readOnly = false;
    error = null;
    sessionOnlyCompletion = null;
    return applicationSuccess(state());
  }

  async function loadSelected(
    profile: SyntheticProfileId,
    token: number,
  ): Promise<ApplicationResult<SyntheticLoopState>> {
    if (!repository) return failure('storage_unavailable');
    const id = syntheticLoopRecordId(profile);
    if (!id.ok) return id;
    const result = await repository.load(id.value);
    if (token !== fence) return applicationFailure('operation_conflict');
    if (!result.ok) {
      readOnly = true;
      return failure(result.error.code);
    }
    const checked = snapshotFromData(result.value, syntheticLoopCodec);
    if (
      !checked.ok ||
      checked.value.recordId !== id.value ||
      checked.value.payload.profileId !== profile
    ) {
      readOnly = true;
      return failure(checked.ok ? 'invalid_record' : checked.error.code);
    }
    return accept(checked.value);
  }

  async function execute(
    command: RepositoryCommand<SyntheticLoopRecord>,
    token: number,
  ): Promise<ApplicationResult<SyntheticLoopState>> {
    if (!repository) return failure('storage_unavailable');
    const result = await repository.execute(command);
    if (token !== fence) return applicationFailure('operation_conflict');
    if (!result.ok) {
      // Failure may represent an abort or a lost response. Keep the prepared
      // payload and reconcile explicitly; never queue an unsaved write later.
      uncertain = command.kind !== 'delete';
      readOnly = true;
      return failure(result.error.code);
    }
    const receipt = receiptFromData(result.value);
    const next = command.kind === 'create' ? 1 : command.expectedRevision + 1;
    if (
      !receipt.ok ||
      receipt.value.operationId !== command.operationId ||
      receipt.value.recordId !== command.recordId ||
      receipt.value.kind !== command.kind ||
      receipt.value.revision !== next ||
      receipt.value.storageEpoch !==
        command.storageEpoch + (command.kind === 'delete' ? 1 : 0)
    ) {
      uncertain = true;
      readOnly = true;
      return failure('invalid_receipt');
    }
    if (command.kind === 'delete') {
      record = null;
      snapshot = null;
      saved = true;
      uncertain = false;
      error = null;
      return applicationSuccess(state());
    }
    // execute success means the adapter transaction has completed, never merely
    // the native put request. Receipt and payload commit atomically by the port.
    return accept({
      recordId: command.recordId,
      revision: receipt.value.revision,
      storageEpoch: receipt.value.storageEpoch,
      payload: command.payload,
    });
  }

  function updateCommand(
    payload: SyntheticLoopRecord,
    operation: string,
  ): ApplicationResult<RepositoryCommand<SyntheticLoopRecord>> {
    const op = operationId(operation);
    const checked = syntheticLoopCodec.decode(payload);
    if (
      !op.ok ||
      !checked.ok ||
      !snapshot ||
      snapshot.payload.profileId !== payload.profileId
    )
      return applicationFailure('invalid_command');
    return applicationSuccess({
      version: COMMAND_VERSION,
      recordSchema: syntheticLoopCodec.schema,
      kind: 'update',
      operationId: op.value,
      recordId: snapshot.recordId,
      storageEpoch: snapshot.storageEpoch,
      expectedRevision: snapshot.revision,
      payload: checked.value,
    });
  }

  async function mutate(
    operation: string,
    transform: (record: SyntheticLoopRecord) => SyntheticLoopRecord,
  ): Promise<ApplicationResult<SyntheticLoopState>> {
    if (
      !record ||
      record.pending ||
      inFlight ||
      frozen ||
      (readOnly && !unsaved)
    )
      return failure('invalid_command');
    lastRetry = null;
    const payload = transform(record);
    const checked = syntheticLoopCodec.decode(payload);
    if (!checked.ok || !operationId(operation).ok)
      return failure(checked.ok ? 'invalid_operation_id' : checked.error.code);
    if (unsaved) {
      record = checked.value;
      saved = false;
      error = null;
      return applicationSuccess(state());
    }
    const command = updateCommand(checked.value, operation);
    if (!command.ok) return failure(command.error.code);
    const token = fence;
    inFlight += 1;
    try {
      return await execute(command.value, token);
    } catch {
      if (token !== fence) return applicationFailure('operation_conflict');
      uncertain = true;
      readOnly = true;
      return failure('storage_unavailable');
    } finally {
      inFlight -= 1;
    }
  }

  async function selectProfile(
    profile: SyntheticProfileId,
    createOperation?: string,
  ): Promise<ApplicationResult<SyntheticLoopState>> {
    if (!SYNTHETIC_PROFILE_IDS.includes(profile) || frozen)
      return failure('invalid_record_id');
    fence += 1;
    const token = fence;
    record = initialSyntheticLoop(profile);
    snapshot = null;
    saved = false;
    uncertain = false;
    error = null;
    readOnly = false;
    sessionOnlyCompletion = null;
    explorationCount = 0;
    lastRetry = null;
    if (unsaved) return applicationSuccess(state());
    inFlight += 1;
    try {
      const loaded = await loadSelected(profile, token);
      if (
        loaded.ok ||
        !repository ||
        loaded.error.code !== 'record_not_found' ||
        createOperation === undefined ||
        token !== fence
      )
        return loaded;
      const op = operationId(createOperation),
        id = syntheticLoopRecordId(profile);
      const epochResult = await repository.getEpoch();
      if (token !== fence) return applicationFailure('operation_conflict');
      const epoch = epochResult.ok
        ? storageEpoch(epochResult.value)
        : epochResult;
      if (!op.ok || !id.ok || !epoch.ok) return failure('invalid_command');
      const command: RepositoryCommand<SyntheticLoopRecord> = {
        version: COMMAND_VERSION,
        recordSchema: syntheticLoopCodec.schema,
        kind: 'create',
        expectedRevision: null,
        operationId: op.value,
        recordId: id.value,
        storageEpoch: epoch.value,
        payload: initialSyntheticLoop(profile),
      };
      return await execute(command, token);
    } catch {
      if (token !== fence) return applicationFailure('operation_conflict');
      readOnly = true;
      return failure('storage_unavailable');
    } finally {
      inFlight -= 1;
    }
  }

  async function reload(): Promise<ApplicationResult<SyntheticLoopState>> {
    if (!record || inFlight || unsaved) return failure('invalid_command');
    lastRetry = null;
    const profile = record.profileId,
      token = fence;
    inFlight += 1;
    uncertain = true;
    try {
      return await loadSelected(profile, token);
    } catch {
      if (token !== fence) return applicationFailure('operation_conflict');
      readOnly = true;
      return failure('storage_unavailable');
    } finally {
      inFlight -= 1;
    }
  }

  async function retryPending(): Promise<
    ApplicationResult<SyntheticLoopState>
  > {
    if (!record?.pending || !snapshot || unsaved || inFlight || frozen)
      return failure('invalid_command');
    const before = snapshot,
      pending = record.pending,
      token = fence;
    inFlight += 1;
    uncertain = true;
    try {
      const loaded = await loadSelected(before.payload.profileId, token);
      if (!loaded.ok || !snapshot || !record) return loaded;
      if (snapshot.storageEpoch !== before.storageEpoch) {
        readOnly = true;
        return failure('epoch_conflict');
      }
      if (
        record.pending === null &&
        record.lastCompletion?.operationId === pending.operationId
      )
        return applicationSuccess(state());
      if (
        snapshot.revision !== before.revision ||
        !sameData(record.pending, pending)
      ) {
        readOnly = true;
        return failure('revision_conflict');
      }
      const payload = completePendingSyntheticLoop(record);
      const op = operationId(pending.operationId);
      if (!payload.ok || !op.ok) return failure('invalid_command');
      const command: RepositoryCommand<SyntheticLoopRecord> = {
        version: COMMAND_VERSION,
        recordSchema: syntheticLoopCodec.schema,
        kind: 'update',
        operationId: op.value,
        recordId: snapshot.recordId,
        storageEpoch: snapshot.storageEpoch,
        expectedRevision: snapshot.revision,
        payload: payload.value,
      };
      return await execute(command, token);
    } catch {
      if (token !== fence) return applicationFailure('operation_conflict');
      uncertain = true;
      readOnly = true;
      return failure('storage_unavailable');
    } finally {
      inFlight -= 1;
    }
  }

  async function submit(
    request: unknown,
    operation: string,
  ): Promise<ApplicationResult<SyntheticLoopState>> {
    if (
      !record ||
      record.pending ||
      inFlight ||
      frozen ||
      (readOnly && !unsaved)
    )
      return failure('invalid_command');
    const requestIdentity = canonicalize(request);
    if (!requestIdentity.ok) return failure('invalid_command');
    if (
      lastRetry?.command.operationId === operation &&
      snapshot &&
      record.lastCompletion?.operationId === operation
    ) {
      if (lastRetry.request !== requestIdentity.value)
        return failure('operation_conflict');
      const token = fence;
      inFlight += 1;
      try {
        return await execute(lastRetry.command, token);
      } catch {
        if (token !== fence) return applicationFailure('operation_conflict');
        uncertain = true;
        readOnly = true;
        return failure('storage_unavailable');
      } finally {
        inFlight -= 1;
      }
    }
    if (record.lastCompletion?.operationId === operation)
      return failure('operation_conflict');
    const next = snapshot
      ? advanceRevision(snapshot.revision)
      : applicationSuccess(1);
    if (!next.ok) return failure(next.error.code);
    const prepared = prepareSyntheticLoopAnswer(
      record,
      request,
      operation,
      next.value,
      snapshot?.storageEpoch ?? 0,
    );
    if (!prepared.ok) return failure(prepared.error.code);
    if (prepared.value.kind === 'sessionOnly') {
      sessionOnlyCompletion = prepared.value.completion;
      explorationCount = Math.min(64, explorationCount + 1);
      saved = false;
      error = null;
      return applicationSuccess(state());
    }
    const staged = syntheticLoopCodec.decode({
      ...record,
      pending: prepared.value.pending,
    });
    if (!staged.ok) return failure(staged.error.code);
    const payload = completePendingSyntheticLoop(staged.value);
    if (!payload.ok) return failure(payload.error.code);
    if (unsaved) {
      record = payload.value;
      saved = false;
      error = null;
      return applicationSuccess(state());
    }
    const stageCommand = updateCommand(staged.value, `${operation}-pending`);
    if (!stageCommand.ok) return failure(stageCommand.error.code);
    const token = fence;
    inFlight += 1;
    saved = false;
    uncertain = true;
    try {
      const stageResult = await execute(stageCommand.value, token);
      if (!stageResult.ok || token !== fence || !snapshot) return stageResult;
      const op = operationId(operation);
      if (!op.ok) return failure(op.error.code);
      const finalCommand: RepositoryCommand<SyntheticLoopRecord> = {
        version: COMMAND_VERSION,
        recordSchema: syntheticLoopCodec.schema,
        kind: 'update',
        operationId: op.value,
        recordId: snapshot.recordId,
        storageEpoch: snapshot.storageEpoch,
        expectedRevision: snapshot.revision,
        payload: payload.value,
      };
      const result = await execute(finalCommand, token);
      if (result.ok && token === fence)
        lastRetry = { request: requestIdentity.value, command: finalCommand };
      return result;
    } catch {
      if (token !== fence) return applicationFailure('operation_conflict');
      uncertain = true;
      readOnly = true;
      return failure('storage_unavailable');
    } finally {
      inFlight -= 1;
    }
  }

  async function deleteProfile(
    operation: string,
  ): Promise<ApplicationResult<SyntheticLoopState>> {
    if (!snapshot || !repository || unsaved || frozen)
      return failure('invalid_command');
    const op = operationId(operation);
    if (!op.ok) return failure(op.error.code);
    // May race an already submitted answer. The transaction's epoch/revision
    // checks decide the order; switching fences all obsolete local callbacks.
    fence += 1;
    const token = fence,
      before = snapshot;
    explorationCount = 0;
    lastRetry = null;
    sessionOnlyCompletion = null;
    inFlight += 1;
    try {
      const result = await execute(
        {
          version: COMMAND_VERSION,
          recordSchema: syntheticLoopCodec.schema,
          kind: 'delete',
          operationId: op.value,
          recordId: before.recordId,
          storageEpoch: before.storageEpoch,
          expectedRevision: before.revision,
        },
        token,
      );
      if (!result.ok && result.error.code === 'revision_conflict') {
        const loaded = await loadSelected(before.payload.profileId, token);
        if (!loaded.ok || !snapshot) return loaded;
        return await execute(
          {
            version: COMMAND_VERSION,
            recordSchema: syntheticLoopCodec.schema,
            kind: 'delete',
            operationId: op.value,
            recordId: snapshot.recordId,
            storageEpoch: snapshot.storageEpoch,
            expectedRevision: snapshot.revision,
          },
          token,
        );
      }
      return result;
    } catch {
      if (token !== fence) return applicationFailure('operation_conflict');
      readOnly = true;
      return failure('storage_unavailable');
    } finally {
      inFlight -= 1;
    }
  }

  return {
    state,
    selectProfile,
    reload,
    submit,
    retryPending,
    deleteProfile,
    setMode: (mode: SyntheticLoopMode, operation: string) =>
      mutate(operation, (current) => ({ ...current, mode })),
    setPreferences: (preferences: LoopPreferences, operation: string) =>
      mutate(operation, (current) => ({
        ...current,
        preferences: loopPreferencesFromInput(preferences) ?? preferences,
      })),
    setActivity: (family: LoopFamilyId, operation: string) =>
      mutate(operation, (current) => ({
        ...current,
        selectedFamily: family,
        taskOrdinal: Math.min(1_000_001, current.taskOrdinal + 1),
      })),
    skip: (operation: string) =>
      mutate(operation, (current) => ({
        ...current,
        taskOrdinal: Math.min(1_000_001, current.taskOrdinal + 1),
      })),
    endSession: (operation: string) => {
      explorationCount = 0;
      sessionOnlyCompletion = null;
      return mutate(operation, (current) => {
        if (!current.sessionActive) return current;
        const events =
          current.mode === 'synthetic-policy'
            ? [
                ...current.events,
                {
                  kind: 'checkpoint' as const,
                  sessionOrdinal: current.sessionOrdinal,
                },
              ]
            : current.events;
        const derived = deriveSyntheticLoop(current.profileId, events);
        return {
          ...current,
          sessionActive: false,
          events,
          derived: derived.ok ? derived.value.derived : current.derived,
        };
      });
    },
    startSession: (operation: string) =>
      mutate(operation, (current) =>
        current.sessionActive
          ? current
          : {
              ...current,
              sessionActive: true,
              sessionOrdinal: current.sessionOrdinal + 1,
            },
      ),
    useUnsaved: () => {
      if (inFlight || frozen || !record) return failure('invalid_command');
      lastRetry = null;
      unsaved = true;
      const payload = syntheticLoopCodec.decode({ ...record, pending: null });
      if (!payload.ok) return failure(payload.error.code);
      record = payload.value;
      snapshot = null;
      saved = false;
      uncertain = false;
      readOnly = false;
      error = null;
      return applicationSuccess(state());
    },
    freeze: () => {
      frozen = true;
    },
    invalidate: () => {
      fence += 1;
      frozen = true;
      uncertain = true;
      lastRetry = null;
      explorationCount = 0;
      sessionOnlyCompletion = null;
    },
    unfreeze: () => {
      frozen = false;
    },
    updateReadiness: async () => {
      if (
        inFlight ||
        uncertain ||
        record?.pending ||
        readOnly ||
        unsaved ||
        !snapshot ||
        !repository
      )
        return false;
      const before = snapshot;
      try {
        const epoch = await repository.getEpoch();
        if (
          !epoch.ok ||
          epoch.value !== before.storageEpoch ||
          snapshot !== before ||
          inFlight ||
          uncertain ||
          record?.pending
        )
          return false;
        const result = await reload();
        return (
          result.ok &&
          !uncertain &&
          !readOnly &&
          snapshot?.revision === before.revision &&
          snapshot.storageEpoch === before.storageEpoch
        );
      } catch {
        readOnly = true;
        error = 'storage_unavailable';
        return false;
      }
    },
    isUpdateReady: () =>
      !inFlight &&
      !uncertain &&
      !record?.pending &&
      !readOnly &&
      !unsaved &&
      snapshot !== null,
  };
}

export type SyntheticLoopSession = ReturnType<
  typeof createSyntheticLoopSession
>;
