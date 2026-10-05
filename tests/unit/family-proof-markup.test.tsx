import { readFileSync } from 'node:fs';
import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  createFamilyProof,
  PROOF_FAMILY_IDS,
} from '../../src/application/family-proof';
import type { ProofFamilyId } from '../../src/application/family-proof';
import {
  defaultLanguagePreferences,
  formatMessage,
  parseLanguagePreferences,
  PROTOTYPE_LOCALES,
} from '../../src/presentation/localisation';
import { buildUtterancePlan } from '../../src/presentation/speech/plans';
import { App } from '../../src/ui/App';
import {
  encodeProofAnswer,
  PROOF_CLASS_IDS,
} from '../../src/ui/family-proof/answers';
import { FamilyProofScreen } from '../../src/ui/family-proof/FamilyProofScreen';
import type { FamilyProofScreenProps } from '../../src/ui/family-proof/FamilyProofScreen';
import {
  DEFAULT_PROOF_SEED,
  parseFamilyProofOptions,
} from '../../src/ui/family-proof/options';

function props(familyId: ProofFamilyId): FamilyProofScreenProps {
  const generated = createFamilyProof(familyId, DEFAULT_PROOF_SEED);
  if (!generated.ok) throw new Error(generated.error.code);
  return {
    proof: generated.value,
    familyId,
    seedHex: DEFAULT_PROOF_SEED,
    preferences: defaultLanguagePreferences,
    response: '',
    selectedClasses: [],
    hintVisible: false,
    unitIndex: -1,
    feedback: 'none',
    onFamily: () => undefined,
    onSeed: () => undefined,
    onReplay: () => undefined,
    onResponse: () => undefined,
    onClass: () => undefined,
    onHint: () => undefined,
    onSubmit: () => undefined,
    onRetry: () => undefined,
    onNextUnit: () => undefined,
    onStartUnits: () => undefined,
  };
}

function render(input: FamilyProofScreenProps): string {
  return renderToStaticMarkup(<FamilyProofScreen {...input} />);
}

function invoke(
  node: ReactNode,
  predicate: (type: unknown, className: string) => boolean,
): void {
  if (
    !isValidElement<{
      readonly children?: ReactNode;
      readonly className?: string;
      readonly onClick?: () => void;
      readonly onSubmit?: (event: { preventDefault: () => void }) => void;
    }>(node)
  )
    return;
  if (predicate(node.type, node.props.className ?? '')) {
    node.props.onClick?.();
    node.props.onSubmit?.({ preventDefault: () => undefined });
  }
  Children.forEach(node.props.children, (child) => invoke(child, predicate));
}

