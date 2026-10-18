import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  deriveSyntheticLoop,
  enterGrowingWorld,
  initialSyntheticLoop,
  syntheticLoopCodec,
  SYNTHETIC_LOOP_CATALOG,
} from '../../src/application/synthetic-loop';
import type {
  LoopEvidenceEvent,
  SyntheticLoopRecord,
} from '../../src/application/synthetic-loop/types';
import {
  CHAPTER_FAMILY_IDS,
  CHAPTER_GENERATOR_IDS,
} from '../../src/domain/growing-world/content';
import type { ChapterFamilyId } from '../../src/domain/growing-world/content';
import { GROWING_JOURNEY_POLICY } from '../../src/domain/growing-world/journey';
import type { ChapterObservation } from '../../src/domain/growing-world/journey';
import { getGrowingWorldCopy } from '../../src/presentation/localisation/growing-world-copy';
import { GrowthJourney } from '../../src/ui/synthetic-loop/GrowthJourney';

function value<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string } },
): T {
  if (!result.ok)
    throw new Error(`Synthetic invitation view: ${result.error.code}`);
  return result.value;
}

const semanticCases: Readonly<Record<ChapterFamilyId, readonly string[]>> = {
  'number.make-ten': ['make-ten:6', 'make-ten:7', 'make-ten:8', 'make-ten:9'],
  'number.part-whole': [
    'missing-part:1:11',
    'missing-part:2:12',
    'missing-part:3:13',
    'missing-part:4:14',
  ],
  'groups.equal': [
    'equal-groups:2:2',
    'equal-groups:2:3',
    'equal-groups:2:4',
    'equal-groups:2:5',
  ],
  'groups.missing': [
    'missing-group:2:4',
    'missing-group:2:6',
    'missing-group:2:8',
    'missing-group:2:10',
  ],
  'measurement.array-area': [
    'array-area:2:2',
    'array-area:2:3',
    'array-area:2:4',
    'array-area:2:5',
  ],
  'powers.square-side': [
    'square-side:1',
    'square-side:4',
    'square-side:9',
    'square-side:16',
  ],
};

function chapterEvents(familyId: ChapterFamilyId): ChapterObservation[] {
  return semanticCases[familyId].map(
    (fingerprint, index): ChapterObservation => ({
      schema: 'growing-world-observation-v1',
      policyVersion: GROWING_JOURNEY_POLICY.version,
      id: `SYNTHETIC-invitation-${familyId}-${index}`,
      familyId,
      concept: `growth.${familyId}`,
      representation: `representation.growth.${familyId}.${index % 2 ? 'relational' : 'concrete'}`,
      fingerprint,
      generatorVersion:
        CHAPTER_GENERATOR_IDS[CHAPTER_FAMILY_IDS.indexOf(familyId)] ?? '',
      sessionOrdinal: index < 2 ? 1 : 2,
      correct: true,
      mathematicalHintTier: 0,
      meaningfulAttempts: 1,
      solutionExposed: false,
      accessible: true,
    }),
  );
}

function legacyBridge(): readonly LoopEvidenceEvent[] {
  const scope = SYNTHETIC_LOOP_CATALOG.scopes.find(
    (item) => item.conceptId === 'addition.part-whole',
  );
  if (!scope) throw new Error('Synthetic invitation bridge unavailable');
  return scope.cases.slice(0, 3).map((evidence, index): LoopEvidenceEvent => ({
    kind: 'observation',
    selectionSeed: '00000001000000020000000300000004',
    input: {
      synthetic: true,
      id: `SYNTHETIC-invitation-legacy-${index}`,
      concept: evidence.conceptId,
      representation: evidence.representationId,
      taskFingerprint: evidence.fingerprint,
      evidenceFingerprint: evidence.fingerprint,
      sessionOrdinal: 1,
      coarseDay: 100,
      clockCertain: false,
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
      policyVersion: 'phase3b-synthetic-policy-v1',
      generatorVersion: evidence.generatorVersion,
    },
  }));
}

/** Real validated records and real derivation; no mocked invitation selector. */
function record(
  ready: readonly ChapterFamilyId[],
  extra: readonly ChapterObservation[] = [],
): SyntheticLoopRecord {
  const initial = initialSyntheticLoop('SYNTHETIC-PLAYER-1');
  const events = legacyBridge();
  const chapter = [...ready.flatMap(chapterEvents), ...extra].sort(
    (left, right) => left.sessionOrdinal - right.sessionOrdinal,
  );
  return value(
    syntheticLoopCodec.decode({
      ...enterGrowingWorld(initial),
      mode: 'synthetic-policy',
      selectedFamily: 'number.make-ten',
      sessionOrdinal: 3,
      events,
      derived: value(deriveSyntheticLoop(initial.profileId, events)).derived,
      chapterEvents: chapter,
      completedCount: events.length + chapter.length,
      taskOrdinal: events.length + chapter.length,
      preferences: {
        uiLocale: 'en-GB',
        instructionLocale: 'en-GB',
        numberSpeechLocale: 'en-GB',
      },
    }),
  );
}

function render(current: SyntheticLoopRecord): string {
  return renderToStaticMarkup(
    <GrowthJourney
      record={current}
      preferences={current.preferences}
      open
      disabled={false}
      onOpen={() => undefined}
      onChoose={() => undefined}
      familyLabel={(family) => family}
      onMode={() => undefined}
    />,
  );
}

describe('Independent candidate review — visible invitation progression', () => {
  it('moves beyond a ready make-ten target even with the historical addition bridge', () => {
    const html = render(record(['number.make-ten']));
    expect(html).toContain('data-invitation-family="number.part-whole"');
    expect(html).toContain('data-invitation-reason="connectedReadiness"');
    expect(html).not.toContain('data-invitation-family="number.make-ten"');
  });

  it('moves beyond ready missing parts toward equal groups', () => {
    const html = render(record(['number.make-ten', 'number.part-whole']));
    expect(html).toContain('data-invitation-family="groups.equal"');
    expect(html).not.toContain('data-invitation-family="number.make-ten"');
    expect(html).not.toContain('data-invitation-family="number.part-whole"');
  });

  it('shows the finite edge with every free choice and no fabricated growth invitation', () => {
    const html = render(record(CHAPTER_FAMILY_IDS));
    expect(html).toContain('data-chapter-edge');
    expect(html).toContain(getGrowingWorldCopy('en-GB').chapterEnd);
    expect(html).not.toContain('data-invitation-family=');
    expect(html.match(/data-discovery-family=/g)).toHaveLength(14);
    for (const family of CHAPTER_FAMILY_IDS)
      expect(html).toContain(`data-discovery-family="${family}"`);
  });

  it('keeps a current support invitation ahead of a connected growth suggestion', () => {
    const support = chapterEvents('groups.equal')
      .slice(0, 2)
      .map((event) => ({
        ...event,
        sessionOrdinal: 3,
        correct: false,
      }));
    const html = render(record(['number.make-ten'], support));
    expect(html).toContain('data-invitation-family="groups.equal"');
    expect(html).toContain('data-invitation-reason="support"');
    expect(html).not.toContain('data-invitation-family="number.part-whole"');
  });
});
