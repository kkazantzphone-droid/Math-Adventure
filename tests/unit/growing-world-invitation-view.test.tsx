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
import {
  GrowthJourney,
  GrowingWorldAdultExplanation,
} from '../../src/ui/synthetic-loop/GrowthJourney';

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

function render(current: SyntheticLoopRecord, open = true): string {
  return renderToStaticMarkup(
    <GrowthJourney
      record={current}
      preferences={current.preferences}
      open={open}
      disabled={false}
      onOpen={() => undefined}
      onChoose={() => undefined}
      familyLabel={(family) => family}
      onMode={() => undefined}
      onExplore={() => undefined}
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

describe('Discovery choices and adult explanations', () => {
  it.each(['el-GR', 'en-GB', 'de-DE'] as const)(
    'keeps both explicit play modes visible when discoveries are closed in %s',
    (locale) => {
      const current = record([]);
      const copy = getGrowingWorldCopy(locale);
      for (const mode of ['manual', 'synthetic-policy'] as const) {
        const html = render(
          {
            ...current,
            mode,
            preferences: { ...current.preferences, uiLocale: locale },
          },
          false,
        );
        expect(html).toContain(copy.modeChoice);
        expect(html).toContain(copy.guidedMode);
        expect(html).toContain(copy.manualMode);
        expect(html).toContain(copy.activityChoiceHint);
        expect(html).toMatch(
          new RegExp(
            `data-journey-mode="[^"]*" aria-pressed="${mode === 'synthetic-policy'}"`,
          ),
        );
        expect(html).toMatch(
          new RegExp(
            `data-journey-manual="[^"]*" aria-pressed="${mode === 'manual'}"`,
          ),
        );
        expect(html).not.toContain('data-discovery-family=');
        expect(html).not.toContain('data-adult-experience');
      }
    },
  );

  it('associates the suggested activity with its visible reason', () => {
    const html = render(record(['number.make-ten']), false);
    expect(html).toContain(getGrowingWorldCopy('en-GB').invitation);
    expect(html).toContain('id="growth-invitation-reason"');
    expect(html).toContain('aria-describedby="growth-invitation-reason"');
    expect(html).toContain('data-invitation-family="number.part-whole"');
  });

  it('offers available revisit and Explore actions at the finite chapter edge', () => {
    const html = render(record(CHAPTER_FAMILY_IDS), false);
    expect(html).toContain('data-chapter-edge');
    expect(html).toContain('data-chapter-revisit');
    expect(html).toContain('data-chapter-explore');
    expect(html).not.toContain('data-invitation-family=');
    expect(html).toContain('aria-controls="growth-discoveries"');
  });

  it.each(['el-GR', 'en-GB', 'de-DE'] as const)(
    'provides synthetic saving, evidence, Explore and content-limit explanations in %s',
    (locale) => {
      const copy = getGrowingWorldCopy(locale);
      const html = renderToStaticMarkup(
        <GrowingWorldAdultExplanation locale={locale} />,
      );
      expect(html).toContain(`lang="${locale}"`);
      expect(html).toContain(copy.adultHeading);
      expect(html).toContain(copy.adultSaving);
      expect(html).toContain(copy.adultEvidence);
      expect(html).toContain(copy.adultExploration);
      expect(html).toContain(copy.adultLimits);
      expect(html).not.toContain('data-child-answer');
    },
  );
});
