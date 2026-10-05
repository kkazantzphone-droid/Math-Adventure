// SYNTHETIC ARCHITECTURE FIXTURES ONLY. This is not curriculum/game content,
// a puzzle-family implementation, a learner or a stored evidence history.
export const syntheticCrossDomainGraph = {
  schema: 'concept-graph-v1',
  concepts: [
    {
      id: 'multiplication.rectangular_arrays',
      domains: ['multiplication_division', 'geometry_spatial', 'measurement'],
    },
    { id: 'geometry.shape.square', domains: ['geometry_spatial'] },
    {
      id: 'measurement.area.unit_squares',
      domains: ['measurement', 'geometry_spatial'],
    },
    {
      id: 'powers.square_numbers',
      domains: ['powers_roots', 'multiplication_division'],
    },
    { id: 'roots.perfect_square', domains: ['powers_roots'] },
    { id: 'fractions.area_parts', domains: ['fractions', 'geometry_spatial'] },
  ],
  edges: [
    {
      kind: 'related',
      from: 'multiplication.rectangular_arrays',
      to: 'measurement.area.unit_squares',
    },
    {
      kind: 'related',
      from: 'measurement.area.unit_squares',
      to: 'multiplication.rectangular_arrays',
    },
    {
      kind: 'representationOf',
      from: 'geometry.shape.square',
      to: 'powers.square_numbers',
    },
    {
      kind: 'inverseOf',
      from: 'powers.square_numbers',
      to: 'roots.perfect_square',
    },
    {
      kind: 'inverseOf',
      from: 'roots.perfect_square',
      to: 'powers.square_numbers',
    },
    {
      kind: 'representationOf',
      from: 'fractions.area_parts',
      to: 'measurement.area.unit_squares',
    },
    {
      kind: 'prerequisite',
      from: 'powers.square_numbers',
      to: 'roots.perfect_square',
      requirement: 'necessary',
      rationaleKey: 'synthetic.square_inverse',
      diagnosticProbeId: 'synthetic.square_relation',
    },
    {
      kind: 'prerequisite',
      from: 'roots.perfect_square',
      to: 'powers.square_numbers',
      requirement: 'recommended',
      rationaleKey: 'synthetic.inverse_revisit',
      diagnosticProbeId: 'synthetic.inverse_relation',
    },
  ],
} as const;

const zero = {
  schema: 'rational-v1',
  numerator: '0',
  denominator: '1',
} as const;
const four = {
  schema: 'rational-v1',
  numerator: '4',
  denominator: '1',
} as const;

export const syntheticSquareScene = {
  schema: 'geometry-scene-v1',
  objects: [
    {
      kind: 'polygon',
      id: 'synthetic.square',
      vertices: [
        { x: zero, y: zero },
        { x: four, y: zero },
        { x: four, y: four },
        { x: zero, y: four },
      ],
    },
  ],
} as const;

export const syntheticReplay = {
  schema: 'replay-v1',
  canonicalization: 'canonical-json-v1',
  semanticVersion: 'semantic-v1',
  familyId: 'synthetic.contract',
  generatorVersion: 'synthetic-v1',
  contentVersion: 'synthetic-v1',
  rngAlgorithm: 'xoshiro128ss-v1',
  seedHex: '00000001000000020000000300000004',
  spec: { synthetic: true, purpose: 'semantic-contract-test' },
} as const;

export const syntheticSquarePuzzle = {
  schema: 'puzzle-instance-v1',
  semanticVersion: 'semantic-v1',
  instanceId: 'synthetic.instance',
  replay: syntheticReplay,
  task: {
    kind: 'classifyGeometry',
    scene: syntheticSquareScene,
    objectId: 'synthetic.square',
    classIds: ['geometry.class.square', 'geometry.class.rectangle'],
  },
  answerContract: {
    kind: 'classification',
    expectedClassIds: ['geometry.class.square', 'geometry.class.rectangle'],
    selection: 'allApplicable',
  },
  hintPlan: [{ kind: 'focus', objectIds: ['synthetic.square'] }],
  evidenceScope: {
    kind: 'assessment',
    mode: 'diagnostic',
    eligibleForMastery: true,
    scopes: [
      {
        conceptId: 'geometry.shape.square',
        representationId: 'geometry.logical_polygon',
      },
    ],
  },
} as const;

export const syntheticRootExposure = {
  kind: 'exploratoryExposure',
  mode: 'numberLab',
  eligibleForMastery: false,
  retention: 'sessionOnly',
  scopes: [
    {
      conceptId: 'roots.perfect_square',
      representationId: 'expression.principal_root',
    },
  ],
} as const;
