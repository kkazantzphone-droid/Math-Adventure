// Fixed synthetic simulation in the existing capability-gated developer build.
// No record store, user input, answer log, or persistence operation is involved.
import {
  createPhase2EvidenceCatalog,
  certifyEvidenceCatalog,
} from '../../../src/domain/adaptation/catalog';
import { ADAPTATION_POLICY } from '../../../src/domain/adaptation/policy';
import {
  applySyntheticObservation,
  emptySyntheticSnapshot,
  getConceptState,
} from '../../../src/domain/adaptation/state';
import {
  emptySelectionMemory,
  recommendSynthetic,
} from '../../../src/domain/adaptation/selection';
import type { SyntheticObservationInput } from '../../../src/domain/adaptation/types';

export function runSyntheticAdaptationProof() {
  const result = createPhase2EvidenceCatalog([
    {
      familyId: 'number.addition',
      maximum: 5,
      coverage: 'singleRepresentationCandidate',
    },
    {
      familyId: 'geometry.quadrilateral',
      maximum: 3,
      coverage: 'singleRepresentationCandidate',
    },
    {
      familyId: 'measurement.unit-length',
      maximum: 8,
      coverage: 'singleRepresentationCandidate',
    },
  ]);
  if (!result.ok) throw new Error('syntheticCatalogUnavailable');
  const evidenceCatalog = result.value;
  const certificate = certifyEvidenceCatalog(
    evidenceCatalog,
    ADAPTATION_POLICY,
  );
  if (!certificate.ok) throw new Error('syntheticCatalogUnattainable');
  let snapshot = emptySyntheticSnapshot();
  let observed = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    for (const scope of evidenceCatalog.scopes) {
      for (let index = pass * 5; index < pass * 5 + 5; index += 1) {
        const item = scope.cases[index % 5];
        if (!item) throw new Error('syntheticEvidenceUnavailable');
        const input: SyntheticObservationInput = {
          synthetic: true,
          id: `SYNTHETIC-proof-${observed}`,
          concept: scope.conceptId,
          representation: item.representationId,
          taskFingerprint: item.fingerprint,
          evidenceFingerprint: item.fingerprint,
          sessionOrdinal: index < 5 ? 1 : 2,
          coarseDay: pass * 2,
          clockCertain: true,
          mathematicalHintTier: 0,
          solutionExposed: false,
          meaningfulAttempts: 1,
          mode: 'practice',
          completion: 'completed',
          accessible: true,
          correct: true,
          accessibilitySupports: [],
          variationCase: true,
          revisit: false,
          policyVersion: ADAPTATION_POLICY.version,
          generatorVersion: item.generatorVersion,
        };
        const applied = applySyntheticObservation(
          snapshot,
          input,
          evidenceCatalog,
        );
        if (!applied.ok) throw new Error('syntheticObservationRefused');
        snapshot = applied.snapshot;
        observed += 1;
      }
      if (
        pass === 1 &&
        getConceptState(snapshot, scope.conceptId).attained !== 'Secure'
      )
        throw new Error('syntheticSecureWitnessFailed');
    }
  }
  const case0 = evidenceCatalog.scopes[0]?.cases[0];
  if (!case0) throw new Error('syntheticEvidenceUnavailable');
  const exposure: SyntheticObservationInput = {
    synthetic: true,
    id: 'SYNTHETIC-number-lab',
    concept: case0.conceptId,
    representation: case0.representationId,
    taskFingerprint: case0.fingerprint,
    evidenceFingerprint: case0.fingerprint,
    sessionOrdinal: 100,
    coarseDay: 1000,
    clockCertain: false,
    mathematicalHintTier: 3,
    solutionExposed: true,
    meaningfulAttempts: 3,
    mode: 'numberLab',
    completion: 'completed',
    accessible: true,
    correct: false,
    accessibilitySupports: ['speechReplay'],
    variationCase: true,
    revisit: true,
    policyVersion: ADAPTATION_POLICY.version,
    generatorVersion: case0.generatorVersion,
  };
  const exposed = applySyntheticObservation(
    snapshot,
    exposure,
    evidenceCatalog,
  );
  if (
    !exposed.ok ||
    exposed.snapshot !== snapshot ||
    exposed.observation.outcome !== 'excluded'
  )
    throw new Error('syntheticExposureChangedMastery');
  let memory = emptySelectionMemory(snapshot);
  const offered = new Set<string>();
  const catalog = evidenceCatalog.scopes.map((scope) => ({
    concept: scope.conceptId,
    prerequisiteReady: true,
    generationAvailable: true,
  }));
  for (let i = 0; i < catalog.length; i += 1) {
    const recommendation = recommendSynthetic({
      snapshot,
      evidenceCatalog,
      catalog,
      intent: { kind: 'automatic' },
      policyVersion: ADAPTATION_POLICY.version,
      coarseDay: 60,
      clockCertain: true,
      sessionOrdinal: i + 3,
      seed: '00000001000000020000000300000004',
      memory,
    });
    if (recommendation.concept === null)
      throw new Error('syntheticRecommendationUnavailable');
    offered.add(recommendation.concept);
    memory = recommendation.memory;
    snapshot = recommendation.snapshot;
  }
  if (offered.size !== catalog.length)
    throw new Error('syntheticRotationFailed');
  return {
    synthetic: true as const,
    policyVersion: ADAPTATION_POLICY.version,
    status: ADAPTATION_POLICY.status,
    educatorReview: ADAPTATION_POLICY.educatorReview,
    concepts: certificate.value.length,
    meaningfulCases: certificate.value.map((item) => item.meaningfulCases),
    secureWitnesses: certificate.value.length,
    observations: observed,
    exposureNeutral: true,
    rotationOffers: offered.size,
  };
}