describe('bounded deterministic family presentation', () => {
  it('enables developer text enlargement only for one exact override on the proof path', () => {
    expect(
      parseFamilyProofOptions('?familyProof=1&textScale=200').textScale,
    ).toBe(200);
    for (const query of [
      '?textScale=200',
      '?familyProof=0&textScale=200',
      '?familyProof=1&familyProof=1&textScale=200',
      '?familyProof=1&textScale=200&textScale=200',
      '?familyProof=1&textScale=200&textScale=100',
      '?familyProof=1&textScale=200.0',
      '?familyProof=1&textScale=200%25',
      '?familyProof=1&textScale=100',
      '?familyProof=1&TEXTSCALE=200',
    ])
      expect(parseFamilyProofOptions(query)).not.toHaveProperty('textScale');
  });

  it('marks text-enlargement QA explicitly without changing semantic task or default prototype', () => {
    const input = props('number.addition');
    const enlarged = render({ ...input, textScale: 200 });
    expect(enlarged).toContain('data-text-scale="200"');
    expect(render(input)).not.toContain('data-text-scale');
    expect(enlarged.replace(' data-text-scale="200"', '')).toBe(render(input));
    const css = readFileSync(
      new URL('../../src/ui/family-proof/family-proof.css', import.meta.url),
      'utf8',
    );
    expect(css).toContain("html:has(.family-proof[data-text-scale='200'])");
    expect(css).toContain('font-size: 200%');
    expect(
      renderToStaticMarkup(
        <App familyProof={parseFamilyProofOptions('?textScale=200')} />,
      ),
    ).toBe(renderToStaticMarkup(<App />));
    const enabled = renderToStaticMarkup(
      <App
        familyProof={parseFamilyProofOptions('?familyProof=1&textScale=200')}
      />,
    );
    expect(enabled).toContain('data-text-scale="200"');
    expect(enabled).toContain(DEFAULT_PROOF_SEED);
  });

  it.each([
    '',
    '?familyProof=0',
    '?familyProof=true',
    '?familyProof=1&familyProof=1',
    '?FAMILYPROOF=1',
  ])(
    'preserves the accepted default prototype for disabled developer query %s',
    (query) => {
      const options = parseFamilyProofOptions(query);
      expect(options.enabled).toBe(false);
      expect(renderToStaticMarkup(<App familyProof={options} />)).toBe(
        renderToStaticMarkup(<App />),
      );
    },
  );

  it('accepts one explicit developer flag and delegates invalid/repeated seeds to rejection', () => {
    expect(
      parseFamilyProofOptions(
        '?familyProof=1&family=geometry.quadrilateral&seed=bad',
      ),
    ).toEqual({
      enabled: true,
      familyId: 'geometry.quadrilateral',
      seedHex: 'bad',
    });
    expect(
      parseFamilyProofOptions('?familyProof=1&seed=a&seed=b').seedHex,
    ).toBe('');
    const unavailable = renderToStaticMarkup(
      <App familyProof={parseFamilyProofOptions('?familyProof=1&seed=bad')} />,
    );
    expect(unavailable).toContain(formatMessage('el-GR', 'proof.unavailable'));
    expect(unavailable).not.toContain('class="proof-answer"');
  });

  it.each(PROOF_FAMILY_IDS)(
    'keeps %s native, neutral, unsaved and language-correct in all three draft packs',
    (familyId) => {
      const baseline = props(familyId);
      for (const locale of PROTOTYPE_LOCALES) {
        const markup = render({
          ...baseline,
          preferences: {
            uiLocale: locale,
            instructionLocale: locale,
            numberSpeechLocale: locale,
          },
        });
        expect(markup).toContain('data-theme="space"');
        expect(markup.match(/<main\b/g)).toHaveLength(1);
        expect(markup).toContain(`lang="${locale}"`);
        expect(markup).toContain('<label for="proof-family">');
        expect(markup).toContain('<label for="proof-seed">');
        expect(markup).toContain(
          'aria-expanded="false" aria-controls="proof-hint"',
        );
        expect(markup.match(/role="status"/g)).toHaveLength(1);
        expect(markup).toContain(
          'aria-live="polite" aria-atomic="true"></div>',
        );
        expect(markup).toContain(formatMessage(locale, 'proof.intro'));
        expect(markup).not.toMatch(
          /answerContract|expectedClassIds|eligibleForMastery|score|streak|role="button"|tabindex="[1-9]/,
        );
        expect(markup).toContain('<form class="proof-answer">');
      }
    },
  );

  it('labels independent mixed preferences by effective display locale without changing the semantic task', () => {
    const baseline = props('number.addition');
    const markup = render({
      ...baseline,
      preferences: parseLanguagePreferences(
        '?ui=en-GB&instruction=de-DE&speech=el-GR',
      ),
    });
    expect(markup).toContain(
      '<main class="prototype family-proof" data-theme="space" lang="en-GB">',
    );
    expect(markup).toContain('class="task-panel proof-task" lang="de-DE"');
    expect(markup).toContain(formatMessage('de-DE', 'proof.additionPrompt'));
    const fallback = render({
      ...baseline,
      preferences: parseLanguagePreferences(
        '?ui=fr-FR&instruction=pt-PT&speech=it-IT',
      ),
    });
    expect(fallback).toContain('lang="el-GR"');
    expect(fallback).not.toMatch(/lang="(?:fr-FR|pt-PT|it-IT)"/);
    expect(baseline.proof?.task).toEqual(props('number.addition').proof?.task);
    expect(buildUtterancePlan('childInstructions', 'it-IT')).toBeNull();
  });

  it('shows neutral geometry plus exact attributes and all-applicable native choices, without preselected classes', () => {
    const input = props('geometry.quadrilateral');
    const markup = render({
      ...input,
      preferences: parseLanguagePreferences('?lang=en'),
    });
    const svg = /<svg\b[\s\S]*?<\/svg>/.exec(markup)?.[0] ?? '';
    expect(svg).toContain(
      'role="img" aria-label="Closed outline with straight sides"',
    );
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(svg).not.toMatch(/Parallelogram|Rectangle|Square|correct|answer/);
    expect(markup.match(/type="checkbox"/g)).toHaveLength(3);
    expect(markup).not.toContain('checked=""');
    for (const classId of PROOF_CLASS_IDS)
      expect(markup).toContain(`value="${classId}"`);
    expect(markup).toContain('Side length squared');
    expect(input.proof).not.toHaveProperty('answerContract');
    expect(input.proof?.geometry?.sideLengthSquares).toHaveLength(4);
  });

  it('offers a single-unit traversal without announcing a total or number of list items', () => {
    const input = {
      ...props('measurement.unit-length'),
      preferences: parseLanguagePreferences('?lang=en'),
    };
    expect(render(input)).toContain(
      '<p id="proof-unit-step">Beginning of the length</p>',
    );
    expect(render({ ...input, unitIndex: 0 })).toContain(
      '<p id="proof-unit-step">One unit step: A → B</p>',
    );
    expect(
      render({ ...input, unitIndex: input.proof?.units?.length ?? 0 }),
    ).toContain('<p id="proof-unit-step">End of the length</p>');
    const markup = render(input);
    expect(markup).toContain('aria-describedby="proof-unit-step"');
    expect(markup).toContain('aria-hidden="true" focusable="false"><g>');
    expect(markup).not.toMatch(
      /<(?:ol|ul)\b|aria-setsize|aria-posinset| of [1-8]|total/i,
    );
    expect(markup).toContain('<select id="proof-response" required="">');
  });

  it.each(PROOF_FAMILY_IDS)(
    'wires %s explicit check/help/replay/retry without changing task or moving focus',
    (familyId) => {
      const events: string[] = [];
      const input = {
        ...props(familyId),
        onHint: () => events.push('hint'),
        onSubmit: () => events.push('submit'),
        onReplay: () => events.push('replay'),
        onRetry: () => events.push('retry'),
      };
      const before = JSON.stringify(input.proof);
      invoke(
        FamilyProofScreen(input),
        (type, className) =>
          type === 'form' ||
          className === 'hint-button' ||
          (type === 'button' && className === 'nav-button'),
      );
      expect(events).toEqual(['replay', 'hint', 'submit', 'retry']);
      expect(JSON.stringify(input.proof)).toBe(before);
      const hint = render({ ...input, hintVisible: true });
      expect(hint).toContain('aria-expanded="true"');
      expect(hint).not.toContain('id="proof-hint" class="hint" hidden');
      expect(render({ ...input, feedback: 'retry' })).toContain(
        formatMessage('el-GR', 'retry'),
      );
      expect(render({ ...input, feedback: 'correct' })).toContain(
        formatMessage('el-GR', 'success'),
      );
    },
  );

  it('encodes exact structured responses while leaving all mathematical truth to the facade', () => {
    expect(encodeProofAnswer('number.addition', '7', [])).toEqual({
      kind: 'exactValue',
      value: { schema: 'rational-v1', numerator: '7', denominator: '1' },
    });
    expect(
      encodeProofAnswer('geometry.quadrilateral', '', [
        'geometry.rectangle',
        'geometry.parallelogram',
      ]),
    ).toEqual({
      kind: 'classification',
      classIds: ['geometry.rectangle', 'geometry.parallelogram'],
    });
    expect(encodeProofAnswer('measurement.unit-length', '3', [])).toEqual({
      kind: 'quantity',
      quantity: {
        schema: 'quantity-v1',
        kind: 'exact',
        magnitude: { schema: 'rational-v1', numerator: '3', denominator: '1' },
        unitId: 'unit.length-step',
        dimension: 'length',
      },
    });
    for (const file of [
      'answers.ts',
      'FamilyProofExperience.tsx',
      'FamilyProofScreen.tsx',
    ]) {
      const source = readFileSync(
        new URL(`../../src/ui/family-proof/${file}`, import.meta.url),
        'utf8',
      );
      expect(source).not.toMatch(
        /from ['"][^'"]*domain\/|answerContract|expectedClassIds|localStorage|indexedDB|fetch\(|Math\.random|Date\.now|updateLearnerEvidence|selectNext/,
      );
    }
  });

  it('retains reflow, readable controls, contrast tokens and proportional SVG with no new animation', () => {
    const css = readFileSync(
      new URL('../../src/ui/family-proof/family-proof.css', import.meta.url),
      'utf8',
    );
    expect(css).toContain('min-block-size: 44px');
    expect(css).toContain('min-inline-size: 0');
    expect(css).toContain('flex-wrap: wrap');
    expect(css).toContain('var(--text)');
    expect(css).toContain('var(--surface)');
    expect(css).toContain('vector-effect: non-scaling-stroke');
    expect(css).not.toMatch(
      /animation:|transition:|position: fixed|overflow: hidden/,
    );
  });
});
