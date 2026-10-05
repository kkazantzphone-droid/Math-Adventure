import type { ExploratoryExposure } from '../../../../src/domain/puzzles/contracts';
import type { SyntheticLearnerRecord } from '../../synthetic/learner-record';

declare const exposure: ExploratoryExposure;
export const forbidden: SyntheticLearnerRecord = {
  marker: 'synthetic-only',
  assessments: [{ evidence: exposure, outcome: 'independentCorrect' }],
};
