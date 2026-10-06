// SYNTHETIC READINESS FIXTURES ONLY. Invented layouts, never shipped schemas.
// No IndexedDB/browser access, clock, hidden randomness or real learner data.
// These static inputs/expected outputs do not implement a production migration.
import { identifier } from '../../../src/domain/core/identifiers';
import type {
  Identifier,
  IdentifierKind,
} from '../../../src/domain/core/identifiers';
import type { SyntheticLearnerRecord } from '../synthetic/learner-record';

function syntheticId<K extends IdentifierKind>(
  kind: K,
  value: string,
): Identifier<K> {
  const checked = identifier(kind, value);
  if (!checked.ok || !value.startsWith('synthetic-'))
    throw new Error('Invalid synthetic migration scope');
  return checked.value;
}

interface SyntheticFixtureRow {
  readonly recordId: string;
  readonly revision: number;
  readonly payload: SyntheticLearnerRecord;
}

const fingerprint =
  '{"expectedRevision":null,"kind":"create","operationId":"synthetic-migration-create-a","payload":{"assessments":[],"marker":"synthetic-only"},"recordId":"synthetic-migration-profile-a","recordSchema":"synthetic-learner-v1","storageEpoch":7,"version":"atomic-command-v1"}';

export const syntheticMigrationSource = {
  provenance: 'invented-synthetic-rehearsal-never-shipped',
  fixtureLayoutVersion: 1,
  metadata: { schemaVersion: 1, storageEpoch: 7, recoveryPhase: 'ready' },
  records: [
    {
      recordId: 'synthetic-migration-profile-a',
      revision: 3,
      payload: {
        marker: 'synthetic-only',
        assessments: [
          {
            evidence: {
              kind: 'assessment',
              mode: 'practice',
              eligibleForMastery: true,
              scopes: [
                {
                  conceptId: syntheticId(
                    'concept',
                    'synthetic-migration-geometry',
                  ),
                  representationId: syntheticId(
                    'representation',
                    'synthetic-migration-shape',
                  ),
                },
              ],
            },
            outcome: 'supportedCorrect',
          },
        ],
      },
    },
    {
      recordId: 'synthetic-migration-profile-b',
      revision: 1,
      payload: { marker: 'synthetic-only', assessments: [] },
    },
  ] as const satisfies readonly SyntheticFixtureRow[],
  receipts: [
    {
      operationId: 'synthetic-migration-create-a',
      recordId: 'synthetic-migration-profile-a',
      storageEpoch: 7,
      fingerprint,
      receipt: {
        version: 'atomic-receipt-v1',
        kind: 'create',
        operationId: 'synthetic-migration-create-a',
        recordId: 'synthetic-migration-profile-a',
        revision: 1,
        storageEpoch: 7,
      },
    },
  ],
} as const;

// Independent written target. Do not derive its rows from the source fixture:
// an implementation under test must compare its result against this fixed data.
export const syntheticMigrationExpected = {
  provenance: 'invented-synthetic-rehearsal-never-shipped',
  fixtureLayoutVersion: 2,
  metadata: { schemaVersion: 2, storageEpoch: 7, recoveryPhase: 'ready' },
  records: [
    {
      recordId: 'synthetic-migration-profile-a',
      revision: 3,
      recordSchema: 'synthetic-learner-v1',
      payload: {
        marker: 'synthetic-only',
        assessments: [
          {
            evidence: {
              kind: 'assessment',
              mode: 'practice',
              eligibleForMastery: true,
              scopes: [
                {
                  conceptId: syntheticId(
                    'concept',
                    'synthetic-migration-geometry',
                  ),
                  representationId: syntheticId(
                    'representation',
                    'synthetic-migration-shape',
                  ),
                },
              ],
            },
            outcome: 'supportedCorrect',
          },
        ],
      },
    },
    {
      recordId: 'synthetic-migration-profile-b',
      revision: 1,
      recordSchema: 'synthetic-learner-v1',
      payload: { marker: 'synthetic-only', assessments: [] },
    },
  ],
  receipts: [
    {
      operationId: 'synthetic-migration-create-a',
      recordId: 'synthetic-migration-profile-a',
      storageEpoch: 7,
      fingerprint:
        '{"expectedRevision":null,"kind":"create","operationId":"synthetic-migration-create-a","payload":{"assessments":[],"marker":"synthetic-only"},"recordId":"synthetic-migration-profile-a","recordSchema":"synthetic-learner-v1","storageEpoch":7,"version":"atomic-command-v1"}',
      receipt: {
        version: 'atomic-receipt-v1',
        kind: 'create',
        operationId: 'synthetic-migration-create-a',
        recordId: 'synthetic-migration-profile-a',
        revision: 1,
        storageEpoch: 7,
      },
    },
  ],
} as const;

