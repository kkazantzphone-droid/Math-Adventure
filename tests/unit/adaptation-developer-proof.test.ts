import { expect, it } from 'vitest';
import { runSyntheticAdaptationProof } from '../browser/phase3/adaptation-proof';

it('runs the fixed synthetic developer proof with reviewed candidate bounds', () => {
  expect(runSyntheticAdaptationProof()).toEqual({
    synthetic: true,
    policyVersion: 'phase3b-synthetic-policy-v1',
    status: 'experimental',
    educatorReview: 'required',
    concepts: 3,
    meaningfulCases: [21, 12, 8],
    secureWitnesses: 3,
    observations: 30,
    exposureNeutral: true,
    rotationOffers: 3,
  });
});
