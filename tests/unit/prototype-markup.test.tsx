import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { prototypeCopy } from '../../src/ui/prototype/copy';
import type { PrototypeCopy } from '../../src/ui/prototype/copy';
import { App } from '../../src/ui/App';
import { PrototypeScreen } from '../../src/ui/prototype/PrototypeExperience';
import {
  initialPrototypeState,
  prototypeReducer,
} from '../../src/ui/prototype/model';
import type {
  PrototypeAction,
  PrototypeState,
} from '../../src/ui/prototype/model';
import { parsePrototypeLanguage } from '../../src/ui/prototype/options';
import type { PrototypeLanguage } from '../../src/ui/prototype/options';

// Enumerate state reachability through real actions, including all retry/hint combinations.
const actions: readonly PrototypeAction[] = [
  { type: 'selectBadge', badge: 'star' },
  { type: 'selectBadge', badge: 'triangle' },
  { type: 'openActivity', activity: 'number' },
  { type: 'openActivity', activity: 'shape' },
  { type: 'openExplore' },
  { type: 'showHint' },
  ...['four', 'five', 'six', 'triangle', 'square', 'rectangle'].map(
    (choiceId): PrototypeAction => ({ type: 'choose', choiceId }),
  ),
  { type: 'selectRepresentation', representation: 'multiply' },
  { type: 'selectRepresentation', representation: 'square' },
  { type: 'selectRepresentation', representation: 'root' },
  { type: 'home' },
  { type: 'back' },
  { type: 'continue' },
];

function reachableStates(): readonly PrototypeState[] {
  const states: PrototypeState[] = [initialPrototypeState];
  const seen = new Set([JSON.stringify(initialPrototypeState)]);
  for (const state of states) {
    for (const action of actions) {
      const next = prototypeReducer(state, action);
      const key = JSON.stringify(next);
      if (!seen.has(key)) {
        seen.add(key);
        states.push(next);
      }
    }
  }
  return states;
}

function render(state: PrototypeState, language: PrototypeLanguage): string {
  return renderToStaticMarkup(
    <PrototypeScreen
      state={state}
      language={language}
      onAction={() => undefined}
    />,
  );
}

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag)?.[1];
}

