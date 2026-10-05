import { dataArray, dataRecord, hasKeys } from '../core/data';
import { identifier } from '../core/identifiers';
import type { ConceptId, FamilyId } from '../core/identifiers';
import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';

export const MATHEMATICAL_DOMAINS = Object.freeze([
  'number_sense',
  'arithmetic',
  'patterns_sequences',
  'multiplication_division',
  'geometry_spatial',
  'measurement',
  'powers_roots',
  'fractions',
  'decimals_percentages',
  'algebra',
  'logic',
  'probability_combinatorics',
] as const);

export type MathematicalDomain = (typeof MATHEMATICAL_DOMAINS)[number];

export interface ConceptNode {
  readonly id: ConceptId;
  readonly domains: readonly MathematicalDomain[];
}

// For prerequisite edges, from is the prerequisite and to is the dependent.
// Only necessary understanding gates readiness; a teaching path can be bypassed.
export type ConceptEdge =
  | {
      readonly kind: 'prerequisite';
      readonly from: ConceptId;
      readonly to: ConceptId;
      readonly requirement: 'necessary' | 'recommended';
      readonly rationaleKey: string;
      readonly diagnosticProbeId: FamilyId;
    }
  | {
      readonly kind: 'related' | 'representationOf' | 'inverseOf';
      readonly from: ConceptId;
      readonly to: ConceptId;
    };

export interface ConceptGraph {
  readonly schema: 'concept-graph-v1';
  readonly concepts: readonly ConceptNode[];
  readonly edges: readonly ConceptEdge[];
}

export const GRAPH_LIMITS = Object.freeze({ concepts: 256, edges: 1024 });

function domain(input: unknown): MathematicalDomain | undefined {
  return MATHEMATICAL_DOMAINS.find((candidate) => candidate === input);
}

function parseConcept(input: unknown): DomainResult<ConceptNode> {
  const record = dataRecord(input);
  if (!record || !hasKeys(record, ['id', 'domains']))
    return failure('invalid_graph');
  const id = identifier('concept', record.id);
  const memberships = dataArray(record.domains, MATHEMATICAL_DOMAINS.length);
  if (
    !id.ok ||
    !memberships ||
    memberships.length === 0 ||
    memberships.length > MATHEMATICAL_DOMAINS.length
  ) {
    return failure('invalid_graph');
  }
  const domains: MathematicalDomain[] = [];
  for (const membership of memberships) {
    const value = domain(membership);
    if (!value || domains.includes(value)) return failure('invalid_graph');
    domains.push(value);
  }
  return success({ id: id.value, domains });
}

function parseEdge(input: unknown): DomainResult<ConceptEdge> {
  const record = dataRecord(input);
  if (!record) return failure('invalid_graph');
  const from = identifier('concept', record.from);
  const to = identifier('concept', record.to);
  if (!from.ok || !to.ok) return failure('invalid_graph');
  if (record.kind === 'prerequisite') {
    const rationale = identifier('representation', record.rationaleKey);
    const probe = identifier('family', record.diagnosticProbeId);
    if (
      !hasKeys(record, [
        'kind',
        'from',
        'to',
        'requirement',
        'rationaleKey',
        'diagnosticProbeId',
      ]) ||
      !rationale.ok ||
      !probe.ok ||
      (record.requirement !== 'necessary' &&
        record.requirement !== 'recommended')
    ) {
      return failure('invalid_graph');
    }
    return success({
      kind: 'prerequisite',
      from: from.value,
      to: to.value,
      requirement: record.requirement,
      rationaleKey: rationale.value,
      diagnosticProbeId: probe.value,
    });
  }
  if (
    !hasKeys(record, ['kind', 'from', 'to']) ||
    (record.kind !== 'related' &&
      record.kind !== 'representationOf' &&
      record.kind !== 'inverseOf')
  ) {
    return failure('invalid_graph');
  }
  return success({ kind: record.kind, from: from.value, to: to.value });
}

// Iterative Kahn traversal bounds stack/work by the validated node/edge limits.
function gatingIsAcyclic(
  concepts: readonly ConceptNode[],
  edges: readonly ConceptEdge[],
): boolean {
  const indegree = new Map<ConceptId, number>(
    concepts.map((concept) => [concept.id, 0]),
  );
  const successors = new Map<ConceptId, ConceptId[]>();
  for (const edge of edges) {
    if (edge.kind !== 'prerequisite' || edge.requirement !== 'necessary')
      continue;
    if (edge.from === edge.to) return false;
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    const list = successors.get(edge.from) ?? [];
    list.push(edge.to);
    successors.set(edge.from, list);
  }
  const queue = concepts
    .filter((concept) => indegree.get(concept.id) === 0)
    .map((concept) => concept.id);
  let visited = 0;
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === undefined) return false;
    visited += 1;
    for (const next of successors.get(current) ?? []) {
      const count = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, count);
      if (count === 0) queue.push(next);
    }
  }
  return visited === concepts.length;
}

export function conceptGraphFromDto(
  input: unknown,
): DomainResult<ConceptGraph> {
  const record = dataRecord(input);
  if (!record || !hasKeys(record, ['schema', 'concepts', 'edges']))
    return failure('invalid_graph');
  if (record.schema !== 'concept-graph-v1')
    return failure('unsupported_version');
  const rawConcepts = dataArray(record.concepts, GRAPH_LIMITS.concepts);
  const rawEdges = dataArray(record.edges, GRAPH_LIMITS.edges);
  if (
    !rawConcepts ||
    !rawEdges ||
    rawConcepts.length > GRAPH_LIMITS.concepts ||
    rawEdges.length > GRAPH_LIMITS.edges
  )
    return failure('invalid_graph');
  const concepts: ConceptNode[] = [];
  const ids = new Set<ConceptId>();
  for (const raw of rawConcepts) {
    const parsed = parseConcept(raw);
    if (!parsed.ok || ids.has(parsed.value.id)) return failure('invalid_graph');
    ids.add(parsed.value.id);
    concepts.push(parsed.value);
  }
  const edges: ConceptEdge[] = [];
  const keys = new Set<string>();
  for (const raw of rawEdges) {
    const parsed = parseEdge(raw);
    if (!parsed.ok || !ids.has(parsed.value.from) || !ids.has(parsed.value.to))
      return failure('invalid_graph');
    const edge = parsed.value;
    // The same kind/pair cannot carry competing prerequisite policies/probes.
    const key = `${edge.kind}:${edge.from}:${edge.to}`;
    if (keys.has(key)) return failure('invalid_graph');
    keys.add(key);
    edges.push(edge);
  }
  if (!gatingIsAcyclic(concepts, edges)) return failure('invalid_graph');
  return success({ schema: 'concept-graph-v1', concepts, edges });
}
