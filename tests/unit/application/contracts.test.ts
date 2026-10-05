import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  advanceEpoch,
  advanceRevision,
  operationId,
  recordId,
  revision,
  storageEpoch,
} from '../../../src/application/core/integrity';
import { applicationSuccess } from '../../../src/application/core/result';
import type {
  RecordCodec,
  RepositoryCommand,
} from '../../../src/application/ports/repository';
import {
  capabilitySnapshotFromData,
  representationCapabilityFromData,
  speechCapabilityFromData,
  speechOutcomeFromData,
  storageCapabilityFromData,
} from '../../../src/application/ports/capability-validation';
import {
  commandFingerprint,
  commandFromData,
  receiptFromData,
  snapshotFromData,
  validatedPayload,
} from '../../../src/application/repository/validation';
import { canonicalize } from '../../../src/domain/replay/canonical';
import {
  command,
  profileA,
  profileB,
  value,
} from '../../conformance/repository';
import { createSyntheticRepository } from '../../fakes/synthetic-repository';
import {
  syntheticExplorationSession,
  syntheticLearnerCodec,
  syntheticLearnerRecord,
  syntheticRootExposure,
} from '../../fixtures/synthetic/learner-record';
import type { SyntheticLearnerRecord } from '../../fixtures/synthetic/learner-record';

