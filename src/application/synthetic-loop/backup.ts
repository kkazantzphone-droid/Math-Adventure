import { dataArray, dataRecord, hasKeys } from '../../domain/core/data';
import { EVIDENCE_CATALOG_VERSION } from '../../domain/adaptation/catalog';
import { ADAPTATION_POLICY } from '../../domain/adaptation/policy';
import { SYNTHETIC_PROFILE_IDS } from '../../domain/adaptation/types';
import type {
  AttainedState,
  SyntheticProfileId,
} from '../../domain/adaptation/types';
import {
  PROOF_CONTENT_VERSION,
  PROOF_GENERATORS,
} from '../../domain/families/proofs';
import {
  SLICE_CONTENT_VERSION,
  SLICE_GENERATORS,
} from '../../domain/families/slice';
import {
  CHAPTER_CONTENT_VERSION,
  CHAPTER_GENERATOR_IDS,
} from '../../domain/growing-world/content';
import type { ChapterFamilyId } from '../../domain/growing-world/content';
import { GROWING_JOURNEY_POLICY } from '../../domain/growing-world/journey';
import { RNG_ALGORITHM_ID } from '../../domain/random/xoshiro';
import {
  canonicalize,
  CANONICALIZATION_VERSION,
  CANONICAL_LIMITS,
} from '../../domain/replay/canonical';
import { operationId, storageEpoch } from '../core/integrity';
import { applicationFailure, applicationSuccess } from '../core/result';
import type { ApplicationResult } from '../core/result';
import { COMMAND_VERSION } from '../ports/repository';
import type { RepositoryCommand } from '../ports/repository';
import { commandFromData, validatedPayload } from '../repository/validation';
import { sha256Hex, utf8Length } from './digest';
import {
  deriveSyntheticLoop,
  growingJourneyForRecord,
  syntheticLoopCodec,
  syntheticLoopEventsFromInput,
  SYNTHETIC_LOOP_CATALOG,
} from './record';
import { SYNTHETIC_LOOP_SEED_VERSION } from './seed';
import { syntheticLoopRecordId } from './session';
import {
  GROWING_LOOP_SCHEMA,
  SYNTHETIC_LOOP_PAYLOAD_SCHEMAS,
  SYNTHETIC_LOOP_SCHEMA,
} from './types';
import type {
  LoopFamilyId,
  LoopPreferences,
  SyntheticLoopMode,
  SyntheticLoopRecord,
} from './types';

/** Parent-saved local file contract for the explicit synthetic capability only.
 * It is not an ordinary-product learner export or accepted retention policy.
 */
export const SYNTHETIC_BACKUP_FORMAT = 'math-adventure-synthetic-backup';
export const SYNTHETIC_BACKUP_FORMAT_VERSION = 1;
/** Engineering parser/resource bounds, not learner-retention limits. Each
 * profile also keeps every stricter canonical-json-v1 and record codec bound. */
export const SYNTHETIC_BACKUP_LIMITS = Object.freeze({
  bytes: 1_048_576,
  depth: CANONICAL_LIMITS.depth,
  profiles: SYNTHETIC_PROFILE_IDS.length,
});
/** Digest of the exact policy values and evidence scopes the rebuilt derived
 * state depends on, so a changed value is refused even under an old name. */
const semantics = canonicalize({
  adaptationPolicy: ADAPTATION_POLICY,
  evidenceScopes: SYNTHETIC_LOOP_CATALOG,
  invitationPolicy: GROWING_JOURNEY_POLICY,
});
if (!semantics.ok) throw new Error('Synthetic backup semantics invalid');
/** Exact provenance this build can restore without reinterpretation. */
export const SYNTHETIC_BACKUP_COMPATIBILITY = Object.freeze({
  adaptationPolicy: ADAPTATION_POLICY.version,
  canonicalization: CANONICALIZATION_VERSION,
  content: Object.freeze([
    PROOF_CONTENT_VERSION,
    SLICE_CONTENT_VERSION,
    CHAPTER_CONTENT_VERSION,
  ]),
  evidenceCatalog: EVIDENCE_CATALOG_VERSION,
  generators: Object.freeze([
    ...PROOF_GENERATORS,
    ...SLICE_GENERATORS,
    ...CHAPTER_GENERATOR_IDS,
  ]),
  invitationPolicy: GROWING_JOURNEY_POLICY.version,
  randomAlgorithm: RNG_ALGORITHM_ID,
  recordSchemas: Object.freeze([...SYNTHETIC_LOOP_PAYLOAD_SCHEMAS]),
  semantics: sha256Hex(semantics.value),
  taskSeeds: SYNTHETIC_LOOP_SEED_VERSION,
});
/** Evidence IDs this app creates (`synthetic-` + random UUID operation). An
 * imported file cannot use them to carry other text into the destination. */
