import { describe, expect, it } from 'vitest';
import {
  operationId,
  recordId,
  revision,
  storageEpoch,
} from '../../../src/application/core/integrity';
import {
  commandFingerprint,
  commandFromData,
  receiptFromData,
  validatedPayload,
} from '../../../src/application/repository/validation';
import { parseCanonicalData } from '../../../src/domain/replay/canonical';
import {
  syntheticMigrationCheckpoint,
  syntheticMigrationExpected,
  syntheticMigrationPlans,
  syntheticMigrationSource,
} from '../../fixtures/phase-3-readiness/migration-plans';
import { syntheticLearnerCodec } from '../../fixtures/synthetic/learner-record';

describe('synthetic readiness migration fixture consistency (no database)', () => {
  it('keeps valid payloads, profile isolation and immutable old receipts across the proposed layout change', () => {
    const source = syntheticMigrationSource;
    const target = syntheticMigrationExpected;
    expect(source.provenance).toBe(
      'invented-synthetic-rehearsal-never-shipped',
    );
    expect(target.provenance).toBe(source.provenance);
    expect(target.fixtureLayoutVersion).toBeGreaterThan(
      source.fixtureLayoutVersion,
    );
    expect(target.metadata.schemaVersion).toBe(target.fixtureLayoutVersion);
    expect(source.metadata.schemaVersion).toBe(source.fixtureLayoutVersion);
    expect(target.metadata.storageEpoch).toBe(source.metadata.storageEpoch);
    expect(storageEpoch(target.metadata.storageEpoch).ok).toBe(true);
    expect(target.records).toHaveLength(source.records.length);
    expect(new Set(target.records.map((row) => row.recordId)).size).toBe(2);
    const nestedEvidence = [
      {
        evidence: {
          kind: 'assessment',
          mode: 'practice',
          eligibleForMastery: true,
          scopes: [
            {
              conceptId: 'synthetic-migration-geometry',
              representationId: 'synthetic-migration-shape',
            },
          ],
        },
        outcome: 'supportedCorrect',
      },
    ];
    expect(source.records[0].payload.assessments).toEqual(nestedEvidence);
    expect(target.records[0].payload.assessments).toEqual(nestedEvidence);
    expect(
      syntheticMigrationCheckpoint.learnerRows[0].payload.assessments,
    ).toEqual(nestedEvidence);
    expect(source.records[1].payload.assessments).toEqual([]);
    expect(target.records[1].payload.assessments).toEqual([]);
    for (const old of source.records) {
      const next = target.records.find((row) => row.recordId === old.recordId);
      expect(next).toEqual({
        ...old,
        recordSchema: syntheticLearnerCodec.schema,
      });
      expect(recordId(old.recordId).ok).toBe(true);
      expect(old.recordId.startsWith('synthetic-')).toBe(true);
      expect(revision(old.revision).ok).toBe(true);
      expect(validatedPayload(old.payload, syntheticLearnerCodec).ok).toBe(
        true,
      );
    }
    expect(target.receipts).toEqual(source.receipts);
    for (const stored of target.receipts) {
      expect(operationId(stored.operationId).ok).toBe(true);
      expect(receiptFromData(stored.receipt).ok).toBe(true);
      const decoded = parseCanonicalData(stored.fingerprint);
      expect(decoded.ok).toBe(true);
      if (!decoded.ok) throw new Error('Synthetic fingerprint invalid');
      const command = commandFromData(decoded.value, syntheticLearnerCodec);
      expect(command.ok).toBe(true);
      if (!command.ok) throw new Error('Synthetic command invalid');
      expect(command.value.operationId).toBe(stored.operationId);
      expect(command.value.recordId).toBe(stored.recordId);
      expect(command.value.storageEpoch).toBe(stored.storageEpoch);
      expect(command.value.kind).toBe('create');
      if (command.value.kind !== 'create')
        throw new Error('Synthetic create required');
      expect(command.value.payload.assessments).toEqual([]);
      expect(commandFingerprint(command.value, syntheticLearnerCodec)).toEqual({
        ok: true,
        value: stored.fingerprint,
      });
      // An original create receipt must not become the later current revision.
      expect(stored.receipt.revision).toBe(1);
      expect(target.records[0].revision).toBe(3);
    }
  });

  it('rejects the forbidden field plan without changing the fixed valid source', () => {
    const original = structuredClone(syntheticMigrationSource);
    const forbidden = {
      ...syntheticMigrationSource.records[0].payload,
      realName: 'SYNTHETIC FORBIDDEN FIELD PROBE',
    };
    expect(validatedPayload(forbidden, syntheticLearnerCodec)).toEqual({
      ok: false,
      error: { code: 'invalid_record' },
    });
    expect(syntheticMigrationSource).toEqual(original);
  });

  it('keeps checkpoint control-free and records future, abort and interrupted plans without claiming execution', () => {
    const checkpoint = syntheticMigrationCheckpoint;
    expect(Object.keys(checkpoint).sort()).toEqual(
      [
        'marker',
        'planId',
        'sourceVersion',
        'targetVersion',
        'learnerRows',
      ].sort(),
    );
    expect(checkpoint.marker).toBe('synthetic-only');
    for (const row of checkpoint.learnerRows) {
      expect(Object.keys(row).sort()).toEqual(
        ['recordId', 'recordSchema', 'payload'].sort(),
      );
      expect(validatedPayload(row.payload, syntheticLearnerCodec).ok).toBe(
        true,
      );
    }
    expect(new Set(syntheticMigrationPlans.map((plan) => plan.id)).size).toBe(
      11,
    );
    expect(
      syntheticMigrationPlans.every((plan) => plan.id.startsWith('synthetic-')),
    ).toBe(true);
    expect(
      syntheticMigrationPlans.find(
        (plan) => plan.id === 'synthetic-future-version',
      ),
    ).toEqual({
      id: 'synthetic-future-version',
      sourceVersion: 3,
      targetVersion: 2,
      condition: 'old-app-requests-lower-version',
      expected: 'unsupported-schema-zero-writes',
    });
    expect(
      syntheticMigrationPlans.find(
        (plan) => plan.id === 'synthetic-upgrade-abort',
      )?.expected,
    ).toBe('source-layout-restored-prepared-recovery');
    expect(
      syntheticMigrationPlans.find(
        (plan) => plan.id === 'synthetic-crash-unverified',
      )?.expected,
    ).toBe('read-only-target-recovery-no-silent-reset');
    expect(
      syntheticMigrationPlans.find(
        (plan) => plan.id === 'synthetic-restore-stale-fence',
      )?.expected,
    ).toBe('epoch-conflict-no-checkpoint-resurrection');
  });
});
