import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createFamilyProof } from '../../src/application/family-proof';
import { createSliceFamily } from '../../src/application/slice-family';
import type { LoopFamilyId } from '../../src/application/synthetic-loop';
import {
  CHILD_HELP_IDS,
  CHILD_TEXT_IDS,
  childCopy,
  childPackManifests,
} from '../../src/presentation/localisation/child-copy';
import type { ChildHelpId } from '../../src/presentation/localisation/child-copy';
import {
  PROTOTYPE_LOCALES,
  SUPPORTED_LOCALES,
  resolvePrototypeLocale,
} from '../../src/presentation/localisation/locales';
import type { Locale } from '../../src/presentation/localisation/locales';
import { ChildTaskView } from '../../src/ui/synthetic-loop/ChildTaskView';
import type { ChildTaskViewProps } from '../../src/ui/synthetic-loop/ChildTaskView';
import type { LoopPresentation } from '../../src/ui/synthetic-loop/TaskView';

const seed = '0123456789abcdefdeadbeeffedcba98';
const families = [
  [
    'number.addition',
    'additionHelp',
    'Πόσα είναι όλα μαζί;',
    'How many altogether?',
    'Wie viele sind es zusammen?',
  ],
  [
    'geometry.quadrilateral',
    'shapeHelp',
    'Ποιο σχήμα ταιριάζει;',
    'Which shape matches?',
    'Welche Form passt?',
  ],
  [
    'measurement.unit-length',
    'lengthHelp',
    'Πόσα βήματα έχει η γραμμή;',
    'How many steps along the line?',
    'Wie viele Schritte hat die Linie?',
  ],
  [
    'number.numeral',
    'numeralHelp',
    'Ποια ομάδα ταιριάζει;',
    'Which group matches?',
    'Welche Gruppe passt?',
  ],
  [
    'number.counting',
    'countingHelp',
    'Πόσες κουκκίδες βλέπεις;',
    'How many dots?',
    'Wie viele Punkte?',
  ],
  [
    'number.comparison',
    'comparisonHelp',
    'Πού έχει πιο πολλά;',
    'Where are there more dots?',
    'Wo sind mehr Punkte?',
  ],
  [
    'number.subtraction',
    'subtractionHelp',
    'Πόσες μένουν;',
    'How many are left?',
    'Wie viele bleiben übrig?',
  ],
  [
    'number.missing',
    'missingHelp',
    'Τι μπαίνει στο κενό;',
    'What goes in the gap?',
    'Was kommt in die Lücke?',
  ],
] as const satisfies readonly (readonly [
  LoopFamilyId,
  ChildHelpId,
  string,
  string,
  string,
])[];

function presentation(family: LoopFamilyId, taskSeed = seed): LoopPresentation {
  const result =
    family === 'number.addition' ||
    family === 'geometry.quadrilateral' ||
    family === 'measurement.unit-length'
      ? createFamilyProof(family, taskSeed)
      : createSliceFamily(family, taskSeed);
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

function render(
  task: LoopPresentation | null,
  locale: Locale,
  override: Partial<ChildTaskViewProps> = {},
) {
  return renderToStaticMarkup(
    <ChildTaskView
      task={task}
      preferences={{
        uiLocale: locale,
        instructionLocale: locale,
        numberSpeechLocale: locale,
      }}
      feedback="none"
      hintTier={0}
      onAnswer={() => undefined}
      onHint={() => undefined}
      onRetry={() => undefined}
      {...override}
    />,
  );
}

function answerValues(html: string): readonly string[] {
  return [...html.matchAll(/data-child-answer="([^"]+)"/gu)].map(
    (match) => match[1] ?? '',
  );
}

