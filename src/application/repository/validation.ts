import { dataRecord, hasKeys } from '../../domain/core/data';
import {
  canonicalize,
  parseCanonicalData,
} from '../../domain/replay/canonical';
import {
  operationId,
  recordId,
  revision,
  storageEpoch,
} from '../core/integrity';
import { applicationFailure, applicationSuccess } from '../core/result';
import type { ApplicationResult } from '../core/result';
import { COMMAND_VERSION, RECEIPT_VERSION } from '../ports/repository';
import type {
  OperationReceipt,
  RecordCodec,
  RecordSnapshot,
  RepositoryCommand,
} from '../ports/repository';

/** Accessor-free canonical round trip, also used to detach caller/adapter data. */
export function detachedData(input: unknown): ApplicationResult<unknown> {
  const text = canonicalize(input);
  if (!text.ok) return applicationFailure('invalid_record');
  const parsed = parseCanonicalData(text.value);
  return parsed.ok
    ? applicationSuccess(parsed.value)
    : applicationFailure('invalid_record');
}

export function validatedPayload<T>(
  input: unknown,
  codec: RecordCodec<T>,
): ApplicationResult<T> {
  const detached = detachedData(input);
  if (!detached.ok) return detached;
  const before = canonicalize(detached.value);
  const decoded = codec.decode(detached.value);
  if (!decoded.ok) return applicationFailure(decoded.error.code);
  const after = canonicalize(decoded.value);
  if (!before.ok || !after.ok || before.value !== after.value)
    return applicationFailure('invalid_record');
  // A faulty codec may not introduce functions, BigInts, aliases or platform objects.
  const output = detachedData(decoded.value);
  if (!output.ok) return output;
  // decode established T's exact data shape; canonical round-trip only reorders
  // keys and normalizes integer zero. No unvalidated adapter value is asserted.
  // Do not call decode again here: a faulty final call could reintroduce aliases.
  return applicationSuccess(output.value as T);
}

export function commandFromData<T>(
  input: unknown,
  codec: RecordCodec<T>,
): ApplicationResult<RepositoryCommand<T>> {
  // Bound traversal before any narrow codec work; no caller accessor is invoked.
  const detached = detachedData(input);
  if (!detached.ok) return applicationFailure('invalid_command');
  const data = dataRecord(detached.value, 8);
  if (!data) return applicationFailure('invalid_command');
  if (data.version !== COMMAND_VERSION || data.recordSchema !== codec.schema)
    return applicationFailure('unsupported_schema');
  const keys = [
    'version',
    'recordSchema',
    'kind',
    'operationId',
    'storageEpoch',
    'recordId',
    'expectedRevision',
  ];
  const hasPayload = data.kind === 'create' || data.kind === 'update';
  if (
    (data.kind !== 'delete' && !hasPayload) ||
    !hasKeys(data, hasPayload ? [...keys, 'payload'] : keys)
  )
    return applicationFailure('invalid_command');
  const operation = operationId(data.operationId);
  const epoch = storageEpoch(data.storageEpoch);
  const id = recordId(data.recordId);
  if (!operation.ok || !epoch.ok || !id.ok)
    return applicationFailure('invalid_command');
  const common = {
    version: COMMAND_VERSION,
    recordSchema: codec.schema,
    operationId: operation.value,
    storageEpoch: epoch.value,
    recordId: id.value,
  } as const;
  if (data.kind === 'create') {
    if (data.expectedRevision !== null)
      return applicationFailure('invalid_command');
    const payload = validatedPayload(data.payload, codec);
    return payload.ok
      ? applicationSuccess({
          ...common,
          kind: 'create',
          expectedRevision: null,
          payload: payload.value,
        })
      : payload;
  }
  const expected = revision(data.expectedRevision);
  if (!expected.ok) return applicationFailure('invalid_command');
  if (data.kind === 'delete')
    return applicationSuccess({
      ...common,
      kind: 'delete',
      expectedRevision: expected.value,
    });
  const payload = validatedPayload(data.payload, codec);
  return payload.ok
    ? applicationSuccess({
        ...common,
        kind: 'update',
        expectedRevision: expected.value,
        payload: payload.value,
      })
    : payload;
}

/** Bounded canonical equality identity, not a cryptographic hash/security claim. */
export function commandFingerprint<T>(
  input: unknown,
  codec: RecordCodec<T>,
): ApplicationResult<string> {
  const command = commandFromData(input, codec);
  if (!command.ok) return command;
  const canonical = canonicalize(command.value);
  return canonical.ok
    ? applicationSuccess(canonical.value)
    : applicationFailure('invalid_command');
}

export function snapshotFromData<T>(
  input: unknown,
  codec: RecordCodec<T>,
): ApplicationResult<RecordSnapshot<T>> {
  const detached = detachedData(input);
  if (!detached.ok) return detached;
  const data = dataRecord(detached.value, 4);
  if (
    !data ||
    !hasKeys(data, ['recordId', 'revision', 'storageEpoch', 'payload'])
  )
    return applicationFailure('invalid_record');
  const id = recordId(data.recordId);
  const rev = revision(data.revision);
  const epoch = storageEpoch(data.storageEpoch);
  const payload = validatedPayload(data.payload, codec);
  if (!id.ok || !rev.ok || !epoch.ok || !payload.ok)
    return applicationFailure('invalid_record');
  return applicationSuccess({
    recordId: id.value,
    revision: rev.value,
    storageEpoch: epoch.value,
    payload: payload.value,
  });
}

export function receiptFromData(
  input: unknown,
): ApplicationResult<OperationReceipt> {
  const detached = detachedData(input);
  if (!detached.ok) return applicationFailure('invalid_receipt');
  const data = dataRecord(detached.value, 6);
  if (
    !data ||
    !hasKeys(data, [
      'version',
      'kind',
      'operationId',
      'recordId',
      'revision',
      'storageEpoch',
    ])
  )
    return applicationFailure('invalid_receipt');
  if (data.version !== RECEIPT_VERSION)
    return applicationFailure('unsupported_schema');
  const id = recordId(data.recordId);
  const op = operationId(data.operationId);
  const rev = revision(data.revision);
  const epoch = storageEpoch(data.storageEpoch);
  if (
    !id.ok ||
    !op.ok ||
    !rev.ok ||
    !epoch.ok ||
    (data.kind !== 'create' && data.kind !== 'update' && data.kind !== 'delete')
  )
    return applicationFailure('invalid_receipt');
  return applicationSuccess({
    version: RECEIPT_VERSION,
    kind: data.kind,
    operationId: op.value,
    recordId: id.value,
    revision: rev.value,
    storageEpoch: epoch.value,
  });
}
