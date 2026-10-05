import { conceptGraphFromDto } from '../concepts/graph';
import type { ConceptGraph } from '../concepts/graph';
import type { DomainResult } from '../core/result';

// Catalog relationships describe mathematical connections, never prerequisite
// gates, learner transitions or automatic evidence credit to another concept.
// The existing DTO reader checks stable branded IDs, resource limits and graph
// validity. It supplies detached metadata; no unvalidated type assertion is used.
export const PHASE2_CONCEPT_GRAPH: DomainResult<ConceptGraph> =
  conceptGraphFromDto({
    schema: 'concept-graph-v1',
    concepts: [
      { id: 'counting.cardinality', domains: ['number_sense'] },
      { id: 'addition.part-whole', domains: ['arithmetic'] },
      { id: 'measurement.length.unit-iteration', domains: ['measurement'] },
      {
        id: 'geometry.quadrilateral.attributes',
        domains: ['geometry_spatial'],
      },
      { id: 'geometry.square.attributes', domains: ['geometry_spatial'] },
      {
        id: 'geometry.square-unit-array',
        domains: ['geometry_spatial', 'measurement'],
      },
      { id: 'powers.square-numbers', domains: ['powers_roots'] },
      { id: 'roots.perfect-square', domains: ['powers_roots'] },
    ],
    edges: [
      // Combining parts can be represented by counting their combined quantity.
      {
        kind: 'related',
        from: 'addition.part-whole',
        to: 'counting.cardinality',
      },
      // Iterated equal units connect length measurement with cardinal counting.
      {
        kind: 'related',
        from: 'counting.cardinality',
        to: 'measurement.length.unit-iteration',
      },
      // Quadrilaterals have measurable edge lengths; this is no readiness gate.
      {
        kind: 'related',
        from: 'measurement.length.unit-iteration',
        to: 'geometry.quadrilateral.attributes',
      },
      // Square attributes retain inclusive quadrilateral/rectangle membership.
      {
        kind: 'related',
        from: 'geometry.quadrilateral.attributes',
        to: 'geometry.square.attributes',
      },
      {
        kind: 'related',
        from: 'geometry.square.attributes',
        to: 'geometry.square-unit-array',
      },
      {
        kind: 'representationOf',
        from: 'geometry.square-unit-array',
        to: 'powers.square-numbers',
      },
      // Inverse means nonnegative square numbers and their principal perfect
      // square roots. It does not describe the real solution set of x² = n.
      {
        kind: 'inverseOf',
        from: 'powers.square-numbers',
        to: 'roots.perfect-square',
      },
    ],
  });

if (PHASE2_CONCEPT_GRAPH.ok) {
  for (const concept of PHASE2_CONCEPT_GRAPH.value.concepts) {
    Object.freeze(concept.domains);
    Object.freeze(concept);
  }
  for (const edge of PHASE2_CONCEPT_GRAPH.value.edges) Object.freeze(edge);
  Object.freeze(PHASE2_CONCEPT_GRAPH.value.concepts);
  Object.freeze(PHASE2_CONCEPT_GRAPH.value.edges);
  Object.freeze(PHASE2_CONCEPT_GRAPH.value);
}
Object.freeze(PHASE2_CONCEPT_GRAPH);