describe('complete draft child activity wording — authored seam, no native/AT certification', () => {
  it.each(PROTOTYPE_LOCALES)(
    'has all required concise child messages and exactly three progressive stages in %s',
    (locale) => {
      const copy = childCopy(locale);
      expect(Object.keys(copy).sort()).toEqual(
        [...CHILD_TEXT_IDS, ...CHILD_HELP_IDS].sort(),
      );
      for (const id of CHILD_TEXT_IDS) {
        expect(copy[id].trim()).not.toBe('');
        expect(copy[id]).not.toMatch(/<[^>]+>|SYNTHETIC|el-GR|en-GB|de-DE/u);
      }
      for (const id of CHILD_HELP_IDS) {
        expect(copy[id]).toHaveLength(3);
        expect(new Set(copy[id]).size).toBe(3);
        for (const stage of copy[id]) expect(stage.trim()).not.toBe('');
      }
      if (locale !== 'el-GR')
        expect(JSON.stringify(copy)).not.toMatch(
          /[\u0370-\u03ff\u1f00-\u1fff]/u,
        );
    },
  );

  it.each(PROTOTYPE_LOCALES)(
    'renders all eight prompts, choices and progressive hints coherently in %s without changing task/replay bytes',
    (locale) => {
      const promptIndex = locale === 'el-GR' ? 2 : locale === 'en-GB' ? 3 : 4;
      for (const row of families) {
        const task = presentation(row[0]);
        const before = JSON.stringify(task);
        const originalChoices = answerValues(render(task, 'el-GR'));
        for (const tier of [0, 1, 2, 3] as const) {
          const html = render(task, locale, { hintTier: tier });
          expect(html).toContain(`lang="${locale}"`);
          expect(html).toContain(`${row[promptIndex]}</h2>`);
          expect(answerValues(html)).toEqual(originalChoices);
          expect(html).toContain(`aria-label="${childCopy(locale).answers}"`);
          if (tier > 0)
            expect(html).toContain(
              `<p>${childCopy(locale)[row[1]][tier - 1]}</p>`,
            );
          else
            expect(html).toMatch(
              /<div id="slice-hint"[^>]*hidden=""[^>]*data-hint-tier="0"/u,
            );
          expect(html).not.toMatch(
            /aria-pressed="true"|data-(?:expected|correct)=|expectedClassIds|answerContract/u,
          );
          if (locale !== 'el-GR')
            expect(html).not.toMatch(/[\u0370-\u03ff\u1f00-\u1fff]/u);
          expect(JSON.stringify(task)).toBe(before);
        }
      }
    },
  );

  it.each(PROTOTYPE_LOCALES)(
    'keeps comparison choices tied to left/right meaning and geometry target unnamed in %s',
    (locale) => {
      const copy = childCopy(locale);
      const compare = render(presentation('number.comparison'), locale, {
        hintTier: 3,
      });
      for (const [relation, text] of [
        ['less', copy.fewer],
        ['equal', copy.same],
        ['greater', copy.more],
      ]) {
        const card = new RegExp(
          `<button[^>]*data-child-answer="comparison\\.${relation}"[^>]*>(.*?)</button>`,
          'su',
        ).exec(compare)?.[1];
        expect(card).toContain(`<span>${text}</span>`);
      }
      const geometry = render(presentation('geometry.quadrilateral'), locale, {
        hintTier: 3,
      });
      expect(geometry).toContain(`aria-label="${copy.outline}"`);
      expect(geometry).toContain(`<span>${copy.square}</span>`);
      expect(geometry).toContain(`<span>${copy.rectangle}</span>`);
      expect(geometry).toContain(`<span>${copy.parallelogram}</span>`);
      expect(geometry).not.toMatch(
        /<svg[^>]*aria-label="[^"]*(?:Square|Rectangle|Quadrat|Rechteck|Τετράγωνο|Ορθογώνιο)/u,
      );
    },
  );

  it.each(PROTOTYPE_LOCALES)(
    'describes empty groups, individual dots and removed dots in %s without preannouncing the answer',
    (locale) => {
      const copy = childCopy(locale);
      const empty = presentation(
        'number.counting',
        '00000001000000020000000300000004',
      );
      expect(render(empty, locale)).toContain(copy.empty);
      const count = render(presentation('number.counting'), locale, {
        hintTier: 3,
      });
      expect(count).toContain(`aria-label="${copy.dot}"`);
      expect(count).not.toMatch(/aria-label="\d+ (?:dots|Punkte|κουκκίδες)"/u);
      const subtract = render(presentation('number.subtraction'), locale, {
        hintTier: 2,
      });
      expect(subtract).toContain(`aria-label="${copy.removed}"`);
      const numeral = render(presentation('number.numeral'), locale);
      expect(numeral).toContain(`aria-label="${copy.group} 1"`);
      expect(numeral).not.toMatch(
        /aria-label="\d+ (?:dots|Punkte|κουκκίδες)"/u,
      );
    },
  );

  it.each(PROTOTYPE_LOCALES)(
    'renders help/retry/success/selection/unavailable in the UI language %s independently of instructions and speech',
    (uiLocale) => {
      const instructionLocale = uiLocale === 'de-DE' ? 'en-GB' : 'de-DE';
      const task = presentation('number.counting');
      const ui = childCopy(uiLocale);
      for (const [feedback, expected] of [
        ['correct', ui.success],
        ['incorrect', ui.retry],
        ['retry', ui.retry],
        ['selection', ui.answers],
        ['unavailable', ui.unavailable],
      ] as const) {
        const html = render(task, uiLocale, {
          preferences: {
            uiLocale,
            instructionLocale,
            numberSpeechLocale: 'el-GR',
          },
          feedback,
          hintTier: 2,
        });
        expect(html).toContain(
          `class="child-task slice-task" lang="${instructionLocale}"`,
        );
        expect(html).toContain(childCopy(instructionLocale).counting);
        expect(html).toContain(childCopy(instructionLocale).countingHelp[1]);
        expect(html).toContain(ui.help);
        const status = /<div class="child-feedback"[^>]*>(.*?)<\/div>/su.exec(
          html,
        )?.[1];
        expect(status).toContain(expected);
        expect(html).toContain(
          `id="slice-feedback" tabindex="-1" lang="${uiLocale}"`,
        );
        if (uiLocale !== 'el-GR')
          expect(html).not.toMatch(/[\u0370-\u03ff\u1f00-\u1fff]/u);
      }
    },
  );

  it('marks the three eight-family packs as drafts and planned locales as explicit fallback requests', () => {
    expect(childPackManifests.map((manifest) => manifest.locale)).toEqual([
      ...PROTOTYPE_LOCALES,
    ]);
    for (const manifest of childPackManifests) {
      expect(manifest.status).toBe('draft');
      expect(manifest.official).toBe(false);
      expect(manifest.reviewStatus).toBe('native-review-pending');
      expect(manifest.reviewers).toEqual([]);
      expect(manifest.completeness).toBe('complete-eight-family-child-content');
    }
    for (const locale of SUPPORTED_LOCALES.slice(3)) {
      expect(resolvePrototypeLocale(locale)).toEqual({
        requestedLocale: locale,
        effectiveLocale: 'el-GR',
        reason: 'planned-pack',
      });
      expect(
        childPackManifests.some(
          (manifest) => (manifest.locale as Locale) === locale,
        ),
      ).toBe(false);
    }
  });
});
