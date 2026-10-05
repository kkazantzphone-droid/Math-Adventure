import { dataArray, dataRecord, hasKeys } from '../../../src/domain/core/data';
import { evidenceScopeFromDto } from '../../../src/domain/puzzles/contracts';
import type {
  AssessmentEvidenceScope,
  ExploratoryExposure,
} from '../../../src/domain/puzzles/contracts';
import { identifier } from '../../../src/domain/core/identifiers';
import {
  applicationFailure,
  applicationSuccess,
} from '../../../src/application/core/result';
import type { ApplicationResult } from '../../../src/application/core/result';
import type { RecordCodec } from '../../../src/application/ports/repository';

// TEST ONLY: scoped observations, no attained state, threshold or adaptation rule.
export interface SyntheticLearnerRecord {
  readonly marker: 'synthetic-only';
  readonly assessments: readonly {
    readonly evidence: AssessmentEvidenceScope;
    readonly outcome: 'independentCorrect' | 'supportedCorrect';
  }[];
}

export const syntheticLearnerCodec: RecordCodec<SyntheticLearnerRecord> = {
  schema: 'synthetic-learner-v1',
  decode(input: unknown): ApplicationResult<SyntheticLearnerRecord> {
    const data = dataRecord(input, 2);
    if (
      !data ||
      !hasKeys(data, ['marker', 'assessments']) ||
      data.marker !== 'synthetic-only'
    )
      return applicationFailure('invalid_record');
    // Structural test-fixture work bound; not the proposed production retention limit.
    const assessments = dataArray(data.assessments, 32);
    if (!assessments) return applicationFailure('invalid_record');
    const checked: SyntheticLearnerRecord['assessments'][number][] = [];
    for (const raw of assessments) {
      const entry = dataRecord(raw, 2);
      if (
        !entry ||
        !hasKeys(entry, ['evidence', 'outcome']) ||
        (entry.outcome !== 'independentCorrect' &&
          entry.outcome !== 'supportedCorrect')
      )
        return applicationFailure('invalid_record');
      const evidence = evidenceScopeFromDto(entry.evidence);
      if (!evidence.ok || evidence.value.kind !== 'assessment')
        return applicationFailure('invalid_record');
      checked.push({ evidence: evidence.value, outcome: entry.outcome });
    }
    return applicationSuccess({
      marker: 'synthetic-only',
      assessments: checked,
    });
  },
};

function scope(
  concept: string,
  representation: string,
): AssessmentEvidenceScope {
  const conceptId = identifier('concept', concept);
  const representationId = identifier('representation', representation);
  if (!conceptId.ok || !representationId.ok)
    throw new Error('Synthetic scope invalid');
  return {
    kind: 'assessment',
    mode: 'practice',
    eligibleForMastery: true,
    scopes: [
      { conceptId: conceptId.value, representationId: representationId.value },
    ],
  };
}

export function syntheticLearnerRecord(variant = 0): SyntheticLearnerRecord {
  return {
    marker: 'synthetic-only',
    assessments: [
      // Narrative: varied arithmetic observations versus supported spatial work.
      ...Array.from({ length: 3 + (variant % 3) }, () => ({
        evidence: scope('synthetic-arithmetic', 'synthetic-symbolic'),
        outcome: 'independentCorrect' as const,
      })),
      {
        evidence: scope('synthetic-geometry', 'synthetic-shape'),
        outcome: 'supportedCorrect',
      },
      {
        evidence: scope('synthetic-measurement', 'synthetic-unit'),
        outcome: 'supportedCorrect',
      },
    ],
  };
}

export function syntheticRootExposure(): ExploratoryExposure {
  return {
    ...scope('synthetic-roots', 'synthetic-root-expression'),
    kind: 'exploratoryExposure',
    mode: 'numberLab',
    eligibleForMastery: false,
    retention: 'sessionOnly',
  };
}

/** A single bounded synthetic slot demonstrates clear-on-switch, not Number Lab. */
export function syntheticExplorationSession(): {
  readonly expose: (exposure: ExploratoryExposure) => void;
  readonly current: () => ExploratoryExposure | undefined;
  readonly switchProfile: () => void;
} {
  let slot: ExploratoryExposure | undefined;
  return {
    expose: (exposure) => {
      slot = exposure;
    },
    current: () => slot,
    switchProfile: () => {
      slot = undefined;
    },
  };
}