export const syntheticMigrationCheckpoint = {
  marker: 'synthetic-only',
  planId: 'synthetic-layout-1-to-2',
  sourceVersion: 1,
  targetVersion: 2,
  // Source revisions/epochs/receipts are not restore authority.
  learnerRows: [
    {
      recordId: 'synthetic-migration-profile-a',
      recordSchema: 'synthetic-learner-v1',
      payload: {
        marker: 'synthetic-only',
        assessments: [
          {
            evidence: {
              kind: 'assessment',
              mode: 'practice',
              eligibleForMastery: true,
              scopes: [
                {
                  conceptId: syntheticId(
                    'concept',
                    'synthetic-migration-geometry',
                  ),
                  representationId: syntheticId(
                    'representation',
                    'synthetic-migration-shape',
                  ),
                },
              ],
            },
            outcome: 'supportedCorrect',
          },
        ],
      },
    },
    {
      recordId: 'synthetic-migration-profile-b',
      recordSchema: 'synthetic-learner-v1',
      payload: { marker: 'synthetic-only', assessments: [] },
    },
  ],
} as const;

export const syntheticMigrationPlans = [
  {
    id: 'synthetic-compatible-forward',
    sourceVersion: 1,
    targetVersion: 2,
    condition: 'validated-source-and-checkpoint',
    expected: 'exact-target-after-reopen-validation',
  },
  {
    id: 'synthetic-invalid-payload',
    sourceVersion: 1,
    targetVersion: 2,
    condition: 'add-realName-field-to-synthetic-payload',
    expected: 'reject-before-upgrade-source-unchanged',
  },
  {
    id: 'synthetic-checkpoint-quota',
    sourceVersion: 1,
    targetVersion: 2,
    condition: 'checkpoint-transaction-quota-abort',
    expected: 'reject-before-upgrade-source-unchanged',
  },
  {
    id: 'synthetic-upgrade-abort',
    sourceVersion: 1,
    targetVersion: 2,
    condition: 'native-abort-after-first-transformed-row',
    expected: 'source-layout-restored-prepared-recovery',
  },
  {
    id: 'synthetic-blocked-upgrade',
    sourceVersion: 1,
    targetVersion: 2,
    condition: 'other-connection-refuses-close',
    expected: 'source-retained-no-delete-workaround',
  },
  {
    id: 'synthetic-cancelled-late-upgrade',
    sourceVersion: 1,
    targetVersion: 2,
    condition: 'coordinator-cancels-before-blocker-closes',
    expected: 'late-upgrade-aborted-source-retained',
  },
  {
    id: 'synthetic-crash-prepared',
    sourceVersion: 1,
    targetVersion: 2,
    condition: 'restart-after-checkpoint-before-upgrade',
    expected: 'read-only-source-recovery-explicit-resume-or-cancel',
  },
  {
    id: 'synthetic-crash-unverified',
    sourceVersion: 1,
    targetVersion: 2,
    condition: 'restart-after-upgrade-before-reopen-validation',
    expected: 'read-only-target-recovery-no-silent-reset',
  },
  {
    id: 'synthetic-future-version',
    sourceVersion: 3,
    targetVersion: 2,
    condition: 'old-app-requests-lower-version',
    expected: 'unsupported-schema-zero-writes',
  },
  {
    id: 'synthetic-delete-checkpoint',
    sourceVersion: 1,
    targetVersion: 2,
    condition: 'delete-profile-before-preparation-transaction',
    expected: 'advance-live-fence-no-deleted-row-in-checkpoint',
  },
  {
    id: 'synthetic-restore-stale-fence',
    sourceVersion: 1,
    targetVersion: 2,
    condition: 'clear-after-restore-preview-before-commit',
    expected: 'epoch-conflict-no-checkpoint-resurrection',
  },
] as const;
