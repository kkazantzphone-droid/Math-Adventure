import { dataArray, dataRecord, hasKeys } from '../core/data';
import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import type { ProofFamilyId } from '../families/proofs';
import { canonicalize } from '../replay/canonical';

export const EVIDENCE_CATALOG_VERSION = 'phase3b-evidence-catalog-v1';

/** This semantic quotient is an experimental evidence scope, not educator approval. */
export interface EvidenceCase {
  readonly conceptId: string;
  readonly representationId: string;
  readonly fingerprint: string;
  readonly variationCase: string;
  readonly familyId: ProofFamilyId;
  readonly generatorVersion: string;
  readonly maximum: number;
  readonly parameters: readonly number[];
}

export interface ConceptEvidenceScope {
  readonly conceptId: string;
  readonly familyId: ProofFamilyId;
  readonly generatorVersion: string;
  readonly maximum: number;
  readonly representations: readonly string[];
  readonly coverage: 'default' | 'singleRepresentationCandidate';
  readonly educatorReview: 'required';
  readonly cases: readonly EvidenceCase[];
}

export interface SyntheticEvidenceCatalog {
  readonly version: typeof EVIDENCE_CATALOG_VERSION;
  readonly scopes: readonly ConceptEvidenceScope[];
}

export interface SecurePolicyRequirements {
  readonly secureWindow: number;
  readonly secureIndependent: number;
  readonly secureSessions: number;
  readonly secureVariation: number;
  readonly representationIndependent: number;
  readonly fingerprintLimit: number;
  readonly retrievalGapDays: number;
  readonly perConceptLimit?: number;
  readonly learnerLimit?: number;
  readonly ageLimitDays?: number;
}

export interface EvidenceAttainability {
  readonly conceptId: string;
  readonly meaningfulCases: number;
  readonly maximumWindowEntries: number;
  readonly requiredWindow: number;
  readonly representations: number;
  readonly educatorReview: 'required';
}

export type CatalogFailureReason =
  | 'invalidCatalog'
  | 'invalidPolicy'
  | 'unattainableWindow'
  | 'unattainableRepresentation'
  | 'unattainableVariation';

export type CatalogCertification<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly error: { readonly code: 'invalid_input' };
      readonly reason: CatalogFailureReason;
    };

const SECURE_REQUIREMENTS: SecurePolicyRequirements = Object.freeze({
  secureWindow: 10,
  secureIndependent: 8,
  secureSessions: 2,
  secureVariation: 2,
  representationIndependent: 2,
  fingerprintLimit: 2,
  retrievalGapDays: 2,
});

const declarations = Object.freeze({
  'number.addition': {
    conceptId: 'addition.part-whole',
    representationId: 'representation.addition-groups',
    generatorVersion: 'addition-bounded-v1',
    minimum: 0,
    maximum: 5,
  },
  'geometry.quadrilateral': {
    conceptId: 'geometry.quadrilateral.attributes',
    representationId: 'representation.geometry-attributes',
    generatorVersion: 'quadrilateral-bounded-v1',
    minimum: 1,
    maximum: 3,
  },
  'measurement.unit-length': {
    conceptId: 'measurement.length.unit-iteration',
    representationId: 'representation.unit-iteration',
    generatorVersion: 'unit-length-bounded-v1',
    minimum: 1,
    maximum: 8,
  },
});

