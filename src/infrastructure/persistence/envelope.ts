import { recordId } from '../../application/core/integrity';
import type { RecordId } from '../../application/core/integrity';
import {
  applicationFailure,
  applicationSuccess,
} from '../../application/core/result';
import type { ApplicationResult } from '../../application/core/result';
import type { RecordCodec } from '../../application/ports/repository';
import { validatedPayload } from '../../application/repository/validation';
import { dataArray, dataRecord, hasKeys } from '../../domain/core/data';
import {
  canonicalize,
  CANONICALIZATION_VERSION,
  CANONICAL_LIMITS,
} from '../../domain/replay/canonical';

/** A synthetic compatibility rehearsal, not an accepted production export format.
 * These model/content/generator probes describe invented fixture semantics only.
 * No file, storage, restore, migration, clock or network operation is performed.
 */
export const SYNTHETIC_ENVELOPE_VERSIONS = Object.freeze({
  formatVersion: 'synthetic-envelope-v1',
  schemaVersion: 1,
  learnerSchema: 'synthetic-learner-v1',
  modelVersion: 'synthetic-model-v1',
  contentVersion: 'synthetic-content-v1',
  generatorVersion: 'synthetic-generator-v1',
  replayVersion: 'replay-v1',
  canonicalizationVersion: CANONICALIZATION_VERSION,
} as const);

/** Declared synthetic work limits only; production import/retention policy is open.
 * Individual rows also obey all stricter canonical-json-v1 and codec bounds.
 */
export const SYNTHETIC_ENVELOPE_LIMITS = Object.freeze({
  records: 10,
  depth: 20,
  bytes: 4 * 1024 * 1024,
  nodes: CANONICAL_LIMITS.nodes * 10 + 100,
});

export interface SyntheticEnvelopeRow<T> {
  readonly recordId: RecordId;
  readonly recordSchema: 'synthetic-learner-v1';
  readonly payload: T;
}

export type SyntheticEnvelope<T> = typeof SYNTHETIC_ENVELOPE_VERSIONS & {
  readonly records: readonly SyntheticEnvelopeRow<T>[];
};

const versionKeys = Object.keys(SYNTHETIC_ENVELOPE_VERSIONS);
const versionValues: Readonly<Record<string, string | number>> =
  SYNTHETIC_ENVELOPE_VERSIONS;
const envelopeKeys = [...versionKeys, 'records'];
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const utf8 = new TextEncoder();

/** Inspect own data descriptors without invoking accessors/toJSON. Proxies are
 * executable objects outside the decoded-data boundary, as in the shared readers.
 * Counting encoded JSON pieces incrementally bounds work before codec traversal.
 */
function boundedEnvelopeData(input: unknown): boolean {
  const active = new Set<object>();
  let nodes = 0;
  let bytes = 0;
  function account(text: string): boolean {
    bytes += utf8.encode(text).byteLength;
    return bytes <= SYNTHETIC_ENVELOPE_LIMITS.bytes;
  }
  function visit(value: unknown, depth: number): boolean {
    nodes += 1;
    if (
      depth > SYNTHETIC_ENVELOPE_LIMITS.depth ||
      nodes > SYNTHETIC_ENVELOPE_LIMITS.nodes
    )
      return false;
    if (value === null) return account('null');
    if (typeof value === 'boolean') return account(String(value));
    if (typeof value === 'number')
      return (
        Number.isSafeInteger(value) && account(String(value === 0 ? 0 : value))
      );
    if (typeof value === 'string')
      return (
        value.length <= CANONICAL_LIMITS.text && account(JSON.stringify(value))
      );
    if (typeof value !== 'object' || active.has(value)) return false;
    active.add(value);
    let valid: boolean;
    if (Array.isArray(value)) {
      const array = dataArray(value, CANONICAL_LIMITS.nodes);
      valid = !!array && account('[]');
      if (array) {
        for (let index = 0; valid && index < array.length; index += 1) {
          valid =
            (index === 0 || account(',')) && visit(array[index], depth + 1);
        }
      }
    } else {
      const record = dataRecord(value, CANONICAL_LIMITS.nodes);
      valid = !!record && account('{}');
      if (record) {
        const keys = Object.keys(record);
        for (let index = 0; valid && index < keys.length; index += 1) {
          const key = keys[index];
          valid =
            key !== undefined &&
            key.length <= CANONICAL_LIMITS.text &&
            !forbiddenKeys.has(key) &&
            (index === 0 || account(',')) &&
            account(JSON.stringify(key)) &&
            account(':') &&
            visit(record[key], depth + 1);
        }
      }
    }
    active.delete(value);
    return valid;
  }
  return visit(input, 0);
}