const APP_EVIDENCE_ID =
  /^SYNTHETIC-synthetic-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type SyntheticBackupErrorCode =
  | 'nothing_saved'
  | 'too_large'
  | 'not_backup'
  | 'damaged'
  | 'newer_version'
  | 'incompatible'
  | 'invalid_contents';
export type SyntheticBackupResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly error: { readonly code: SyntheticBackupErrorCode };
    };

type WithoutControl<T> = T extends unknown
  ? Omit<T, 'derived' | 'pending' | 'lastCompletion'>
  : never;
/** Settled portable meaning: control, unsettled and derivable fields removed. */
export type PortableSyntheticProfile = WithoutControl<SyntheticLoopRecord>;

export interface ValidatedSyntheticBackup {
  readonly checksum: string;
  /** Reconstructed exact records, ready for a fresh-destination restore. */
  readonly profiles: readonly SyntheticLoopRecord[];
}

export interface SyntheticBackupFile {
  readonly text: string;
  readonly backup: ValidatedSyntheticBackup;
  /** Settled state is exported; an answer still saving is left at its source. */
  readonly excludedPending: number;
}

const fail = (
  code: SyntheticBackupErrorCode,
): SyntheticBackupResult<never> => ({ ok: false, error: { code } });
const legacyKeys = [
  'schema',
  'marker',
  'profileId',
  'mode',
  'sessionOrdinal',
  'sessionActive',
  'preferences',
  'completedCount',
  'taskOrdinal',
  'selectedFamily',
  'events',
] as const;
const growingKeys = [...legacyKeys, 'chapterEvents', 'chapterSupport'];
const envelopeKeys = [
  'checksum',
  'compatibility',
  'format',
  'formatVersion',
  'profiles',
  'synthetic',
];
const canonicalPrefix = '{"checksum":{"algorithm":"sha-256","value":"';

function canonicalText(input: unknown): string | null {
  const text = canonicalize(input);
  return text.ok ? text.value : null;
}

export function portableSyntheticProfile(
  record: SyntheticLoopRecord,
): PortableSyntheticProfile {
  const { derived, pending, lastCompletion, ...portable } = record;
  void derived;
  void pending;
  void lastCompletion;
  return portable;
}

/** Restore exact settled state: derived adaptation is rebuilt by the unchanged
 * engine, pending/lastCompletion are absent and the existing codec must agree. */
export function syntheticRecordFromPortable(
  input: unknown,
): SyntheticBackupResult<SyntheticLoopRecord> {
  const row = dataRecord(input, growingKeys.length);
  if (!row) return fail('invalid_contents');
  const keys =
    row.schema === GROWING_LOOP_SCHEMA
      ? growingKeys
      : row.schema === SYNTHETIC_LOOP_SCHEMA
        ? legacyKeys
        : null;
  if (!keys) return fail('incompatible');
  if (
    !hasKeys(row, keys) ||
    !SYNTHETIC_PROFILE_IDS.some((profile) => profile === row.profileId)
  )
    return fail('invalid_contents');
  const events = syntheticLoopEventsFromInput(row.events);
  const chapterIds = dataArray(row.chapterEvents ?? [], 128)?.map(
    (event) => dataRecord(event, 32)?.id,
  );
  if (
    !events ||
    !chapterIds ||
    [
      ...events.flatMap((event) =>
        event.kind === 'observation' ? [event.input.id] : [],
      ),
      ...chapterIds,
    ].some((id) => typeof id !== 'string' || !APP_EVIDENCE_ID.test(id))
  )
    return fail('invalid_contents');
  const derived = deriveSyntheticLoop(
    row.profileId as SyntheticProfileId,
    events,
  );
  if (!derived.ok) return fail('invalid_contents');
  const record = validatedPayload(
    {
      ...row,
      derived: derived.value.derived,
      pending: null,
      lastCompletion: null,
    },
    syntheticLoopCodec,
  );
  if (!record.ok) return fail('invalid_contents');
  const before = canonicalText(row);
  const after = canonicalText(portableSyntheticProfile(record.value));
  return before !== null && before === after
    ? { ok: true, value: record.value }
    : fail('invalid_contents');
}