describe('application integrity boundaries', () => {
  it('validates scalar bounds/opaque IDs and fails increment without wrapping', () => {
    for (const input of [
      -1,
      0.5,
      Infinity,
      NaN,
      Number.MAX_SAFE_INTEGER + 1,
      '0',
      null,
    ]) {
      expect(revision(input).ok).toBe(false);
      expect(storageEpoch(input).ok).toBe(false);
    }
    expect(value(revision(-0))).toBe(0);
    expect(value(advanceRevision(value(revision(0))))).toBe(1);
    expect(value(advanceEpoch(value(storageEpoch(0))))).toBe(1);
    expect(advanceRevision(value(revision(Number.MAX_SAFE_INTEGER)))).toEqual({
      ok: false,
      error: { code: 'revision_overflow' },
    });
    expect(advanceEpoch(value(storageEpoch(Number.MAX_SAFE_INTEGER)))).toEqual({
      ok: false,
      error: { code: 'epoch_overflow' },
    });
    for (const id of [
      '',
      'EMAIL@example.invalid',
      'synthetic--id',
      'a'.repeat(97),
      ' name ',
      1,
      null,
    ]) {
      expect(operationId(id).ok).toBe(false);
      expect(recordId(id).ok).toBe(false);
    }
  });

  it('canonical fingerprints ignore key order but retain every command field/payload distinction', () => {
    const cmd = command(
      syntheticLearnerCodec,
      'create',
      'synthetic-fingerprint',
      profileA,
      value(storageEpoch(0)),
      value(revision(0)),
      syntheticLearnerRecord(0),
    );
    const reversed = Object.fromEntries(Object.entries(cmd).reverse());
    expect(commandFingerprint(reversed, syntheticLearnerCodec)).toEqual(
      commandFingerprint(cmd, syntheticLearnerCodec),
    );
    for (const changed of [
      { ...cmd, payload: syntheticLearnerRecord(1) },
      { ...cmd, recordId: profileB },
      { ...cmd, storageEpoch: 1 },
      { ...cmd, operationId: 'synthetic-other' },
      { ...cmd, kind: 'update', expectedRevision: 1 },
    ])
      expect(commandFingerprint(changed, syntheticLearnerCodec)).not.toEqual(
        commandFingerprint(cmd, syntheticLearnerCodec),
      );
  });

  it('rejects malformed commands atomically, without invoking accessors or storing failure receipts', async () => {
    const repo = value(createSyntheticRepository(syntheticLearnerCodec));
    const cmd = command(
      syntheticLearnerCodec,
      'create',
      'synthetic-malformed',
      profileA,
      value(storageEpoch(0)),
      value(revision(0)),
      syntheticLearnerRecord(0),
    );
    let reads = 0;
    const getter = Object.defineProperty({ ...cmd }, 'payload', {
      enumerable: true,
      get: () => {
        reads += 1;
        return syntheticLearnerRecord(0);
      },
    });
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const cases: unknown[] = [
      { ...cmd, operationId: '' },
      { ...cmd, recordId: 'bad id' },
      { ...cmd, storageEpoch: -1 },
      { ...cmd, storageEpoch: Number.MAX_SAFE_INTEGER + 1 },
      { ...cmd, expectedRevision: 0 },
      { ...cmd, version: 'atomic-command-v2' },
      { ...cmd, recordSchema: 'future-schema' },
      { ...cmd, kind: 'upsert' },
      { ...cmd, extra: 'synthetic' },
      { ...cmd, payload: () => 1 },
      { ...cmd, payload: cyclic },
      { ...cmd, payload: { text: 'x'.repeat(4097) } },
      { ...cmd, payload: { deep: Array.from({ length: 10_001 }, () => 0) } },
      { ...cmd, payload: { value: 1n } },
      getter,
      Object.create(cmd),
      { ...cmd, kind: 'update', expectedRevision: -1 },
      { ...cmd, kind: 'delete', expectedRevision: 0.5 },
    ];
    const before = {
      epoch: await repo.getEpoch(),
      record: await repo.load(profileA),
    };
    for (const invalid of cases) {
      expect(
        (
          await repo.execute(
            invalid as RepositoryCommand<SyntheticLearnerRecord>,
          )
        ).ok,
      ).toBe(false);
      expect({
        epoch: await repo.getEpoch(),
        record: await repo.load(profileA),
      }).toEqual(before);
    }
    expect(reads).toBe(0);
    expect((await repo.execute(cmd)).ok).toBe(true);
  });

  it('validates adapter snapshots/receipts and rejects extra identifying data/schema versions', () => {
    const snapshot = {
      recordId: profileA,
      revision: 1,
      storageEpoch: 0,
      payload: syntheticLearnerRecord(0),
    };
    expect(snapshotFromData(snapshot, syntheticLearnerCodec).ok).toBe(true);
    for (const invalid of [
      { ...snapshot, revision: -1 },
      { ...snapshot, storageEpoch: Infinity },
      { ...snapshot, realName: 'synthetic-forbidden' },
      { ...snapshot, payload: {} },
    ])
      expect(snapshotFromData(invalid, syntheticLearnerCodec).ok).toBe(false);
    const receipt = {
      version: 'atomic-receipt-v1',
      kind: 'create',
      operationId: 'synthetic-receipt',
      recordId: profileA,
      revision: 1,
      storageEpoch: 0,
    };
    expect(receiptFromData(receipt).ok).toBe(true);
    for (const invalid of [
      { ...receipt, revision: -1 },
      { ...receipt, kind: 'upsert' },
      { ...receipt, version: 'atomic-receipt-v2' },
      { ...receipt, history: [] },
    ])
      expect(receiptFromData(invalid).ok).toBe(false);
    const checked = value(snapshotFromData(snapshot, syntheticLearnerCodec));
    expect(
      createSyntheticRepository(syntheticLearnerCodec, {
        epoch: value(storageEpoch(0)),
        records: [checked, checked],
      }).ok,
    ).toBe(false);
  });

  it('detaches codec output and rejects codecs introducing non-data output', () => {
    const external = { marker: 'synthetic-only', value: 1 };
    const codec: RecordCodec<typeof external> = {
      schema: 'synthetic-codec-v1',
      decode: () => applicationSuccess(external),
    };
    const decoded = value(validatedPayload(external, codec));
    external.value = 2;
    expect(decoded.value).toBe(1);
    expect(
      validatedPayload(
        {},
        {
          schema: 'synthetic-bad',
          decode: () => applicationSuccess({ fn: () => 1 }),
        },
      ).ok,
    ).toBe(false);
    expect(
      validatedPayload(
        { value: 1 },
        {
          schema: 'synthetic-changing-codec',
          decode: () => applicationSuccess({ value: 2 }),
        },
      ).ok,
    ).toBe(false);
    expect(
      validatedPayload(
        { value: 1, extra: true },
        {
          schema: 'synthetic-lossy-codec',
          decode: () => applicationSuccess({ value: 1 }),
        },
      ).ok,
    ).toBe(false);
    expect(
      validatedPayload(
        { value: 1 },
        {
          schema: 'synthetic-in-place-codec',
          decode: (input) => {
            Object.assign(input as object, { value: 2 });
            return applicationSuccess(input);
          },
        },
      ).ok,
    ).toBe(false);
    const leakingFailure = {
      ok: false as const,
      error: {
        code: 'invalid_record' as const,
        payload: { marker: 'synthetic-only' },
      },
    };
    expect(
      validatedPayload(
        {},
        { schema: 'synthetic-error-codec', decode: () => leakingFailure },
      ),
    ).toEqual({ ok: false, error: { code: 'invalid_record' } });
  });
});

