import { repositoryConformance, value } from '../../conformance/repository';
import { createSyntheticRepository } from '../../fakes/synthetic-repository';
import {
  syntheticLearnerCodec,
  syntheticLearnerRecord,
} from '../../fixtures/synthetic/learner-record';

repositoryConformance(
  'test-only synthetic memory',
  (initial) =>
    Promise.resolve(
      value(createSyntheticRepository(syntheticLearnerCodec, initial)),
    ),
  syntheticLearnerCodec,
  syntheticLearnerRecord,
  (payload) => {
    const scope = payload.assessments[0]?.evidence.scopes[0];
    if (!scope) throw new Error('Synthetic nested scope missing');
    Object.assign(scope, { conceptId: 'synthetic-mutated-alias' });
  },
);
