import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { conceptGraphFromDto } from '../../../src/domain/concepts/graph';

const parameters = { seed: 20261007, numRuns: 1000 };

// Independent transitive-closure oracle; production uses indegree removal.
function hasCycle(size: number, adjacency: readonly boolean[]): boolean {
  const reachable: boolean[] = [...adjacency];
  for (let via = 0; via < size; via += 1) {
    for (let from = 0; from < size; from += 1) {
      for (let to = 0; to < size; to += 1) {
        if (reachable[from * size + via] && reachable[via * size + to])
          reachable[from * size + to] = true;
      }
    }
  }
  return Array.from(
    { length: size },
    (_, index) => reachable[index * size + index],
  ).some(Boolean);
}

function graph(
  size: number,
  kinds: readonly number[],
): {
  readonly schema: 'concept-graph-v1';
  readonly concepts: readonly {
    readonly id: string;
    readonly domains: readonly string[];
  }[];
  readonly edges: readonly unknown[];
} {
  const concepts = Array.from({ length: size }, (_, index) => ({
    id: `synthetic.concept_${index}`,
    domains: ['geometry_spatial', 'powers_roots'],
  }));
  const edges: unknown[] = [];
  for (let from = 0; from < size; from += 1) {
    for (let to = 0; to < size; to += 1) {
      const kind = kinds[from * size + to] ?? 0;
      const endpoints = {
        from: `synthetic.concept_${from}`,
        to: `synthetic.concept_${to}`,
      };
      if (kind === 1 || kind === 2)
        edges.push({
          ...endpoints,
          kind: 'prerequisite',
          requirement: kind === 1 ? 'necessary' : 'recommended',
          rationaleKey: 'synthetic.relation',
          diagnosticProbeId: 'synthetic.probe',
        });
      if (kind === 3) edges.push({ ...endpoints, kind: 'related' });
      if (kind === 4) edges.push({ ...endpoints, kind: 'representationOf' });
      if (kind === 5) edges.push({ ...endpoints, kind: 'inverseOf' });
    }
  }
  return { schema: 'concept-graph-v1', concepts, edges };
}

const arbitraryGraph = fc.integer({ min: 1, max: 6 }).chain((size) =>
  fc
    .array(fc.integer({ min: 0, max: 5 }), {
      minLength: size * size,
      maxLength: size * size,
    })
    .map((kinds) => ({ size, kinds })),
);

describe('concept graph independent cycle oracle', () => {
  it('exhaustively checks all 512 directed graphs on three nodes, including self edges', () => {
    for (let mask = 0; mask < 512; mask += 1) {
      const adjacency = Array.from(
        { length: 9 },
        (_, bit) => (mask & (1 << bit)) !== 0,
      );
      expect(
        conceptGraphFromDto(
          graph(
            3,
            adjacency.map((edge) => (edge ? 1 : 0)),
          ),
        ).ok,
      ).toBe(!hasCycle(3, adjacency));
    }
  });

  it('matches the independent necessary-edge oracle across mixed relation kinds', () => {
    fc.assert(
      fc.property(arbitraryGraph, ({ size, kinds }) => {
        expect(conceptGraphFromDto(graph(size, kinds)).ok).toBe(
          !hasCycle(
            size,
            kinds.map((kind) => kind === 1),
          ),
        );
      }),
      parameters,
    );
  });

  it('permits all cyclic non-gating relationships without duplicating concepts', () => {
    fc.assert(
      fc.property(arbitraryGraph, ({ size, kinds }) => {
        const nonGating = kinds.map((kind) => (kind === 1 ? 2 : kind));
        const parsed = conceptGraphFromDto(graph(size, nonGating));
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.value.concepts).toHaveLength(size);
        expect(
          new Set(parsed.value.concepts.map((concept) => concept.id)).size,
        ).toBe(size);
        expect(
          parsed.value.concepts.every(
            (concept) => concept.domains.length === 2,
          ),
        ).toBe(true);
      }),
      parameters,
    );
  });

  it('makes validation independent of concept and edge input order', () => {
    fc.assert(
      fc.property(arbitraryGraph, ({ size, kinds }) => {
        const fixture = graph(size, kinds);
        const parsed = conceptGraphFromDto(fixture);
        const reversed = conceptGraphFromDto({
          ...fixture,
          concepts: [...fixture.concepts].reverse(),
          edges: [...fixture.edges].reverse(),
        });
        expect(reversed.ok).toBe(parsed.ok);
        if (!reversed.ok || !parsed.ok) return;
        expect(reversed.value.concepts).toEqual(
          [...parsed.value.concepts].reverse(),
        );
      }),
      parameters,
    );
  });
});
