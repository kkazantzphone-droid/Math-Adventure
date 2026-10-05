import { dataRecord, hasKeys } from '../../domain/core/data';
import { applicationFailure, applicationSuccess } from '../core/result';
import type { ApplicationResult } from '../core/result';
import { detachedData } from '../repository/validation';
import type {
  CapabilitySnapshot,
  RepresentationCapability,
  StorageCapability,
} from './capabilities';
import type { SpeechCapability, SpeechOutcome } from './speech';

export function storageCapabilityFromData(
  input: unknown,
): ApplicationResult<StorageCapability> {
  const data = dataRecord(input, 2);
  if (
    data &&
    hasKeys(data, ['state']) &&
    (data.state === 'unknown' ||
      data.state === 'available' ||
      data.state === 'unavailable' ||
      data.state === 'quota-limited')
  )
    return applicationSuccess({ state: data.state });
  if (
    data &&
    hasKeys(data, ['state', 'saving']) &&
    data.state === 'degraded' &&
    data.saving === 'unsaved-session-only'
  )
    return applicationSuccess({
      state: 'degraded',
      saving: 'unsaved-session-only',
    });
  return applicationFailure('invalid_record');
}

export function speechCapabilityFromData(
  input: unknown,
): ApplicationResult<SpeechCapability> {
  const data = dataRecord(input, 2);
  if (
    data &&
    hasKeys(data, ['state']) &&
    (data.state === 'unknown' ||
      data.state === 'loading' ||
      data.state === 'missing' ||
      data.state === 'error' ||
      data.state === 'ready-local')
  )
    return applicationSuccess({ state: data.state });
  if (
    data &&
    hasKeys(data, ['state', 'scope']) &&
    data.state === 'tested-offline' &&
    data.scope === 'current-provider-and-surface'
  )
    return applicationSuccess({
      state: 'tested-offline',
      scope: 'current-provider-and-surface',
    });
  return applicationFailure('invalid_record');
}

export function representationCapabilityFromData(
  input: unknown,
): ApplicationResult<RepresentationCapability> {
  const data = dataRecord(input, 2);
  if (
    data &&
    hasKeys(data, ['state']) &&
    (data.state === 'unknown' ||
      data.state === 'supported' ||
      data.state === 'unsupported')
  )
    return applicationSuccess({ state: data.state });
  if (
    data &&
    hasKeys(data, ['state', 'alternativeAvailable']) &&
    data.state === 'degraded' &&
    typeof data.alternativeAvailable === 'boolean'
  )
    return applicationSuccess({
      state: 'degraded',
      alternativeAvailable: data.alternativeAvailable,
    });
  return applicationFailure('invalid_record');
}

export function speechOutcomeFromData(
  input: unknown,
): ApplicationResult<SpeechOutcome> {
  const data = dataRecord(input, 1);
  if (
    data &&
    hasKeys(data, ['kind']) &&
    (data.kind === 'completed' ||
      data.kind === 'cancelled' ||
      data.kind === 'unavailable' ||
      data.kind === 'error' ||
      data.kind === 'timeout')
  )
    return applicationSuccess({ kind: data.kind });
  return applicationFailure('invalid_record');
}

export function capabilitySnapshotFromData(
  input: unknown,
): ApplicationResult<CapabilitySnapshot> {
  const detached = detachedData(input);
  if (!detached.ok) return detached;
  const data = dataRecord(detached.value, 3);
  if (!data || !hasKeys(data, ['storage', 'speech', 'representation']))
    return applicationFailure('invalid_record');
  const storage = storageCapabilityFromData(data.storage);
  const speech = speechCapabilityFromData(data.speech);
  const representation = representationCapabilityFromData(data.representation);
  return storage.ok && speech.ok && representation.ok
    ? applicationSuccess({
        storage: storage.value,
        speech: speech.value,
        representation: representation.value,
      })
    : applicationFailure('invalid_record');
}
