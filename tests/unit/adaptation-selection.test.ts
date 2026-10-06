import { describe, expect, it } from 'vitest';
import { createPhase2EvidenceCatalog } from '../../src/domain/adaptation/catalog';
import type { SyntheticEvidenceCatalog } from '../../src/domain/adaptation/catalog';
import {
  ADAPTATION_POLICY,
  SYNTHETIC_ENGINE_LIMITS,
} from '../../src/domain/adaptation/policy';
import {
  emptySelectionMemory,
  recommendSynthetic,
  recordSyntheticScoredTask,
} from '../../src/domain/adaptation/selection';
import type {
  RecommendationReason,
  SelectionCandidate,
  SelectionInput,
  SelectionMemory,
} from '../../src/domain/adaptation/selection';
import {
  applySyntheticObservation,
  checkpointSyntheticSession,
  confirmSyntheticReadiness,
  emptySyntheticSnapshot,
  getConceptState,
} from '../../src/domain/adaptation/state';
import type {
  SyntheticObservationInput,
  SyntheticSnapshot,
} from '../../src/domain/adaptation/types';

const checkedCatalog = createPhase2EvidenceCatalog([
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
if (!checkedCatalog.ok)
  throw new Error('Invalid independent selector fixture catalog');
const evidenceCatalog: SyntheticEvidenceCatalog = checkedCatalog.value;
const ids = evidenceCatalog.scopes.map((scope) => scope.conceptId);
const candidates: readonly SelectionCandidate[] = ids.map((concept) => ({
  concept,
  prerequisiteReady: true,
  generationAvailable: true,
}));
const firstId = ids[0];
const secondId = ids[1];
const thirdId = ids[2];
if (firstId === undefined || secondId === undefined || thirdId === undefined)
  throw new Error('Three independent concept scopes required');
const first = firstId;
const second = secondId;
const third = thirdId;
// s1 is zero, so the first xoshiro128** output is exactly zero. Every initial
// canonical tie chooses its first member; no production random helper is used.
const zeroDrawSeed = '00000001000000000000000000000000';
const otherSeed = '0123456789abcdeffedcba9876543210';

type ScenarioClass = 'new' | 'developing' | 'support' | 'review' | 'familiar';
const classes: readonly ScenarioClass[] = [
  'new',
  'developing',
  'support',
  'review',
  'familiar',
];

function scenario(statuses: readonly ScenarioClass[]): SyntheticSnapshot {
  let snapshot = emptySyntheticSnapshot();
  for (let index = 0; index < 10; index += 1) {
    for (
      let conceptIndex = 0;
      conceptIndex < statuses.length;
      conceptIndex += 1
    ) {
      const status = statuses[conceptIndex];
      const scope = evidenceCatalog.scopes[conceptIndex];
      if (!scope || status === undefined)
        throw new Error('Invalid scenario index');
      const count =
        status === 'new'
          ? 0
          : status === 'familiar'
            ? 10
            : status === 'review'
              ? 1
              : 5;
      if (index >= count) continue;
      // The length scope has eight cases: the last two are legitimate delayed
      // retrievals in a second explicit session at day two.
      const evidence = scope.cases[index % scope.cases.length];
      if (!evidence) throw new Error('Missing fixture evidence');
      const event: SyntheticObservationInput = {
        synthetic: true,
        id: `SYNTHETIC-selection-${conceptIndex}-${index}`,
        concept: scope.conceptId,
        representation: evidence.representationId,
        taskFingerprint: evidence.fingerprint,
        evidenceFingerprint: evidence.fingerprint,
        sessionOrdinal: index < 3 ? 1 : 2,
        coarseDay: index < 8 ? 0 : 2,
        clockCertain: true,
        mathematicalHintTier: 0,
        solutionExposed: false,
        meaningfulAttempts: 1,
        mode: 'practice',
        completion: 'completed',
        accessible: true,
        correct: status !== 'support',
        accessibilitySupports: [],
        variationCase: true,
        revisit: false,
        policyVersion: ADAPTATION_POLICY.version,
        generatorVersion: scope.generatorVersion,
      };
      const applied = applySyntheticObservation(
        snapshot,
        event,
        evidenceCatalog,
      );
      if (!applied.ok) throw new Error(applied.error.code);
      snapshot = applied.snapshot;
      if (status === 'review')
        snapshot = confirmSyntheticReadiness(
          snapshot,
          scope.conceptId,
          event.id,
        );
    }
  }
  return checkpointSyntheticSession(snapshot);
}

function input(
  snapshot = emptySyntheticSnapshot(),
  overrides: Partial<SelectionInput> = {},
): SelectionInput {
  return {
    snapshot,
    evidenceCatalog,
    catalog: candidates,
    intent: { kind: 'automatic' },
    policyVersion: ADAPTATION_POLICY.version,
    coarseDay: 2,
    clockCertain: true,
    sessionOrdinal: 3,
    seed: zeroDrawSeed,
    memory: emptySelectionMemory(snapshot),
    ...overrides,
  };
}

function expectedReason(
  status: ScenarioClass,
  memory: SelectionMemory,
): RecommendationReason {
  if (status === 'support' && !memory.supportOffered) return 'needsSupport';
  if (status === 'review' && !memory.reviewOffered) return 'reviewDue';
  if (status === 'developing') return 'developingContinuation';
  if (status === 'new') return 'newReadyConcept';
  return status === 'familiar' ? 'familiarPractice' : 'insufficientEvidence';
}

// Independent ordering oracle: compare pairs of (last offer, class priority).
// This neither calls the selector nor derives expectations from engine state.
const reasonOrder: readonly RecommendationReason[] = [
  'needsSupport',
  'reviewDue',
  'developingContinuation',
  'newReadyConcept',
  'familiarPractice',
  'insufficientEvidence',
];
function oracleCandidates(
  statuses: readonly ScenarioClass[],
  memory: SelectionMemory,
): readonly string[] {
  const scored = ids.map((id, index) => ({
    id,
    age: memory.lastOffered[id] ?? 0,
    priority: reasonOrder.indexOf(
      expectedReason(statuses[index] ?? 'new', memory),
    ),
  }));
  return scored
    .filter(
      (row) =>
        !scored.some(
          (other) =>
            other.age < row.age ||
            (other.age === row.age && other.priority < row.priority),
        ),
    )
    .map((row) => row.id);
}

describe('independent synthetic recommendation proof', () => {
  it('rotates canonical equal candidates deterministically and does not mutate its inputs', () => {
    const snapshot = emptySyntheticSnapshot();
    let memory = emptySelectionMemory(snapshot);
    const trace: string[] = [];
    for (let index = 0; index < 9; index += 1) {
      const before = JSON.stringify(memory);
      const request = input(snapshot, { memory });
      const result = recommendSynthetic(request);
      const reversed = recommendSynthetic({
        ...request,
        catalog: [...candidates].reverse(),
      });
      expect(result).toEqual(reversed);
      expect(result).toEqual(recommendSynthetic(request));
      expect(result.reasonCode).toBe('newReadyConcept');
      expect(result.concept).not.toBeNull();
      expect(JSON.stringify(memory)).toBe(before);
      trace.push(result.concept ?? 'missing');
      memory = result.memory;
    }
    expect(trace).toEqual([
      first,
      second,
      third,
      first,
      second,
      third,
      first,
      second,
      third,
    ]);
    expect(Object.keys(memory.lastOffered).sort()).toEqual([...ids].sort());
    expect(memory.nextOfferOrdinal).toBe(10);
    expect(snapshot).toEqual(emptySyntheticSnapshot());
  });

  it('offers the lower-priority ready concept within three offers even across one-offer sessions', () => {
    const snapshot = scenario(['developing', 'developing', 'new']);
    let memory = emptySelectionMemory(snapshot);
    const trace: string[] = [];
    for (let index = 0; index < 12; index += 1) {
      const result = recommendSynthetic(
        input(snapshot, { memory, sessionOrdinal: index + 3 }),
      );
      trace.push(result.concept ?? 'missing');
      memory = result.memory;
    }
    expect(trace.slice(0, 3)).toEqual([first, second, third]);
    for (let start = 0; start <= trace.length - ids.length; start += 1)
      expect(new Set(trace.slice(start, start + ids.length))).toEqual(
        new Set(ids),
      );
    expect(memory.lastOffered[third]).toBe(12);
  });

  it('exhausts all 125 priority assignments and seven age orders against a separate ordering oracle', () => {
    const rankOrders = [
      [0, 0, 0],
      [1, 2, 3],
      [1, 3, 2],
      [2, 1, 3],
      [2, 3, 1],
      [3, 1, 2],
      [3, 2, 1],
    ] as const;
    let traces = 0;
    for (const a of classes)
      for (const b of classes)
        for (const c of classes) {
          const statuses = [a, b, c] as const;
          const snapshot = scenario(statuses);
          for (const ranks of rankOrders)
            for (const seed of [zeroDrawSeed, otherSeed]) {
              let memory: SelectionMemory = {
                ...emptySelectionMemory(snapshot),
                sessionOrdinal: 3,
                nextOfferOrdinal: 4,
                lastOffered: Object.fromEntries(
                  ids.map((id, index) => {
                    const rank = ranks[index];
                    if (rank === undefined)
                      throw new Error('Missing independent rank');
                    return [id, rank];
                  }),
                ),
              };
              const offered: string[] = [];
              for (let offer = 0; offer < ids.length; offer += 1) {
                const allowed = oracleCandidates(statuses, memory);
                const result = recommendSynthetic(
                  input(snapshot, { memory, seed }),
                );
                expect(allowed).toContain(result.concept);
                const conceptIndex = ids.indexOf(result.concept ?? 'missing');
                expect(result.reasonCode).toBe(
                  expectedReason(statuses[conceptIndex] ?? 'new', memory),
                );
                offered.push(result.concept ?? 'missing');
                memory = result.memory;
              }
              expect(new Set(offered)).toEqual(new Set(ids));
              traces += 1;
            }
        }
    expect(traces).toBe(1750);
  }, 30_000);

  it('caps support and due-review priorities globally, with explicit requested-help override', () => {
    for (const status of ['support', 'review'] as const) {
      const snapshot = scenario([status, status, status]);
      let memory = emptySelectionMemory(snapshot);
      const reasons: RecommendationReason[] = [];
      for (let index = 0; index < 9; index += 1) {
        const result = recommendSynthetic(input(snapshot, { memory }));
        reasons.push(result.reasonCode);
        expect(result.revisit).toBe(result.reasonCode === 'reviewDue');
        memory = result.memory;
      }
      expect(
        reasons.filter(
          (reason) =>
            reason === (status === 'support' ? 'needsSupport' : 'reviewDue'),
        ),
      ).toHaveLength(1);
      if (status === 'support') {
        const requested = recommendSynthetic(
          input(snapshot, {
            memory,
            intent: { kind: 'requestedHelp', concept: first },
          }),
        );
        expect(requested.reasonCode).toBe('needsSupport');
        expect(requested.concept).toBe(first);
      }
      const nextSession = recommendSynthetic(
        input(snapshot, { memory, sessionOrdinal: 4 }),
      );
      expect(nextSession.reasonCode).toBe(
        status === 'support' ? 'needsSupport' : 'reviewDue',
      );
      expect(nextSession.memory.nextOfferOrdinal).toBe(11);
    }
  });

  it('yields after three scored completions, preserves the cap across sessions, and offers a menu when alone', () => {
    const snapshot = emptySyntheticSnapshot();
    const once = recordSyntheticScoredTask(
      emptySelectionMemory(snapshot),
      first,
    );
    const twice = recordSyntheticScoredTask(once, first);
    const three = recordSyntheticScoredTask(twice, first);
    expect(once.consecutiveScored).toBe(1);
    expect(twice.consecutiveScored).toBe(2);
    expect(three.consecutiveScored).toBe(3);
    expect(recordSyntheticScoredTask(three, first).consecutiveScored).toBe(3);
    expect(recommendSynthetic(input(snapshot, { memory: twice })).concept).toBe(
      first,
    );
    const alternative = recommendSynthetic(
      input(snapshot, { memory: three, sessionOrdinal: 9 }),
    );
    expect(alternative.concept).toBe(second);
    expect(alternative.memory.consecutiveScored).toBe(3);
    const only = candidates.filter((candidate) => candidate.concept === first);
    const menu = recommendSynthetic(
      input(snapshot, { memory: three, catalog: only }),
    );
    expect(menu.concept).toBeNull();
    expect(menu.reasonCode).toBe('yieldAfterThree');
    expect(menu.memory.consecutiveScored).toBe(0);
    expect(menu.memory.lastScoredConcept).toBeNull();
    expect(menu.memory.nextOfferOrdinal).toBe(three.nextOfferOrdinal);
    expect(recordSyntheticScoredTask(three, second).consecutiveScored).toBe(1);
  });

  it('honors child and parent intent without bypassing unavailable generation', () => {
    const snapshot = emptySyntheticSnapshot();
    let memory = emptySelectionMemory(snapshot);
    for (let index = 0; index < 3; index += 1)
      memory = recordSyntheticScoredTask(memory, first);
    const notReady = candidates.map((candidate) => ({
      ...candidate,
      prerequisiteReady: false,
    }));
    expect(
      recommendSynthetic(input(snapshot, { catalog: notReady })).reasonCode,
    ).toBe('insufficientEvidence');
    for (const kind of ['childChoice', 'parentChoice'] as const) {
      const result = recommendSynthetic(
        input(snapshot, {
          memory,
          catalog: notReady,
          intent: { kind, concept: first },
        }),
      );
      expect(result.concept).toBe(first);
      expect(result.reasonCode).toBe(
        kind === 'childChoice' ? 'requestedByChild' : 'requestedByParent',
      );
      const unavailable = recommendSynthetic(
        input(snapshot, {
          memory,
          catalog: notReady.map((candidate) => ({
            ...candidate,
            generationAvailable: false,
          })),
          intent: { kind, concept: first },
        }),
      );
      expect(unavailable.concept).toBeNull();
      expect(unavailable.reasonCode).toBe('unavailableGeneration');
      expect(unavailable.memory.nextOfferOrdinal).toBe(memory.nextOfferOrdinal);
    }
  });

  it('exhausts availability and prerequisite masks without offering an unavailable or unready unseen concept', () => {
    const snapshot = emptySyntheticSnapshot();
    for (let available = 0; available < 8; available += 1)
      for (let ready = 0; ready < 8; ready += 1) {
        const catalog = candidates.map((candidate, index) => ({
          ...candidate,
          generationAvailable: Boolean(available & (1 << index)),
          prerequisiteReady: Boolean(ready & (1 << index)),
        }));
        const eligible = catalog.filter(
          (candidate) =>
            candidate.generationAvailable && candidate.prerequisiteReady,
        );
        const result = recommendSynthetic(input(snapshot, { catalog }));
        expect(result.concept).toBe(eligible[0]?.concept ?? null);
        expect(result.reasonCode).toBe(
          eligible.length > 0
            ? 'newReadyConcept'
            : available === 0
              ? 'unavailableGeneration'
              : 'insufficientEvidence',
        );
      }
  });

  it('reports counts after coarse-day expiry and preserves previously attained accomplishment', () => {
    const snapshot = scenario(['familiar', 'new', 'new']);
    const result = recommendSynthetic(
      input(snapshot, {
        catalog: candidates.slice(0, 1),
        coarseDay: 63,
      }),
    );
    expect(result.concept).toBe(first);
    expect(result.reasonCode).toBe('insufficientEvidence');
    expect(result.retainedCount).toBe(0);
    expect(result.independentCount).toBe(0);
    expect(result.evidenceReasons).toContain('insufficientEvidence');
    expect(getConceptState(result.snapshot, first).attained).toBe('Secure');
  });

  it('suspends overdue retrieval after rollback and retains suspension until explicit resolution', () => {
    const snapshot = {
      ...scenario(['review', 'new', 'new']),
      lastTrustedDay: 4,
    };
    for (const kind of ['automatic', 'menu', 'exploration'] as const) {
      const rolledBack = recommendSynthetic(
        input(snapshot, {
          catalog: candidates.slice(0, 1),
          coarseDay: 3,
          intent: { kind },
        }),
      );
      expect(rolledBack.reasonCode).not.toBe('reviewDue');
      expect(rolledBack.revisit).toBe(false);
      expect(rolledBack.evidenceReasons).toContain('clockUncertain');
      expect(rolledBack.snapshot.clockCertain).toBe(false);
      const future = recommendSynthetic(
        input(rolledBack.snapshot, {
          memory: rolledBack.memory,
          catalog: candidates.slice(0, 1),
          coarseDay: 100,
        }),
      );
      expect(future.reasonCode).not.toBe('reviewDue');
      expect(future.retainedCount).toBe(1);
      expect(future.snapshot.clockCertain).toBe(false);
    }
  });

  it('returns neutral menu/exploration offers without resetting fairness summaries', () => {
    const snapshot = emptySyntheticSnapshot();
    const firstOffer = recommendSynthetic(input(snapshot));
    for (const kind of ['menu', 'exploration'] as const) {
      const result = recommendSynthetic(
        input(snapshot, { memory: firstOffer.memory, intent: { kind } }),
      );
      expect(result.concept).toBeNull();
      expect(result.reasonCode).toBe(
        kind === 'menu' ? 'menu' : 'explorationOffer',
      );
      expect(result.memory.lastOffered).toEqual(firstOffer.memory.lastOffered);
      expect(result.memory.nextOfferOrdinal).toBe(
        firstOffer.memory.nextOfferOrdinal,
      );
      expect(result.retainedCount).toBe(0);
      expect(result.independentCount).toBe(0);
    }
  });

  it('rejects unsupported policies and malformed bounded selection metadata with stable codes', () => {
    const snapshot = emptySyntheticSnapshot();
    const base = input(snapshot);
    for (const changes of [
      { policyVersion: 'unaccepted-policy' },
      { memory: { ...base.memory, policyVersion: 'unaccepted-policy' } },
      { snapshot: { ...snapshot, policyVersion: 'unaccepted-policy' } },
    ])
      expect(recommendSynthetic({ ...base, ...changes }).reasonCode).toBe(
        'unsupportedPolicy',
      );
    const invalidMemories: readonly Partial<SelectionMemory>[] = [
      { profileId: 'SYNTHETIC-PLAYER-2' },
      { sessionOrdinal: -1 },
      { sessionOrdinal: SYNTHETIC_ENGINE_LIMITS.sessionOrdinal + 1 },
      { nextOfferOrdinal: 0 },
      { nextOfferOrdinal: Number.MAX_SAFE_INTEGER },
      { consecutiveScored: 4 },
      { consecutiveScored: -1 },
      { lastScoredConcept: 'raw prose is disallowed' },
      { lastOffered: { [first]: 1 } },
      { lastOffered: { [first]: -1 } },
    ];
    for (const memory of invalidMemories)
      expect(
        recommendSynthetic({ ...base, memory: { ...base.memory, ...memory } })
          .reasonCode,
      ).toBe('invalidSelectionInput');
    for (const changes of [
      { coarseDay: -1 },
      { coarseDay: SYNTHETIC_ENGINE_LIMITS.coarseDay + 1 },
      { sessionOrdinal: -1 },
      { sessionOrdinal: SYNTHETIC_ENGINE_LIMITS.sessionOrdinal + 1 },
      { seed: 'bad-seed' },
      {
        catalog: [
          candidates[0],
          candidates[0],
        ] as readonly SelectionCandidate[],
      },
      {
        catalog: [
          {
            concept: 'unknown.concept',
            prerequisiteReady: true,
            generationAvailable: true,
          },
        ],
      },
      { evidenceCatalog: { ...evidenceCatalog, scopes: [] } },
      { snapshot: { ...snapshot, catalogSignature: 'mismatched-catalog' } },
      { snapshot: { ...snapshot, synthetic: false as unknown as true } },
      {
        snapshot: {
          ...snapshot,
          profileId: 'SYNTHETIC-arbitrary' as 'SYNTHETIC-PLAYER-1',
        },
        memory: { ...base.memory, profileId: 'SYNTHETIC-arbitrary' },
      },
      { snapshot: { ...snapshot, lastSessionOrdinal: 4 }, sessionOrdinal: 3 },
    ])
      expect(
        recommendSynthetic({ ...base, ...changes }).reasonCode,
        JSON.stringify(changes),
      ).toBe('invalidSelectionInput');
  });
});