/** Return detached validated staging data only. Source IDs are comparison labels,
 * never destination identities or permission to write. No source control state,
 * revisions, receipts, session state or recovery material is representable.
 */
export function validateSyntheticEnvelope<T>(
  input: unknown,
  codec: RecordCodec<T>,
): ApplicationResult<SyntheticEnvelope<T>> {
  if (!boundedEnvelopeData(input)) return applicationFailure('invalid_record');
  const data = dataRecord(input, envelopeKeys.length);
  if (!data || !hasKeys(data, envelopeKeys))
    return applicationFailure('invalid_record');
  if (
    codec.schema !== SYNTHETIC_ENVELOPE_VERSIONS.learnerSchema ||
    versionKeys.some((key) => data[key] !== versionValues[key])
  )
    return applicationFailure('unsupported_schema');
  const rows = dataArray(data.records, SYNTHETIC_ENVELOPE_LIMITS.records);
  if (!rows) return applicationFailure('invalid_record');
  const seen = new Set<string>();
  const records: SyntheticEnvelopeRow<T>[] = [];
  for (const raw of rows) {
    // This independently preserves the canonical bound for each complete row.
    const canonical = canonicalize(raw);
    const row = dataRecord(raw, 3);
    if (
      !canonical.ok ||
      !row ||
      !hasKeys(row, ['recordId', 'recordSchema', 'payload'])
    )
      return applicationFailure('invalid_record');
    if (row.recordSchema !== SYNTHETIC_ENVELOPE_VERSIONS.learnerSchema)
      return applicationFailure('unsupported_schema');
    const id = recordId(row.recordId);
    if (!id.ok || !id.value.startsWith('synthetic-') || seen.has(id.value))
      return applicationFailure('invalid_record');
    const payload = validatedPayload(row.payload, codec);
    if (!payload.ok) return applicationFailure('invalid_record');
    seen.add(id.value);
    records.push({
      recordId: id.value,
      recordSchema: SYNTHETIC_ENVELOPE_VERSIONS.learnerSchema,
      payload: payload.value,
    });
  }
  return applicationSuccess({ ...SYNTHETIC_ENVELOPE_VERSIONS, records });
}

/** Canonical text for synthetic contract tests, with no file/export capability.
 * Assemble separately bounded canonical rows so the envelope never weakens a row
 * bound or incorrectly applies a single-row output bound to the whole envelope.
 */
export function syntheticEnvelopeToCanonical<T>(
  input: unknown,
  codec: RecordCodec<T>,
): ApplicationResult<string> {
  const checked = validateSyntheticEnvelope(input, codec);
  if (!checked.ok) return checked;
  return checkedEnvelopeToCanonical(checked.value);
}

function checkedEnvelopeToCanonical<T>(
  envelope: SyntheticEnvelope<T>,
): ApplicationResult<string> {
  const rows: string[] = [];
  for (const row of envelope.records) {
    const canonical = canonicalize(row);
    if (!canonical.ok) return applicationFailure('invalid_record');
    rows.push(canonical.value);
  }
  const fields: string[] = [];
  for (const key of [...envelopeKeys].sort()) {
    const value =
      key === 'records'
        ? `[${rows.join(',')}]`
        : JSON.stringify(versionValues[key]);
    fields.push(`${JSON.stringify(key)}:${value}`);
  }
  const text = `{${fields.join(',')}}`;
  return utf8.encode(text).byteLength <= SYNTHETIC_ENVELOPE_LIMITS.bytes
    ? applicationSuccess(text)
    : applicationFailure('invalid_record');
}

/** A string contract only, never an arbitrary-file import. Exact canonical
 * spelling rejects duplicate keys and numeric tokens JSON.parse could round.
 */
export function parseSyntheticEnvelope<T>(
  text: unknown,
  codec: RecordCodec<T>,
): ApplicationResult<SyntheticEnvelope<T>> {
  if (
    typeof text !== 'string' ||
    text.length > SYNTHETIC_ENVELOPE_LIMITS.bytes ||
    utf8.encode(text).byteLength > SYNTHETIC_ENVELOPE_LIMITS.bytes
  )
    return applicationFailure('invalid_record');
  let decoded: unknown;
  try {
    decoded = JSON.parse(text) as unknown;
  } catch {
    return applicationFailure('invalid_record');
  }
  const checked = validateSyntheticEnvelope(decoded, codec);
  if (!checked.ok) return checked;
  const canonical = checkedEnvelopeToCanonical(checked.value);
  return canonical.ok && canonical.value === text
    ? checked
    : applicationFailure('invalid_record');
}
