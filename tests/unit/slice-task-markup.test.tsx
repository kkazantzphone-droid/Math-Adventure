import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  createFamilyProof,
  PROOF_FAMILY_IDS,
} from '../../src/application/family-proof';
import { createSliceFamily } from '../../src/application/slice-family';
import { SLICE_FAMILY_IDS } from '../../src/domain/families/slice';
import { defaultLanguagePreferences } from '../../src/presentation/localisation';
import { formatSlice } from '../../src/presentation/localisation/slice-copy';
import { TaskView } from '../../src/ui/synthetic-loop/TaskView';
import type {
  LoopPresentation,
  TaskViewProps,
} from '../../src/ui/synthetic-loop/TaskView';

const seed = '0123456789abcdefdeadbeeffedcba98';
function props(task: LoopPresentation | null): TaskViewProps {
  return {
    task,
    preferences: defaultLanguagePreferences,
    response: '',
    selectedClasses: [],
    hintVisible: false,
    feedback: 'none',
    onResponse: () => undefined,
    onClass: () => undefined,
    onHint: () => undefined,
    onSubmit: () => undefined,
    onRetry: () => undefined,
  };
}
function presentation(
  family: (typeof PROOF_FAMILY_IDS)[number] | (typeof SLICE_FAMILY_IDS)[number],
): LoopPresentation {
  const old = PROOF_FAMILY_IDS.find((id) => id === family);
  const result = old
    ? createFamilyProof(old, seed)
    : createSliceFamily(family as (typeof SLICE_FAMILY_IDS)[number], seed);
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}
function render(input: TaskViewProps): string {
  return renderToStaticMarkup(<TaskView {...input} />);
}

describe('authored synthetic task markup and scope boundaries — no AT certification', () => {
  it.each([...PROOF_FAMILY_IDS, ...SLICE_FAMILY_IDS])(
    'renders usable bounded answer controls and one outcome purpose for %s',
    (family) => {
      const html = render(props(presentation(family)));
      expect(html).toContain('id="slice-task-heading"');
      expect(html).toContain('<form');
      expect(html).toContain('type="submit"');
      expect(html.match(/role="status"/gu)).toHaveLength(1);
      expect(html).not.toMatch(
        /answerContract|expectedClassIds|expected:|eligibleForMastery|taskFingerprint/,
      );
      expect(html).toContain('aria-controls="slice-hint"');
      expect(html).toContain('hidden=""');
    },
  );

  it('labels instruction and UI regions independently including feedback and help', () => {
    const input = props(presentation('number.counting'));
    const html = render({
      ...input,
      preferences: {
        uiLocale: 'de-DE',
        instructionLocale: 'en-GB',
        numberSpeechLocale: 'el-GR',
      },
      hintVisible: true,
      feedback: 'incorrect',
    });
    expect(html).toContain('<section class="slice-task" lang="en-GB"');
    expect(html).toContain('Count the items. How many are there?');
    expect(html).toContain('lang="de-DE" type="button"');
    expect(html).toContain(
      'class="slice-feedback" id="slice-feedback" lang="de-DE"',
    );
    expect(html).toContain('Probiere eine andere Idee');
  });

  it('exposes items individually and zero groups without naming the total answer', () => {
    const html = render({
      ...props(presentation('number.counting')),
      preferences: {
        ...defaultLanguagePreferences,
        instructionLocale: 'en-GB',
      },
    });
    expect(html.match(/aria-label="Item"/gu)).toHaveLength(2);
    expect(html).not.toMatch(
      /aria-label="(?:2|two) (?:items|dots)|data-count="2"/iu,
    );
    const empty = createSliceFamily(
      'number.counting',
      '00000001000000020000000300000004',
    );
    if (!empty.ok) throw new Error(empty.error.code);
    const emptyHtml = render({
      ...props(empty.value),
      preferences: {
        ...defaultLanguagePreferences,
        instructionLocale: 'en-GB',
      },
    });
    expect(emptyHtml).toContain('Empty group');
    expect(emptyHtml).not.toContain('aria-label="0 items"');
    const numeral = render({
      ...props(presentation('number.numeral')),
      preferences: {
        ...defaultLanguagePreferences,
        instructionLocale: 'en-GB',
      },
    });
    expect(numeral.match(/class="slice-quantity-choice"/gu)).toHaveLength(6);
    expect(numeral).toContain('Group A');
    expect(numeral).not.toContain('aria-label="2 items"');
  });

  it('offers all inclusive geometry classes and semantic attributes without naming the correct class in the SVG', () => {
    const html = render({
      ...props(presentation('geometry.quadrilateral')),
      preferences: {
        ...defaultLanguagePreferences,
        instructionLocale: 'en-GB',
      },
    });
    expect(html.match(/type="checkbox"/gu)).toHaveLength(3);
    expect(html).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(html).toContain('aria-label="Closed outline with straight sides"');
    expect(html).toContain('Side length squared');
    expect(html).not.toMatch(
      /<svg[^>]*aria-label="[^"]*(square|rectangle|parallelogram)/iu,
    );
  });

  it('retains sequential unit traversal and an unavailable-task status without preannouncing a total', () => {
    const html = render({
      ...props(presentation('measurement.unit-length')),
      preferences: {
        ...defaultLanguagePreferences,
        instructionLocale: 'en-GB',
        uiLocale: 'en-GB',
      },
    });
    expect(html).toContain('Beginning of the length');
    expect(html).toContain('Next unit');
    expect(html).toContain('Start again');
    expect(html).not.toMatch(/aria-label="\d+ (length )?units"/u);
    const noTask = render(props(null));
    expect(noTask).toContain('id="slice-feedback"');
    expect(noTask).toContain(formatSlice('el-GR', 'slice.noTask'));
  });

  it('provides radio relation choices and hides the unknown equation value', () => {
    const compare = render(props(presentation('number.comparison')));
    expect(compare.match(/type="radio"/gu)).toHaveLength(3);
    for (const relation of [
      'comparison.less',
      'comparison.equal',
      'comparison.greater',
    ])
      expect(compare).toContain(`value="${relation}"`);
    const missing = render(props(presentation('number.missing')));
    expect(missing).toContain('<span>?</span>');
    expect(missing).toContain('<span>2</span>');
    expect(missing).toContain('<span>5</span>');
    expect(missing).not.toContain('<span>3</span>');
  });

  it('authors reduced motion, visible focus, reflow and project target rules for browser verification', () => {
    const css = readFileSync(
      new URL('../../src/ui/synthetic-loop/slice.css', import.meta.url),
      'utf8',
    );
    expect(css).toContain('min-block-size: 44px');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('flex-wrap: wrap');
    expect(css).not.toMatch(/animation:\s*\w+\s+\d/gu);
  });
});