function decode(text: string): string {
  return text
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

/** Read this bounded SSR output's accessible text, respecting nested aria-hidden markup. */
function accessibleText(markup: string): string {
  const hidden: boolean[] = [false];
  let text = '';
  for (const token of markup.match(/<[^>]+>|[^<]+/g) ?? []) {
    if (token.startsWith('</')) hidden.pop();
    else if (token.startsWith('<')) {
      if (!token.endsWith('/>') && !/^<(?:img|br|hr|input)\b/.test(token))
        hidden.push(
          hidden.at(-1) === true ||
            attribute(token, 'aria-hidden') === 'true' ||
            /\shidden(?:=|\s|>)/.test(token),
        );
    } else if (hidden.at(-1) !== true) text += token;
  }
  return decode(text).replace(/\s+/g, ' ').trim();
}

function buttons(
  markup: string,
): readonly { tag: string; name: string; content: string }[] {
  return [...markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(
    (match) => {
      const tag = match[1] ?? '';
      return {
        tag,
        content: match[2] ?? '',
        name: decode(
          attribute(tag, 'aria-label') ?? accessibleText(match[2] ?? ''),
        ),
      };
    },
  );
}

function expectedControls(
  state: PrototypeState,
  copy: PrototypeCopy,
): readonly string[] {
  switch (state.screen) {
    case 'badges':
      return [copy.star, copy.triangle];
    case 'home':
      return [copy.back, copy.play, copy.shapes, copy.explore];
    case 'activity':
      return [
        copy.back,
        copy.home,
        copy.showMe,
        ...(state.activity === 'number' ? ['4', '5', '6'] : copy.shapeChoices),
      ];
    case 'success':
      return [copy.back, copy.home, copy.continue];
    case 'explore':
      return [copy.back, copy.home, ...copy.representations];
  }
}

function expectedHeading(state: PrototypeState, copy: PrototypeCopy): string {
  switch (state.screen) {
    case 'badges':
      return copy.badgesHeading;
    case 'home':
      return copy.homeHeading;
    case 'activity':
      return state.activity === 'number'
        ? copy.numberHeading
        : copy.shapePrompt;
    case 'success':
      return copy.success;
    case 'explore':
      return copy.explore;
  }
}

function expectedActions(state: PrototypeState): readonly PrototypeAction[] {
  const back: PrototypeAction = { type: 'back' };
  const home: PrototypeAction = { type: 'home' };
  switch (state.screen) {
    case 'badges':
      return [
        { type: 'selectBadge', badge: 'star' },
        { type: 'selectBadge', badge: 'triangle' },
      ];
    case 'home':
      return [
        back,
        { type: 'openActivity', activity: 'number' },
        { type: 'openActivity', activity: 'shape' },
        { type: 'openExplore' },
      ];
    case 'activity':
      return [
        back,
        home,
        { type: 'showHint' },
        ...(state.activity === 'number'
          ? ['four', 'five', 'six']
          : ['triangle', 'square', 'rectangle']
        ).map((choiceId): PrototypeAction => ({ type: 'choose', choiceId })),
      ];
    case 'success':
      return [back, home, { type: 'continue' }];
    case 'explore':
      return [
        back,
        home,
        ...(['multiply', 'square', 'root'] as const).map(
          (representation): PrototypeAction => ({
            type: 'selectRepresentation',
            representation,
          }),
        ),
      ];
  }
}

function invokeButtons(node: ReactNode): void {
  if (
    !isValidElement<{
      readonly children?: ReactNode;
      readonly onClick?: () => void;
    }>(node)
  )
    return;
  if (node.type === 'button') {
    expect(node.props.onClick).toBeTypeOf('function');
    node.props.onClick?.();
  }
  Children.forEach(node.props.children, invokeButtons);
}

function controlSemantics(markup: string) {
  return buttons(markup).map(({ tag }) => ({
    kind: attribute(tag, 'class'),
    type: attribute(tag, 'type'),
    pressed: attribute(tag, 'aria-pressed'),
    expanded: attribute(tag, 'aria-expanded'),
    controls: attribute(tag, 'aria-controls'),
    describedBy: attribute(tag, 'aria-describedby'),
  }));
}

function languageNeutralStructure(markup: string): string {
  return markup
    .replace(/\s(?:lang|aria-label)="[^"]*"/g, '')
    .replace(/>[^<]*</g, '><');
}

const states = reachableStates();

describe('actual child-facing SSR semantics across the reachable flow', () => {
  it('covers every badge, task, retry/hint, success and exploratory representation combination', () => {
    expect(states).toHaveLength(39);
    expect(new Set(states.map((state) => state.screen))).toEqual(
      new Set(['badges', 'home', 'activity', 'success', 'explore']),
    );
  });

  it('wires every actually rendered native button to the intended explicit action in every language/state', () => {
    for (const state of states) {
      for (const language of ['el', 'en'] as const) {
        const dispatched: PrototypeAction[] = [];
        const view = PrototypeScreen({
          state,
          language,
          onAction: (action) => dispatched.push(action),
        });
        invokeButtons(view);
        expect(dispatched).toEqual(expectedActions(state));
        expect(dispatched).toHaveLength(
          buttons(render(state, language)).length,
        );
      }
    }
  });

  it.each(states)(
    'keeps the selected Space flow semantically consistent in both languages for reachable state %j',
    (state) => {
      for (const language of ['el', 'en'] as const) {
        const copy = prototypeCopy[language];
        const markup = render(state, language);
        expect(buttons(markup).map(({ name }) => name)).toEqual(
          expectedControls(state, copy),
        );
        expect(markup).not.toMatch(
          /data-variant|decoration-trail|decoration-lab/,
        );
        expect(markup).toContain('data-theme="space"');
        expect(markup.match(/<main\b/g)).toHaveLength(1);
        expect(markup).toContain(`lang="${copy.locale}"`);
        const headings = [...markup.matchAll(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/g)];
        expect(headings).toHaveLength(1);
        expect(accessibleText(headings[0]?.[2] ?? '')).toBe(
          expectedHeading(state, copy),
        );
        expect(headings[0]?.[1]).toContain('tabindex="-1"');
        expect(markup).toContain(
          `<footer class="prototype-footer">${copy.prototypeNote}</footer>`,
        );
        expect(markup).not.toMatch(
          /<(?:input|select|textarea|a)\b|role="button"|disabled|tabindex="[1-9]/,
        );
        for (const { tag, name } of buttons(markup)) {
          expect(attribute(tag, 'type')).toBe('button');
          expect(name.length).toBeGreaterThan(0);
          expect(tag).not.toMatch(/aria-hidden="true"|tabindex/);
        }
        if (state.screen !== 'badges' && state.screen !== 'home') {
          expect(
            buttons(markup)
              .slice(0, 2)
              .map(({ name }) => name),
          ).toEqual([copy.back, copy.home]);
        }
        expect(accessibleText(markup)).not.toMatch(
          /Phase|fixture|synthetic|DTO|adapter|reducer|TypeScript|checkpoint|telemetry|mastery|score|level|streak|punishment/i,
        );
      }
      const greek = render(state, 'el');
      const english = render(state, 'en');
      expect(controlSemantics(greek)).toEqual(controlSemantics(english));
      expect(languageNeutralStructure(greek)).toBe(
        languageNeutralStructure(english),
      );
    },
  );

  it('keeps only the selected Space motif inert and hidden from assistive technology', () => {
    const markup = render(initialPrototypeState, 'en');
    const decoration =
      /<div class="theme-decoration" data-decoration="true" aria-hidden="true">([\s\S]*?)<\/div>/.exec(
        markup,
      )?.[1] ?? '';
    expect(decoration.match(/<svg\b/g)).toHaveLength(1);
    expect(decoration).toContain('class="decoration-space"');
    expect(decoration).not.toMatch(/decoration-trail|decoration-lab/);
    expect(decoration.match(/focusable="false"/g)).toHaveLength(1);
    expect(decoration).not.toMatch(
      /<button|role=|tabindex|aria-label|<title|<text/,
    );
  });

  it.each([
    '',
    '?variant=a',
    '?variant=b',
    '?variant=c',
    '?variant=B',
    '?variant=',
    '?variant=%',
    '?variant=%ZZ',
    '?variant=unknown',
    '?variant=b&variant=b',
    '?variant=b&variant=c',
    '?variant=c&variant=',
    '?VARIANT=c',
    '?variant=b&lang=en',
    '?variant=c&lang=de',
    '?variant=b&variant=c&lang=en',
  ])(
    'renders the selected Space baseline for retired variant URL %s',
    (query) => {
      const language = parsePrototypeLanguage(query);
      const markup = renderToStaticMarkup(<App language={language} />);
      const baseline = render(initialPrototypeState, language);
      expect(markup).toBe(baseline);
      expect(markup).toContain('class="decoration-space"');
      expect(markup).toContain('data-theme="space"');
      expect(markup).not.toMatch(
        /data-variant|decoration-trail|decoration-lab/,
      );
      expect(markup).toContain(`lang="${prototypeCopy[language].locale}"`);
    },
  );

  it('removes alternative theme selection from the production composition and CSS', () => {
    const composition = readFileSync(
      new URL('../../src/composition/main.tsx', import.meta.url),
      'utf8',
    );
    const css = readFileSync(
      new URL('../../src/ui/prototype/prototype.css', import.meta.url),
      'utf8',
    );
    expect(composition).not.toMatch(/parsePrototypeVariant|variant=/);
    expect(css).not.toMatch(/data-variant|decoration-trail|decoration-lab/);
    expect(css).toContain('--background: #111c35');
    expect(css).toContain('--text: #f5f3ff');
  });

  it.each(['?lang=de-DE', '?lang=de&lang=en'])(
    'uses the deterministic Greek default for invalid or repeated aliases %s',
    (query) => {
      expect(parsePrototypeLanguage(query)).toBe('el');
      const markup = renderToStaticMarkup(
        <App language={parsePrototypeLanguage(query)} />,
      );
      expect(markup).toContain('lang="el-GR"');
      expect(accessibleText(markup)).toContain('Διάλεξε το σήμα σου');
      expect(markup).not.toMatch(/lang="de|Wähle|Deutsch/);
    },
  );

  it.each(['?lang=de', '?variant=c&lang=de'])(
    'renders the draft German prototype for %s',
    (query) => {
      expect(parsePrototypeLanguage(query)).toBe('de');
      const markup = renderToStaticMarkup(
        <App language={parsePrototypeLanguage(query)} />,
      );
      expect(markup).toContain('lang="de-DE"');
      expect(accessibleText(markup)).toContain(prototypeCopy.de.badgesHeading);
    },
  );

  it.each(['el', 'en'] as const)(
    'shows neutral shape descriptions and no answer status before a %s action',
    (language) => {
      const copy = prototypeCopy[language];
      const state: PrototypeState = {
        screen: 'activity',
        badge: 'star',
        activity: 'shape',
        hintVisible: false,
        selectedChoice: null,
        feedback: 'none',
      };
      const markup = render(state, language);
      const choices = buttons(markup).slice(3, 6);
      expect(choices.map(({ name }) => name)).toEqual(copy.shapeChoices);
      expect(choices[1]?.name).toBe(copy.targetDescription);
      expect(choices.map(({ content }) => accessibleText(content))).toEqual([
        '',
        '',
        '',
      ]);
      expect(markup).not.toContain('choice-letter');
      const targetContent =
        /class="shape-target"[^>]*>([\s\S]*?)<\/div>/.exec(markup)?.[1] ?? '';
      const targetSvg = /<svg\b[\s\S]*?<\/svg>/.exec(targetContent)?.[0];
      const matchingSvg = /<svg\b[\s\S]*?<\/svg>/.exec(
        choices[1]?.content ?? '',
      )?.[0];
      expect(targetSvg).toBeDefined();
      expect(targetSvg).toBe(matchingSvg);
      expect(targetSvg).toContain('width="64" height="64"');
      expect(targetSvg).not.toContain('width="96" height="40"');
      expect(choices.map(({ tag }) => attribute(tag, 'aria-pressed'))).toEqual([
        'false',
        'false',
        'false',
      ]);
      expect(choices.map(({ name }) => name).join(' ')).not.toMatch(
        /correct|incorrect|answer|success|right answer|σωστ|λάθος|τετράγωνο/i,
      );
      expect(markup).toContain(
        `class="shape-target" role="img" aria-label="${copy.targetDescription}"`,
      );
      expect(markup).toContain(
        '<div class="feedback" role="status" aria-live="polite" aria-atomic="true"></div>',
      );
      expect(markup).not.toContain(copy.retry);
      expect(markup).not.toContain(copy.success);
      expect(accessibleText(markup)).not.toContain(copy.shapeHint);
      expect(markup.indexOf('class="hint-button"')).toBeLessThan(
        markup.indexOf('class="answer-choices"'),
      );
      expect(markup.indexOf('class="hint-button"')).toBeLessThan(
        markup.indexOf('id="prototype-hint"'),
      );
    },
  );

  it.each(['el', 'en'] as const)(
    'keeps the matching shape task, hint and recovery coherent throughout the complete %s interaction',
    (language) => {
      const copy = prototypeCopy[language];
      let state = prototypeReducer(
        prototypeReducer(initialPrototypeState, {
          type: 'selectBadge',
          badge: 'triangle',
        }),
        { type: 'openActivity', activity: 'shape' },
      );
      expect(accessibleText(render(state, language))).toContain(
        copy.shapePrompt,
      );
      expect(render(state, language)).toContain('aria-expanded="false"');
      state = prototypeReducer(state, { type: 'showHint' });
      expect(state).toMatchObject({
        screen: 'activity',
        hintVisible: true,
        selectedChoice: null,
        feedback: 'none',
      });
      for (const choiceId of ['triangle', 'rectangle'] as const) {
        state = prototypeReducer(state, { type: 'choose', choiceId });
        const markup = render(state, language);
        expect(accessibleText(markup)).toContain(copy.retry);
        expect(accessibleText(markup)).toContain(copy.shapeHint);
        expect(buttons(markup).map(({ name }) => name)).toEqual([
          copy.back,
          copy.home,
          copy.showMe,
          ...copy.shapeChoices,
        ]);
        expect(markup).not.toMatch(/disabled|autofocus|tabindex="[0-9]/);
      }
      state = prototypeReducer(state, { type: 'choose', choiceId: 'square' });
      expect(state).toEqual({
        screen: 'success',
        badge: 'triangle',
        activity: 'shape',
      });
      expect(accessibleText(render(state, language))).toContain(copy.success);
      expect(prototypeReducer(state, { type: 'continue' })).toEqual({
        screen: 'home',
        badge: 'triangle',
      });
      expect(prototypeReducer(state, { type: 'back' })).toEqual({
        screen: 'home',
        badge: 'triangle',
      });
      expect(prototypeReducer(state, { type: 'home' })).toEqual({
        screen: 'home',
        badge: 'triangle',
      });
    },
  );

  it.each(['el', 'en'] as const)(
    'makes the %s hint a named native control directly before answers without revealing it automatically',
    (language) => {
      const state: PrototypeState = {
        screen: 'activity',
        badge: 'star',
        activity: 'shape',
        hintVisible: false,
        selectedChoice: null,
        feedback: 'none',
      };
      const copy = prototypeCopy[language];
      const markup = render(state, language);
      const hint = buttons(markup)[2];
      expect(hint?.name).toBe(copy.showMe);
      expect(attribute(hint?.tag ?? '', 'type')).toBe('button');
      expect(attribute(hint?.tag ?? '', 'aria-expanded')).toBe('false');
      expect(attribute(hint?.tag ?? '', 'aria-controls')).toBe(
        'prototype-hint',
      );
      expect(hint?.content).toContain('<svg');
      expect(markup).toMatch(/id="prototype-hint"[^>]*hidden=""/);
      expect(markup.indexOf('class="hint-button"')).toBeLessThan(
        markup.indexOf('class="answer-choices"'),
      );
      expect(accessibleText(markup)).not.toContain(copy.shapeHint);
      const shownState = prototypeReducer(state, { type: 'showHint' });
      const shown = render(shownState, language);
      expect(shownState).toMatchObject({
        screen: 'activity',
        hintVisible: true,
        selectedChoice: null,
        feedback: 'none',
      });
      expect(shown).toContain('aria-expanded="true"');
      expect(shown).not.toMatch(/id="prototype-hint"[^>]*hidden/);
      expect(accessibleText(shown)).toContain(copy.shapeHint);
      expect(shown).not.toMatch(/autofocus|tabindex="[0-9]|disabled/);
      expect(shown.indexOf('class="hint-button"')).toBeLessThan(
        shown.indexOf('id="prototype-hint"'),
      );
      expect(shown.indexOf('id="prototype-hint"')).toBeLessThan(
        shown.indexOf('class="answer-choices"'),
      );
      expect(buttons(shown).map(({ name }) => name)).toEqual(
        expectedControls(shownState, copy),
      );
    },
  );

  it.each(['el', 'en'] as const)(
    'reports only supportive retry after selection and keeps hint/navigation available in %s',
    (language) => {
      const copy = prototypeCopy[language];
      for (const [activity, wrong] of [
        ['number', 'four'],
        ['number', 'six'],
        ['shape', 'triangle'],
        ['shape', 'rectangle'],
      ] as const) {
        const start: PrototypeState = {
          screen: 'activity',
          badge: 'star',
          activity,
          hintVisible: false,
          selectedChoice: null,
          feedback: 'none',
        };
        const retry = prototypeReducer(start, {
          type: 'choose',
          choiceId: wrong,
        });
        const markup = render(retry, language);
        expect(markup.match(/role="status"/g)).toHaveLength(1);
        expect(markup).toContain('aria-live="polite" aria-atomic="true"');
        expect(accessibleText(markup)).toContain(copy.retry);
        expect(accessibleText(markup)).not.toContain(copy.success);
        expect(
          buttons(markup)
            .slice(3, 6)
            .map(({ tag }) => attribute(tag, 'aria-pressed'))
            .filter((pressed) => pressed === 'true'),
        ).toHaveLength(1);
        expect(buttons(markup)[2]?.name).toBe(copy.showMe);
        const hinted = render(
          prototypeReducer(retry, { type: 'showHint' }),
          language,
        );
        expect(hinted).toContain(
          'aria-expanded="true" aria-controls="prototype-hint"',
        );
        expect(hinted).toContain('id="prototype-hint"');
        expect(accessibleText(hinted)).toContain(
          activity === 'number' ? copy.numberHint : copy.shapeHint,
        );
      }
    },
  );

  it.each(['el', 'en'] as const)(
    'keeps meaningful power/root labels, order and one pressed representation without scoring in %s',
    (language) => {
      const copy = prototypeCopy[language];
      for (const representation of ['multiply', 'square', 'root'] as const) {
        const markup = render(
          { screen: 'explore', badge: 'triangle', representation },
          language,
        );
        const controls = buttons(markup).slice(2);
        expect(controls.map(({ name }) => name)).toEqual(copy.representations);
        expect(
          controls.map(({ tag }) => attribute(tag, 'aria-pressed')),
        ).toEqual(
          ['multiply', 'square', 'root'].map((id) =>
            String(id === representation),
          ),
        );
        expect(markup).toContain('4 × 4 = 16');
        expect(markup).toContain('4² = 16');
        expect(markup).toContain('√16 = 4');
        expect(markup.match(/class="array-cell"/g)).toHaveLength(16);
        if (representation === 'root') {
          expect(markup).not.toContain(`aria-label="${copy.arrayDescription}"`);
        } else {
          expect(markup).toContain(
            `role="img" aria-label="${copy.arrayDescription}"`,
          );
        }
        const guide = /<p class="explore-guide"([^>]*)>([\s\S]*?)<\/p>/.exec(
          markup,
        );
        expect(markup.match(/role="status"/g)).toHaveLength(1);
        expect(guide?.[1]).toContain(
          'role="status" aria-live="polite" aria-atomic="true"',
        );
        expect(accessibleText(guide?.[2] ?? '')).toBe(
          representation === 'root' ? '' : copy.exploreGuides[representation],
        );
        expect(markup).not.toContain(copy.retry);
        expect(markup).not.toContain(copy.success);
        for (const [index, id] of ['multiply', 'square', 'root'].entries()) {
          expect(
            attribute(controls[index]?.tag ?? '', 'aria-describedby'),
          ).toBe(
            id === 'root'
              ? 'prototype-representation-root prototype-root-notation'
              : `prototype-representation-${id}`,
          );
          expect(
            markup.match(
              new RegExp(`id="prototype-representation-${id}"`, 'g'),
            ),
          ).toHaveLength(1);
          expect(markup).toContain(
            `id="prototype-representation-${id}">${copy.representationCaptions[index]}</span>`,
          );
        }
        expect(accessibleText(markup)).not.toMatch(
          /score|mastery|correct|incorrect|win|reward|βαθμ|επιτυχ|σωστ|λάθος/i,
        );
      }
    },
  );

  it.each(['el', 'en'] as const)(
    'starts with sixteen concrete tiles and links each later %s symbol selection to the same exact array',
    (language) => {
      const home: PrototypeState = { screen: 'home', badge: 'star' };
      const initial = prototypeReducer(home, { type: 'openExplore' });
      expect(initial).toEqual({
        screen: 'explore',
        badge: 'star',
        representation: null,
      });
      const first = render(initial, language);
      expect(
        buttons(first)
          .slice(2)
          .map(({ tag }) => attribute(tag, 'aria-pressed')),
      ).toEqual(['false', 'false', 'false']);
      expect(first).not.toMatch(
        /class="array-anchor"[^>]*data-representation=|data-highlighted="true"/,
      );
      const initialGuide = /<p class="explore-guide"[^>]*>([\s\S]*?)<\/p>/.exec(
        first,
      );
      expect(initialGuide).not.toBeNull();
      expect(accessibleText(initialGuide?.[1] ?? '')).toBe('');
      const coordinates = (markup: string) =>
        [...markup.matchAll(/<span\b([^>]*class="array-cell"[^>]*)>/g)].map(
          (match) => ({
            row: attribute(match[1] ?? '', 'data-row'),
            column: attribute(match[1] ?? '', 'data-column'),
          }),
        );
      const expectedCoordinates = [
        { row: '0', column: '0' },
        { row: '0', column: '1' },
        { row: '0', column: '2' },
        { row: '0', column: '3' },
        { row: '1', column: '0' },
        { row: '1', column: '1' },
        { row: '1', column: '2' },
        { row: '1', column: '3' },
        { row: '2', column: '0' },
        { row: '2', column: '1' },
        { row: '2', column: '2' },
        { row: '2', column: '3' },
        { row: '3', column: '0' },
        { row: '3', column: '1' },
        { row: '3', column: '2' },
        { row: '3', column: '3' },
      ];
      expect(coordinates(first)).toEqual(expectedCoordinates);
      expect(first.indexOf('class="array-anchor"')).toBeLessThan(
        first.indexOf('4 × 4 = 16'),
      );
      expect(first.indexOf('4 × 4 = 16')).toBeLessThan(
        first.indexOf('4² = 16'),
      );
      expect(first.indexOf('4² = 16')).toBeLessThan(first.indexOf('√16 = 4'));
      expect(first.match(/class="representation-step"/g)).toHaveLength(3);
      for (const representation of ['multiply', 'square', 'root'] as const) {
        const selected = prototypeReducer(initial, {
          type: 'selectRepresentation',
          representation,
        });
        const markup = render(selected, language);
        expect(markup).toContain(
          `class="array-anchor" data-representation="${representation}"`,
        );
        expect(coordinates(markup)).toEqual(expectedCoordinates);
        expect(markup.match(/data-highlighted="true"/g)).toHaveLength(
          representation === 'root' ? 4 : 16,
        );
        expect(markup.match(/class="array-cell"/g)).toHaveLength(16);
        const representationButtons = buttons(markup).slice(2);
        const pressed = representationButtons.find(
          ({ tag }) => attribute(tag, 'aria-pressed') === 'true',
        );
        expect(pressed).toBeDefined();
        expect(pressed?.content.match(/class="array-cell"/g)).toHaveLength(16);
        expect(pressed?.content).toContain(
          `class="array-anchor" data-representation="${representation}"`,
        );
        expect(pressed?.content).not.toMatch(/<(?:div|p|section|button)\b/);
        for (const unpressed of representationButtons.filter(
          ({ tag }) => attribute(tag, 'aria-pressed') !== 'true',
        )) {
          expect(unpressed.content).not.toContain('class="array-anchor"');
        }
        expect(markup).toContain('4 × 4 = 16');
        expect(markup).toContain('4² = 16');
        expect(markup).toContain('√16 = 4');
        expect(markup.match(/role="status"/g)).toHaveLength(1);
        expect(markup).not.toMatch(/score|mastery/);
        expect(prototypeReducer(selected, { type: 'home' })).toEqual(home);
      }
    },
  );

  it.each(['el', 'en'] as const)(
    'makes one top side of the sixteen-tile square primary before the concluding root notation in %s',
    (language) => {
      const markup = render(
        { screen: 'explore', badge: 'star', representation: 'root' },
        language,
      );
      const root = buttons(markup)[4];
      const content = root?.content ?? '';
      const cells = [
        ...content.matchAll(/<span\b([^>]*class="array-cell"[^>]*)>/g),
      ].map((match) => match[1] ?? '');
      expect(cells).toHaveLength(16);
      expect(
        cells.filter((cell) => attribute(cell, 'data-highlighted') === 'false'),
      ).toHaveLength(12);
      expect(
        cells
          .filter((cell) => attribute(cell, 'data-highlighted') === 'true')
          .map((cell) => ({
            row: attribute(cell, 'data-row'),
            column: attribute(cell, 'data-column'),
          })),
      ).toEqual([
        { row: '0', column: '0' },
        { row: '0', column: '1' },
        { row: '0', column: '2' },
        { row: '0', column: '3' },
      ]);
      expect(content.match(/data-primary-side=/g)).toHaveLength(1);
      expect(content).toContain('data-primary-side="top"');
      expect(content.match(/class="root-side-guide"/g)).toHaveLength(1);
      expect(content.match(/class="root-side-value"/g)).toHaveLength(1);
      expect(content).toContain('<span class="root-side-value">4</span>');
      expect(content).not.toMatch(/class="array-(?:axis|side)"/);
      expect(content.match(/class="array-anchor"/g)).toHaveLength(1);
      expect(content.match(/√16 = 4/g)).toHaveLength(1);
      const arrayIndex = content.indexOf('class="array-anchor"');
      const captionIndex = content.indexOf(
        'id="prototype-representation-root"',
      );
      const notationIndex = content.indexOf('id="prototype-root-notation"');
      expect(arrayIndex).toBeGreaterThanOrEqual(0);
      expect(captionIndex).toBeGreaterThan(arrayIndex);
      expect(notationIndex).toBeGreaterThan(captionIndex);
      expect(content).toContain(prototypeCopy[language].rootArrayLabel);
      expect(content).toContain(
        prototypeCopy[language].representationCaptions[2],
      );
    },
  );

  it.each(['el', 'en'] as const)(
    'describes the root discovery once as a visible relationship without demanding notation knowledge in %s',
    (language) => {
      const copy = prototypeCopy[language];
      const markup = render(
        { screen: 'explore', badge: 'star', representation: 'root' },
        language,
      );
      const root = buttons(markup)[4];
      expect(root?.name).toBe(copy.rootArrayLabel);
      expect(attribute(root?.tag ?? '', 'aria-pressed')).toBe('true');
      expect(attribute(root?.tag ?? '', 'aria-describedby')).toBe(
        'prototype-representation-root prototype-root-notation',
      );
      expect(root?.content).toMatch(
        /class="array-anchor"[^>]*aria-hidden="true"/,
      );
      expect(root?.content).not.toMatch(/role="img"|aria-label=/);
      expect(root?.content).toContain(
        `<span class="root-notation-description">${copy.rootNotation}</span>`,
      );
      expect(accessibleText(root?.content ?? '')).toBe(
        `${copy.representationCaptions[2]}${copy.rootNotation}`,
      );
      const guide = /<p class="explore-guide"[^>]*>([\s\S]*?)<\/p>/.exec(
        markup,
      );
      expect(accessibleText(guide?.[1] ?? '')).toBe('');
      expect(accessibleText(markup)).not.toMatch(
        /solve|answer|correct|incorrect|score|mastery|must know|λύσε|απάντησ|σωστ|λάθος|βαθμ/i,
      );
      expect(markup).not.toMatch(/\b(?:x²|x\^2)\s*=/);
    },
  );

  it.each([
    ['el', 'multiply', '4 × 4 = 16'],
    ['en', 'multiply', '4 × 4 = 16'],
    ['el', 'square', '4² = 16'],
    ['en', 'square', '4² = 16'],
  ] as const)(
    'preserves the %s %s discovery and its full-array semantics',
    (language, representation, notation) => {
      const markup = render(
        { screen: 'explore', badge: 'star', representation },
        language,
      );
      const selected = buttons(markup).find(
        ({ tag }) => attribute(tag, 'aria-pressed') === 'true',
      );
      const content = selected?.content ?? '';
      const index = representation === 'multiply' ? 0 : 1;
      expect(selected?.name).toBe(
        prototypeCopy[language].representations[index],
      );
      expect(attribute(selected?.tag ?? '', 'aria-describedby')).toBe(
        `prototype-representation-${representation}`,
      );
      expect(content).toContain(notation);
      expect(content.match(/class="array-cell"/g)).toHaveLength(16);
      expect(content.match(/data-highlighted="true"/g)).toHaveLength(16);
      expect(content).toContain(
        `role="img" aria-label="${prototypeCopy[language].arrayDescription}"`,
      );
      expect(content).toContain(
        '<span class="array-axis" aria-hidden="true">4</span>',
      );
      expect(content).toContain(
        '<span class="array-side" aria-hidden="true">4</span>',
      );
      expect(content).not.toMatch(
        /root-side-guide|root-side-value|data-primary-side/,
      );
      expect(content.indexOf(notation)).toBeLessThan(
        content.indexOf('class="array-anchor"'),
      );
    },
  );

  it('renders the independently expected number task and completed result in both languages', () => {
    for (const language of ['el', 'en'] as const) {
      const state: PrototypeState = {
        screen: 'activity',
        badge: 'star',
        activity: 'number',
        hintVisible: false,
        selectedChoice: null,
        feedback: 'none',
      };
      const markup = render(state, language);
      expect(markup).toContain('3 + 2 = ?');
      expect(
        buttons(markup)
          .slice(3, 6)
          .map(({ name }) => name),
      ).toEqual(['4', '5', '6']);
      const success = render(
        prototypeReducer(state, { type: 'choose', choiceId: 'five' }),
        language,
      );
      expect(success).toContain('3 + 2 = 5');
      expect(buttons(success).at(-1)?.name).toBe(
        prototypeCopy[language].continue,
      );
      expect(success).not.toMatch(/role="status"|aria-live/);
    }
  });
});