function envelopeText(
  compatibility: unknown,
  profiles: readonly unknown[],
  checksum: string | null,
): string | null {
  const rows: string[] = [];
  for (const profile of profiles) {
    // Separately bounded rows; one row bound never limits the whole envelope.
    const row = canonicalText(profile);
    if (row === null) return null;
    rows.push(row);
  }
  const fields: Record<string, string> = {
    compatibility: canonicalText(compatibility) ?? '',
    format: JSON.stringify(SYNTHETIC_BACKUP_FORMAT),
    formatVersion: String(SYNTHETIC_BACKUP_FORMAT_VERSION),
    profiles: `[${rows.join(',')}]`,
    synthetic: 'true',
  };
  if (!fields.compatibility) return null;
  if (checksum !== null)
    fields.checksum = `{"algorithm":"sha-256","value":${JSON.stringify(checksum)}}`;
  return `{${Object.keys(fields)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${fields[key]}`)
    .join(',')}}`;
}

/** Bracket depth before JSON.parse, so nesting cannot exhaust a parser. */
function nestingWithin(text: string, limit: number): boolean {
  let depth = 0;
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (quoted) {
      if (code === 0x5c) index += 1;
      else if (code === 0x22) quoted = false;
    } else if (code === 0x22) quoted = true;
    else if (code === 0x7b || code === 0x5b) {
      depth += 1;
      if (depth > limit) return false;
    } else if (code === 0x7d || code === 0x5d) depth -= 1;
  }
  return true;
}

/** Untrusted text → validated in-memory staging. Nothing here can write state. */
export function readSyntheticLoopBackup(
  text: unknown,
): SyntheticBackupResult<ValidatedSyntheticBackup> {
  if (typeof text !== 'string') return fail('not_backup');
  if (
    text.length > SYNTHETIC_BACKUP_LIMITS.bytes ||
    utf8Length(text) > SYNTHETIC_BACKUP_LIMITS.bytes
  )
    return fail('too_large');
  const looksLikeBackup = text.startsWith(canonicalPrefix);
  if (!nestingWithin(text, SYNTHETIC_BACKUP_LIMITS.depth))
    return fail(looksLikeBackup ? 'damaged' : 'not_backup');
  let decoded: unknown;
  try {
    decoded = JSON.parse(text) as unknown;
  } catch {
    return fail(looksLikeBackup ? 'damaged' : 'not_backup');
  }
  const data = dataRecord(decoded, 64);
  if (!data || data.format !== SYNTHETIC_BACKUP_FORMAT)
    return fail('not_backup');
  if (data.formatVersion !== SYNTHETIC_BACKUP_FORMAT_VERSION)
    return fail(
      typeof data.formatVersion === 'number' &&
        Number.isSafeInteger(data.formatVersion) &&
        data.formatVersion > SYNTHETIC_BACKUP_FORMAT_VERSION
        ? 'newer_version'
        : 'not_backup',
    );
  if (!hasKeys(data, envelopeKeys) || data.synthetic !== true)
    return fail('invalid_contents');
  const checksum = dataRecord(data.checksum, 2);
  if (
    !checksum ||
    !hasKeys(checksum, ['algorithm', 'value']) ||
    checksum.algorithm !== 'sha-256' ||
    typeof checksum.value !== 'string' ||
    !/^[0-9a-f]{64}$/.test(checksum.value)
  )
    return fail('damaged');
  const profiles = dataArray(data.profiles, SYNTHETIC_BACKUP_LIMITS.profiles);
  if (!profiles) return fail('invalid_contents');
  // Exact canonical spelling rejects whitespace, duplicate/reordered keys and
  // numeric tokens JSON.parse would round before the checksum is trusted.
  if (envelopeText(data.compatibility, profiles, checksum.value) !== text)
    return fail('damaged');
  const body = envelopeText(data.compatibility, profiles, null);
  if (body === null || sha256Hex(body) !== checksum.value)
    return fail('damaged');
  if (
    canonicalText(data.compatibility) !==
    canonicalText(SYNTHETIC_BACKUP_COMPATIBILITY)
  )
    return fail('incompatible');
  if (profiles.length === 0) return fail('invalid_contents');
  const records: SyntheticLoopRecord[] = [];
  for (const raw of profiles) {
    const record = syntheticRecordFromPortable(raw);
    if (!record.ok) return record;
    const previous = records.at(-1);
    // One canonical file per world: fixed slot order and no duplicate badge.
    if (
      previous &&
      SYNTHETIC_PROFILE_IDS.indexOf(previous.profileId) >=
        SYNTHETIC_PROFILE_IDS.indexOf(record.value.profileId)
    )
      return fail('invalid_contents');
    records.push(record.value);
  }
  return {
    ok: true,
    value: Object.freeze({
      checksum: checksum.value,
      profiles: Object.freeze(records),
    }),
  };
}

/** Build a file from a consistent native snapshot of saved records. The text is
 * read back through the import validator before it is offered for saving. */
export function createSyntheticLoopBackup(
  input: readonly unknown[],
): SyntheticBackupResult<SyntheticBackupFile> {
  if (input.length === 0) return fail('nothing_saved');
  if (input.length > SYNTHETIC_BACKUP_LIMITS.profiles)
    return fail('invalid_contents');
  const records: SyntheticLoopRecord[] = [];
  for (const raw of input) {
    const record = validatedPayload(raw, syntheticLoopCodec);
    if (!record.ok) return fail('invalid_contents');
    records.push(record.value);
  }
  records.sort(
    (a, b) =>
      SYNTHETIC_PROFILE_IDS.indexOf(a.profileId) -
      SYNTHETIC_PROFILE_IDS.indexOf(b.profileId),
  );
  const portable = records.map(portableSyntheticProfile);
  const body = envelopeText(SYNTHETIC_BACKUP_COMPATIBILITY, portable, null);
  if (body === null) return fail('invalid_contents');
  const text = envelopeText(
    SYNTHETIC_BACKUP_COMPATIBILITY,
    portable,
    sha256Hex(body),
  );
  const backup = readSyntheticLoopBackup(text);
  if (text === null || !backup.ok) return fail('invalid_contents');
  for (const [index, record] of records.entries()) {
    const restored = backup.value.profiles[index];
    // Reconstruction must reproduce the source's stored derived state exactly.
    if (
      !restored ||
      canonicalText(portableSyntheticProfile(restored)) !==
        canonicalText(portable[index]) ||
      canonicalText(restored.derived) !== canonicalText(record.derived)
    )
      return fail('invalid_contents');
  }
  return {
    ok: true,
    value: Object.freeze({
      text,
      backup: backup.value,
      excludedPending: records.filter((record) => record.pending !== null)
        .length,
    }),
  };
}

/** Explicit creates for an empty destination under its current epoch. Fresh
 * caller-supplied destination operation IDs; no source control metadata. */
export function createSyntheticLoopRestorePlan(
  backup: ValidatedSyntheticBackup,
  destinationEpoch: unknown,
  operations: readonly string[],
): ApplicationResult<readonly RepositoryCommand<SyntheticLoopRecord>[]> {
  const epoch = storageEpoch(destinationEpoch);
  if (
    !epoch.ok ||
    operations.length !== backup.profiles.length ||
    new Set(operations).size !== operations.length
  )
    return applicationFailure('invalid_command');
  const commands: RepositoryCommand<SyntheticLoopRecord>[] = [];
  for (const [index, record] of backup.profiles.entries()) {
    const op = operationId(operations[index]);
    const id = syntheticLoopRecordId(record.profileId);
    if (!op.ok || !id.ok) return applicationFailure('invalid_command');
    const command = commandFromData(
      {
        version: COMMAND_VERSION,
        recordSchema: syntheticLoopCodec.schema,
        kind: 'create',
        expectedRevision: null,
        operationId: op.value,
        recordId: id.value,
        storageEpoch: epoch.value,
        payload: record,
      },
      syntheticLoopCodec,
    );
    if (!command.ok) return command;
    commands.push(command.value);
  }
  return applicationSuccess(Object.freeze(commands));
}

export interface SyntheticBackupProfileSummary {
  readonly profileId: SyntheticProfileId;
  readonly world: 'original' | 'growing';
  readonly preferences: LoopPreferences;
  readonly mode: SyntheticLoopMode;
  readonly selectedFamily: LoopFamilyId;
  readonly sessionOrdinal: number;
  readonly sessionActive: boolean;
  readonly completedCount: number;
  readonly independent: number;
  readonly supported: number;
  readonly worked: number;
  /** Later unassisted repeats confirming coverage; never a new case. */
  readonly confirmations: number;
  readonly notYet: number;
  readonly notCounted: number;
  readonly accomplishments: readonly {
    readonly concept: string;
    readonly state: Exclude<AttainedState, 'Unseen'>;
  }[];
  readonly discoveries: readonly ChapterFamilyId[];
  /** Saved help for the latest session, kept until a new session starts. */
  readonly helpContexts: number;
}

/** Preview counts use the engine's own frozen evidence classifications. */
export function summarizeSyntheticLoopProfile(
  record: SyntheticLoopRecord,
): SyntheticBackupProfileSummary {
  const legacy = deriveSyntheticLoop(record.profileId, record.events);
  const journey = growingJourneyForRecord(record);
  const outcomes = [
    ...(legacy.ok
      ? legacy.value.snapshot.receipts.map((receipt) => ({
          outcome: receipt.observation.outcome,
          reason: receipt.observation.reasonCode,
        }))
      : []),
    ...(journey.ok
      ? journey.value.classifications.map((item) => ({
          outcome: item.outcome,
          reason: item.reason,
        }))
      : []),
  ];
  const count = (test: (item: (typeof outcomes)[number]) => boolean) =>
    outcomes.filter(test).length;
  const accomplishments = legacy.ok
    ? Object.entries(legacy.value.snapshot.concepts)
        .filter(([, state]) => state.attained !== 'Unseen')
        .map(([concept, state]) => ({
          concept,
          state: state.attained as Exclude<AttainedState, 'Unseen'>,
        }))
        .sort((a, b) => (a.concept < b.concept ? -1 : 1))
    : [];
  return Object.freeze({
    profileId: record.profileId,
    world: record.schema === GROWING_LOOP_SCHEMA ? 'growing' : 'original',
    preferences: record.preferences,
    mode: record.mode,
    selectedFamily: record.selectedFamily,
    sessionOrdinal: record.sessionOrdinal,
    sessionActive: record.sessionActive,
    completedCount: record.completedCount,
    independent: count((item) => item.outcome === 'independentSuccess'),
    supported: count((item) => item.outcome === 'supportedSuccess'),
    worked: count(
      (item) =>
        item.outcome === 'excluded' && item.reason === 'solutionExposed',
    ),
    confirmations: count((item) => item.reason === 'independentConfirmation'),
    notYet: count((item) => item.outcome === 'unsuccessful'),
    notCounted: count(
      (item) =>
        item.outcome === 'excluded' &&
        item.reason !== 'solutionExposed' &&
        item.reason !== 'independentConfirmation',
    ),
    accomplishments: Object.freeze(accomplishments),
    discoveries: Object.freeze(
      journey.ok
        ? journey.value.readiness
            .filter((item) => item.readyForInvitation)
            .map((item) => item.familyId)
        : [],
    ),
    helpContexts:
      record.schema === GROWING_LOOP_SCHEMA ? record.chapterSupport.length : 0,
  });
}