describe('synthetic evidence privacy and session separation', () => {
  it('stores scoped arithmetic/spatial observations with no roots evidence/global level or personal fields', () => {
    const record = value(
      syntheticLearnerCodec.decode(syntheticLearnerRecord()),
    );
    const concepts = record.assessments.flatMap((assessment) =>
      assessment.evidence.scopes.map((scope) => scope.conceptId),
    );
    expect(concepts.filter((id) => id === 'synthetic-arithmetic')).toHaveLength(
      3,
    );
    expect(concepts).toContain('synthetic-geometry');
    expect(concepts).toContain('synthetic-measurement');
    expect(concepts).not.toContain('synthetic-roots');
    const text = canonicalize(record);
    expect(text.ok).toBe(true);
    if (text.ok)
      expect(text.value).not.toMatch(
        /realName|birthDate|email|siblingId|deviceId|geolocation|globalLevel|exploratoryExposure|timestamp/,
      );
    for (const key of [
      'realName',
      'birthDate',
      'email',
      'siblingId',
      'deviceId',
      'ip',
      'geolocation',
    ])
      expect(
        syntheticLearnerCodec.decode({
          ...record,
          [key]: 'synthetic-forbidden',
        }).ok,
      ).toBe(false);
  });

  it('rejects Number Lab exposure in persistent assessment data and clears the separate session slot', async () => {
    const repo = value(createSyntheticRepository(syntheticLearnerCodec));
    const record = syntheticLearnerRecord();
    const cmd = command(
      syntheticLearnerCodec,
      'create',
      'synthetic-exposure',
      profileA,
      value(storageEpoch(0)),
      value(revision(0)),
      record,
    );
    value(await repo.execute(cmd));
    const before = await repo.load(profileA);
    const exposure = syntheticRootExposure();
    const session = syntheticExplorationSession();
    session.expose(exposure);
    expect(session.current()?.kind).toBe('exploratoryExposure');
    expect(await repo.load(profileA)).toEqual(before);
    const malformed = {
      marker: 'synthetic-only',
      assessments: [{ evidence: exposure, outcome: 'independentCorrect' }],
    };
    expect(syntheticLearnerCodec.decode(malformed).ok).toBe(false);
    expect(
      commandFromData(
        { ...cmd, kind: 'update', expectedRevision: 1, payload: malformed },
        syntheticLearnerCodec,
      ).ok,
    ).toBe(false);
    const update = {
      ...cmd,
      kind: 'update',
      expectedRevision: value(revision(1)),
      payload: malformed,
    } as unknown as RepositoryCommand<SyntheticLearnerRecord>;
    expect((await repo.execute(update)).ok).toBe(false);
    expect(await repo.load(profileA)).toEqual(before);
    session.switchProfile();
    expect(session.current()).toBeUndefined();
  });

  it('compiler rejects exploratory evidence in the persistent synthetic record', () => {
    const config = ts.readConfigFile('tsconfig.domain.json', (path) =>
      ts.sys.readFile(path),
    );
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
    const program = ts.createProgram(
      ['tests/fixtures/architecture/persistence/exposure.ts'],
      parsed.options,
    );
    const errors = ts.getPreEmitDiagnostics(program);
    expect(errors.map((diagnostic) => diagnostic.code)).toContain(2322);
  });
});

describe('capability and speech contract vocabulary', () => {
  it('validates every capability/outcome vocabulary without detecting a device', () => {
    for (const state of [
      'unknown',
      'available',
      'unavailable',
      'quota-limited',
    ])
      expect(storageCapabilityFromData({ state }).ok).toBe(true);
    expect(
      storageCapabilityFromData({
        state: 'degraded',
        saving: 'unsaved-session-only',
      }).ok,
    ).toBe(true);
    for (const state of [
      'unknown',
      'loading',
      'missing',
      'ready-local',
      'error',
    ])
      expect(speechCapabilityFromData({ state }).ok).toBe(true);
    expect(
      speechCapabilityFromData({
        state: 'tested-offline',
        scope: 'current-provider-and-surface',
      }).ok,
    ).toBe(true);
    for (const state of ['unknown', 'supported', 'unsupported'])
      expect(representationCapabilityFromData({ state }).ok).toBe(true);
    expect(
      representationCapabilityFromData({
        state: 'degraded',
        alternativeAvailable: true,
      }).ok,
    ).toBe(true);
    for (const kind of [
      'completed',
      'cancelled',
      'unavailable',
      'error',
      'timeout',
    ])
      expect(speechOutcomeFromData({ kind }).ok).toBe(true);
    expect(
      capabilitySnapshotFromData({
        storage: { state: 'unavailable' },
        speech: { state: 'missing' },
        representation: { state: 'unsupported' },
      }).ok,
    ).toBe(true);
    for (const parser of [
      storageCapabilityFromData,
      speechCapabilityFromData,
      representationCapabilityFromData,
    ])
      expect(parser({ state: 'future', correctAnswer: 4 }).ok).toBe(false);
    expect(speechCapabilityFromData({ state: 'tested-offline' }).ok).toBe(
      false,
    );
    expect(speechOutcomeFromData({ kind: 'incorrect-answer' }).ok).toBe(false);
  });

  it('unavailable speech/representation/storage facts do not alter or block repository commits', async () => {
    const facts = value(
      capabilitySnapshotFromData({
        storage: { state: 'unknown' },
        speech: { state: 'missing' },
        representation: { state: 'unsupported' },
      }),
    );
    const repo = value(createSyntheticRepository(syntheticLearnerCodec));
    value(
      await repo.execute(
        command(
          syntheticLearnerCodec,
          'create',
          'synthetic-independent-save',
          profileA,
          value(storageEpoch(0)),
          value(revision(0)),
          syntheticLearnerRecord(),
        ),
      ),
    );
    expect(value(await repo.load(profileA)).payload).toEqual(
      syntheticLearnerRecord(),
    );
    expect(facts.speech.state).toBe('missing');
  });
});
