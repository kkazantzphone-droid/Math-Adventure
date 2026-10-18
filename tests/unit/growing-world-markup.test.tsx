import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CHAPTER_FAMILY_IDS,
  createChapterTask,
} from '../../src/application/growing-world';
import { getGrowingWorldCopy } from '../../src/presentation/localisation/growing-world-copy';
import { ChapterTaskView } from '../../src/ui/synthetic-loop/ChapterTaskView';
import { ExploreWorld } from '../../src/ui/synthetic-loop/ExploreWorld';

const locales = ['el-GR', 'en-GB', 'de-DE'] as const;
const seed = '0123456789abcdeffedcba9876543210';
const noop = () => undefined;

describe('growing world authored markup, with browser behavior verified separately', () => {
  it('conserves the tiles when help moves some into a ten', () => {
    const created = createChapterTask('number.make-ten', seed);
    if (!created.ok || created.value.task.kind !== 'makeTen')
      throw new Error('Unable to make ten task');
    const total = created.value.task.first + created.value.task.second;
    for (const hintTier of [0, 1, 2, 3] as const) {
      const html = renderToStaticMarkup(
        <ChapterTaskView
          presentation={created.value}
          preferences={{
            uiLocale: 'en-GB',
            instructionLocale: 'en-GB',
            numberSpeechLocale: 'en-GB',
          }}
          feedback="none"
          hintTier={hintTier}
          onAnswer={noop}
          onHint={noop}
          onRetry={noop}
        />,
      );
      expect(html.match(/data-world-tile="filled"/g)).toHaveLength(total);
    }
  });

  it('presents a square area without giving its side or duplicating a tile-count representation', () => {
    let found = false;
    for (let word = 1; word <= 32; word += 1) {
      const created = createChapterTask(
        'powers.square-side',
        [word, word + 17, word + 101, word + 1009]
          .map((value) =>
            (Math.imul(value, 2654435761) >>> 0).toString(16).padStart(8, '0'),
          )
          .join(''),
      );
      if (!created.ok || created.value.task.representation !== 'relational')
        continue;
      const html = renderToStaticMarkup(
        <ChapterTaskView
          presentation={created.value}
          preferences={{
            uiLocale: 'en-GB',
            instructionLocale: 'en-GB',
            numberSpeechLocale: 'en-GB',
          }}
          feedback="none"
          hintTier={0}
          onAnswer={noop}
          onHint={noop}
          onRetry={noop}
        />,
      );
      expect(html).toContain('class="world-square-area"');
      expect(html).not.toContain('data-world-tile=');
      expect(html).not.toContain('data-world-worked');
      found = true;
      break;
    }
    expect(found).toBe(true);
  });

  it.each(locales)(
    'has a real workshop and no assessment controls in %s',
    (locale) => {
      const copy = getGrowingWorldCopy(locale);
      const html = renderToStaticMarkup(
        <ExploreWorld
          preferences={{
            uiLocale: locale,
            instructionLocale: locale,
            numberSpeechLocale: locale,
          }}
          contextKey="synthetic-star"
          onPractice={noop}
        />,
      );
      expect(html).toContain(copy.unassessed);
      expect(html).toContain('data-world-workshop="parts"');
      expect(html).toContain('data-world-workshop="arrays"');
      expect(html).toContain('data-world-action="moveLeft"');
      expect(html).toContain('data-world-action="undo"');
      expect(html).not.toContain('data-child-answer=');
      expect(html).not.toContain('data-child-help');
      expect(html).not.toMatch(/<input|<select|draggable/);
    },
  );

  it.each(locales)(
    'renders every family with direct cards and honest worked help in %s',
    (locale) => {
      for (const family of CHAPTER_FAMILY_IDS) {
        const created = createChapterTask(family, seed);
        if (!created.ok) throw new Error('Unable to make synthetic task');
        const props = {
          presentation: created.value,
          preferences: {
            uiLocale: locale,
            instructionLocale: locale,
            numberSpeechLocale: locale,
          },
          feedback: 'none' as const,
          onAnswer: noop,
          onHint: noop,
          onRetry: noop,
        };
        const initial = renderToStaticMarkup(
          <ChapterTaskView {...props} hintTier={0} />,
        );
        expect(initial).toContain(
          getGrowingWorldCopy(locale).prompts[created.value.task.kind],
        );
        expect(initial).toContain('data-child-answer="0"');
        expect(initial).toContain('id="slice-task-heading"');
        expect(initial).toContain('id="slice-feedback"');
        expect(initial).not.toContain('data-world-worked');
        expect(initial).not.toMatch(/<input|draggable/);
        if (
          ['missingPart', 'equalGroups', 'arrayArea'].includes(
            created.value.task.kind,
          )
        ) {
          expect(initial).toContain('data-answer-select');
          expect(initial).toContain('data-answer-submit');
          expect(initial).toContain('data-direct-answers');
        } else expect(initial).not.toContain('<select');
        const helped = renderToStaticMarkup(
          <ChapterTaskView {...props} hintTier={3} />,
        );
        expect(helped).toContain(getGrowingWorldCopy(locale).worked);
        expect(helped).toContain('data-world-worked');
      }
    },
  );

  it('keeps task instructions and chrome in their independent effective languages', () => {
    const created = createChapterTask('groups.equal', seed);
    if (!created.ok) throw new Error('Unable to make synthetic task');
    const html = renderToStaticMarkup(
      <ChapterTaskView
        presentation={created.value}
        preferences={{
          uiLocale: 'de-DE',
          instructionLocale: 'en-GB',
          numberSpeechLocale: 'el-GR',
        }}
        feedback="none"
        hintTier={0}
        onAnswer={noop}
        onHint={noop}
        onRetry={noop}
      />,
    );
    expect(html).toContain('lang="en-GB"');
    expect(html).toContain(getGrowingWorldCopy('en-GB').prompts.equalGroups);
    expect(html).toContain('lang="de-DE"');
    expect(html).toContain(getGrowingWorldCopy('de-DE').helpButton);
  });
});