function gcd(first: number, second: number): number {
  let a = first;
  let b = second;
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/**
 * Shape evidence depends on exact side ratio and angle, not size, orientation,
 * vertex order or winding. Adjacent squared lengths and the absolute dot product
 * determine a parallelogram up to similarity and an exchange of its two sides.
 * Dividing their common integer factor removes uniform scaling without epsilon.
 */
function shapeFingerprint(
  width: number,
  height: number,
  shear: number,
): string {
  const first = width * width;
  const second = height * height + shear * shear;
  const dot = width * shear;
  const factor = gcd(gcd(first, second), dot);
  return `shape:${Math.min(first, second) / factor}:${Math.max(first, second) / factor}:${dot / factor}`;
}

export function phase2EvidenceFingerprint(
  familyId: ProofFamilyId,
  parameters: readonly number[],
): DomainResult<string> {
  if (!Object.hasOwn(declarations, familyId)) return failure('invalid_input');
  const values = dataArray(parameters, 3);
  if (!values || !values.every((value) => Number.isSafeInteger(value)))
    return failure('invalid_input');
  const [a, b, shear] = parameters;
  if (a === undefined) return failure('invalid_input');
  if (familyId === 'number.addition') {
    if (
      parameters.length !== 2 ||
      b === undefined ||
      a < 0 ||
      b < 0 ||
      a > 5 ||
      b > 5
    )
      return failure('invalid_input');
    return success(`add:${Math.min(a, b)}:${Math.max(a, b)}`);
  }
  if (familyId === 'geometry.quadrilateral') {
    if (
      parameters.length !== 3 ||
      b === undefined ||
      shear === undefined ||
      a < 1 ||
      b < 1 ||
      a > 3 ||
      b > 3 ||
      (shear !== 0 && shear !== 1)
    )
      return failure('invalid_input');
    return success(shapeFingerprint(a, b, shear));
  }
  return parameters.length === 1 && a >= 1 && a <= 8
    ? success(`length:${a}`)
    : failure('invalid_input');
}

export function buildPhase2EvidenceScope(
  familyId: ProofFamilyId,
  maximum: number,
  coverage: ConceptEvidenceScope['coverage'] = 'default',
): DomainResult<ConceptEvidenceScope> {
  if (!Object.hasOwn(declarations, familyId)) return failure('invalid_input');
  const declaration = declarations[familyId];
  if (
    !Number.isSafeInteger(maximum) ||
    maximum < declaration.minimum ||
    maximum > declaration.maximum ||
    (coverage !== 'default' && coverage !== 'singleRepresentationCandidate')
  )
    return failure('invalid_input');
  const cases = new Map<string, EvidenceCase>();
  function add(parameters: readonly number[]): void {
    const fingerprint = phase2EvidenceFingerprint(familyId, parameters);
    if (!fingerprint.ok)
      throw new Error('Invalid bounded evidence declaration');
    if (!cases.has(fingerprint.value))
      cases.set(
        fingerprint.value,
        Object.freeze({
          conceptId: declaration.conceptId,
          representationId: declaration.representationId,
          fingerprint: fingerprint.value,
          variationCase: fingerprint.value,
          familyId,
          generatorVersion: declaration.generatorVersion,
          maximum,
          parameters: Object.freeze([...parameters]),
        }),
      );
  }
  if (familyId === 'number.addition') {
    for (let left = 0; left <= maximum; left += 1)
      for (let right = left; right <= maximum; right += 1) add([left, right]);
  } else if (familyId === 'geometry.quadrilateral') {
    for (let width = 1; width <= maximum; width += 1)
      for (let height = 1; height <= maximum; height += 1)
        for (const shear of [0, 1]) add([width, height, shear]);
  } else {
    for (let length = 1; length <= maximum; length += 1) add([length]);
  }
  return success(
    Object.freeze({
      conceptId: declaration.conceptId,
      familyId,
      generatorVersion: declaration.generatorVersion,
      maximum,
      representations: Object.freeze([declaration.representationId]),
      coverage,
      educatorReview: 'required' as const,
      cases: Object.freeze(
        [...cases.values()].sort((a, b) =>
          a.fingerprint < b.fingerprint
            ? -1
            : a.fingerprint > b.fingerprint
              ? 1
              : 0,
        ),
      ),
    }),
  );
}

export function createPhase2EvidenceCatalog(
  specs: readonly {
    readonly familyId: ProofFamilyId;
    readonly maximum: number;
    readonly coverage: ConceptEvidenceScope['coverage'];
  }[],
): DomainResult<SyntheticEvidenceCatalog> {
  if (!dataArray(specs, 3) || specs.length === 0)
    return failure('invalid_input');
  const scopes: ConceptEvidenceScope[] = [];
  for (const spec of specs) {
    const row = dataRecord(spec);
    if (!row || !hasKeys(row, ['familyId', 'maximum', 'coverage']))
      return failure('invalid_input');
    const checked = buildPhase2EvidenceScope(
      spec.familyId,
      spec.maximum,
      spec.coverage,
    );
    if (
      !checked.ok ||
      scopes.some((scope) => scope.conceptId === checked.value.conceptId)
    )
      return failure('invalid_input');
    scopes.push(checked.value);
  }
  scopes.sort((a, b) =>
    a.conceptId < b.conceptId ? -1 : a.conceptId > b.conceptId ? 1 : 0,
  );
  return success(
    Object.freeze({
      version: EVIDENCE_CATALOG_VERSION,
      scopes: Object.freeze(scopes),
    }),
  );
}

function rejected(reason: CatalogFailureReason): CatalogCertification<never> {
  return { ok: false, error: { code: 'invalid_input' }, reason };
}

function validPolicy(policy: SecurePolicyRequirements): boolean {
  if (!dataRecord(policy, 64)) return false;
  const perConceptLimit = policy.perConceptLimit ?? 10;
  const learnerLimit = policy.learnerLimit ?? 500;
  const ageLimitDays = policy.ageLimitDays ?? 60;
  return (
    [
      policy.secureWindow,
      policy.secureIndependent,
      policy.secureSessions,
      policy.secureVariation,
      policy.representationIndependent,
      policy.fingerprintLimit,
      policy.retrievalGapDays,
    ].every(
      (value) => Number.isSafeInteger(value) && value >= 1 && value <= 500,
    ) &&
    policy.secureIndependent <= policy.secureWindow &&
    policy.secureSessions <= policy.secureWindow &&
    [perConceptLimit, learnerLimit].every(
      (value) => Number.isSafeInteger(value) && value >= 1 && value <= 500,
    ) &&
    Number.isSafeInteger(ageLimitDays) &&
    ageLimitDays >= 0 &&
    ageLimitDays <= 500 &&
    policy.secureWindow <= perConceptLimit &&
    policy.secureWindow <= learnerLimit
  );
}

export function certifyEvidenceScope(
  scope: ConceptEvidenceScope,
  policy: SecurePolicyRequirements = SECURE_REQUIREMENTS,
): CatalogCertification<EvidenceAttainability> {
  const record = dataRecord(scope);
  if (
    !record ||
    !hasKeys(record, [
      'conceptId',
      'familyId',
      'generatorVersion',
      'maximum',
      'representations',
      'coverage',
      'educatorReview',
      'cases',
    ]) ||
    typeof record.familyId !== 'string' ||
    !Object.hasOwn(declarations, record.familyId)
  )
    return rejected('invalidCatalog');
  const rebuilt = buildPhase2EvidenceScope(
    scope.familyId,
    scope.maximum,
    scope.coverage,
  );
  const actual = canonicalize(scope);
  const expected = rebuilt.ok ? canonicalize(rebuilt.value) : rebuilt;
  if (!actual.ok || !expected.ok || actual.value !== expected.value)
    return rejected('invalidCatalog');
  if (!validPolicy(policy)) return rejected('invalidPolicy');
  if (scope.coverage === 'default' && scope.representations.length < 2)
    return rejected('unattainableRepresentation');
  if (
    scope.coverage === 'singleRepresentationCandidate' &&
    (scope.representations.length !== 1 || scope.educatorReview !== 'required')
  )
    return rejected('invalidCatalog');
  const eligibleOccurrences = Math.min(
    policy.fingerprintLimit,
    1 + Math.floor((policy.ageLimitDays ?? 60) / policy.retrievalGapDays),
  );
  const maximumWindowEntries = scope.cases.length * eligibleOccurrences;
  if (maximumWindowEntries < policy.secureWindow)
    return rejected('unattainableWindow');
  if (
    policy.representationIndependent * scope.representations.length >
    policy.secureWindow
  )
    return rejected('unattainableRepresentation');
  if (
    scope.cases.length < policy.secureVariation ||
    policy.secureVariation > policy.secureWindow
  )
    return rejected('unattainableVariation');
  return {
    ok: true,
    value: Object.freeze({
      conceptId: scope.conceptId,
      meaningfulCases: scope.cases.length,
      maximumWindowEntries,
      requiredWindow: policy.secureWindow,
      representations: scope.representations.length,
      educatorReview: 'required',
    }),
  };
}

export function certifyEvidenceCatalog(
  catalog: SyntheticEvidenceCatalog,
  policy: SecurePolicyRequirements = SECURE_REQUIREMENTS,
): CatalogCertification<readonly EvidenceAttainability[]> {
  const record = dataRecord(catalog);
  if (
    !record ||
    !hasKeys(record, ['version', 'scopes']) ||
    record.version !== EVIDENCE_CATALOG_VERSION ||
    !dataArray(record.scopes, 3) ||
    catalog.scopes.length === 0
  )
    return rejected('invalidCatalog');
  const certificates: EvidenceAttainability[] = [];
  for (const scope of catalog.scopes) {
    const checked = certifyEvidenceScope(scope, policy);
    if (!checked.ok) return checked;
    if (
      certificates.some(
        (certificate) => certificate.conceptId === scope.conceptId,
      )
    )
      return rejected('invalidCatalog');
    certificates.push(checked.value);
  }
  return { ok: true, value: Object.freeze(certificates) };
}

export function findEvidenceCase(
  catalog: SyntheticEvidenceCatalog,
  input: {
    readonly concept: string;
    readonly representation: string;
    readonly evidenceFingerprint: string;
    readonly generatorVersion: string;
    readonly taskFingerprint?: string;
  },
): EvidenceCase | undefined {
  const scope = catalog.scopes.find(
    (candidate) => candidate.conceptId === input.concept,
  );
  return scope?.cases.find(
    (candidate) =>
      candidate.representationId === input.representation &&
      candidate.fingerprint === input.evidenceFingerprint &&
      candidate.generatorVersion === input.generatorVersion &&
      (input.taskFingerprint === undefined ||
        input.taskFingerprint === candidate.fingerprint),
  );
}
