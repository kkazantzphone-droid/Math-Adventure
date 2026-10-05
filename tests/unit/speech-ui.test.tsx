import { Children, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SUPPORTED_LOCALES } from '../../src/presentation/localisation/locales';
import { parseLanguagePreferences } from '../../src/presentation/localisation/preferences';
import type { SpeechSnapshot } from '../../src/presentation/speech/controller';
import { buildUtterancePlan } from '../../src/presentation/speech/plans';
import { App } from '../../src/ui/App';
import { PrototypeScreen } from '../../src/ui/prototype/PrototypeExperience';
import type {
  PrototypeAction,
  PrototypeState,
} from '../../src/ui/prototype/model';
import {
  dispatchPrototypeAction,
  speechForPrototypeState,
} from '../../src/ui/prototype/speech-context';
import { prototypeCopy } from '../../src/ui/prototype/copy';
import { SpeechControls } from '../../src/ui/speech/SpeechControls';

const preferences = parseLanguagePreferences(
  '?ui=el-GR&instruction=en-GB&speech=de-DE',
);
const number: PrototypeState = {
  screen: 'activity',
  badge: 'star',
  activity: 'number',
  hintVisible: false,
  selectedChoice: null,
  feedback: 'none',
};

function fakeController(ready: boolean) {
  const capabilities = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      { state: ready ? 'ready-local' : 'missing' },
    ]),
  ) as SpeechSnapshot['capabilities'];
  const snapshot: SpeechSnapshot = { capabilities, voices: [] };
  return {
    snapshot: () => snapshot,
    subscribe: () => () => undefined,
    refresh: vi.fn(),
    dispose: vi.fn(),
    cancel: vi.fn(),
    capabilities: ({
      locale,
    }: {
      readonly locale: (typeof SUPPORTED_LOCALES)[number];
    }) => Promise.resolve(snapshot.capabilities[locale]),
    speak: vi.fn(() => Promise.resolve({ kind: 'completed' as const })),
  };
}

describe('independent written and spoken prototype contexts', () => {
  it.each([
    ['en-GB', 'de-DE', 'el-GR', 'en'],
    ['de-DE', 'el-GR', 'en-GB', 'de'],
    ['el-GR', 'de-DE', 'en-GB', 'el'],
  ] as const)(
    'keeps UI %s, instruction %s and number speech %s separate',
    (uiLocale, instructionLocale, numberSpeechLocale, language) => {
      const mix = { uiLocale, instructionLocale, numberSpeechLocale };
      const markup = renderToStaticMarkup(
        <PrototypeScreen
          state={number}
          language={language}
          preferences={mix}
          onAction={() => undefined}
        />,
      );
      expect(markup).toContain(`data-theme="space" lang="${uiLocale}"`);
      expect(markup).toMatch(new RegExp(`<h1[^>]*lang="${instructionLocale}"`));
      expect(speechForPrototypeState(number, mix)?.locale).toBe(
        numberSpeechLocale,
      );
    },
  );
  it('keeps Greek controls, English instructions and German number speech', () => {
    const markup = renderToStaticMarkup(
      <PrototypeScreen
        state={number}
        language="el"
        preferences={preferences}
        onAction={() => undefined}
      />,
    );
    expect(markup).toContain('data-theme="space" lang="el-GR"');
    expect(markup).toMatch(/<h1[^>]*lang="en-GB"[^>]*>Find the number/);
    expect(markup).toContain('aria-label="Three plus two. Choose a number."');
    expect(markup).toContain('Δείξε μου');
    expect(markup).toMatch(
      /class="hint-button"[^>]*lang="el-GR"[^>]*aria-expanded="false"/,
    );
    const plan = speechForPrototypeState(number, preferences);
    expect(plan?.kind).toBe('numberPrompt');
    expect(plan?.locale).toBe('de-DE');
    expect(plan?.segments[0]?.text).toContain('Drei');
    expect(JSON.stringify(number)).not.toMatch(
      /speech|locale|evidence|learner/,
    );
  });

  it('uses instruction locale for shape meaning and feedback', () => {
    expect(
      speechForPrototypeState({ ...number, activity: 'shape' }, preferences)
        ?.locale,
    ).toBe('en-GB');
    expect(
      speechForPrototypeState(
        { ...number, activity: 'shape', hintVisible: true },
        preferences,
      )?.kind,
    ).toBe('shapeHint');
    expect(
      speechForPrototypeState(
        { screen: 'success', badge: 'star', activity: 'number' },
        preferences,
      )?.locale,
    ).toBe('en-GB');
  });

  it.each(['multiply', 'square', 'root'] as const)(
    'speaks %s semantically in the selected number locale',
    (representation) => {
      const plan = speechForPrototypeState(
        { screen: 'explore', badge: 'star', representation },
        preferences,
      );
      expect(plan?.locale).toBe('de-DE');
      expect(plan?.kind).toBe(representation);
      expect(JSON.stringify(plan)).not.toMatch(/[√²×]/);
    },
  );

  it('has no substitute speech for a planned phrase pack', () => {
    expect(
      speechForPrototypeState(number, {
        ...preferences,
        numberSpeechLocale: 'pt-PT',
      }),
    ).toBeNull();
  });

  it.each(['el', 'en', 'de'] as const)(
    'preserves the accepted single root guide and truth in %s',
    (language) => {
      const markup = renderToStaticMarkup(
        <PrototypeScreen
          state={{ screen: 'explore', badge: 'star', representation: 'root' }}
          language={language}
          onAction={() => undefined}
        />,
      );
      expect(markup.match(/class="array-cell"/g)).toHaveLength(16);
      expect(markup.match(/data-primary-side="top"/g)).toHaveLength(1);
      expect(markup).toContain('class="root-side-value">4</span>');
      expect(markup).toContain('√16 = 4');
      expect(markup).toContain(prototypeCopy[language].rootArrayLabel);
    },
  );
});

describe('explicit nonblocking replay and context cancellation', () => {
  it('renders no dead speech control when the exact local voice is missing', () => {
    const speech = fakeController(false);
    expect(
      SpeechControls({
        speech,
        snapshot: speech.snapshot(),
        plan: buildUtterancePlan('root', 'de-DE'),
        copy: prototypeCopy.el,
      }),
    ).toBeNull();
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('plays only on explicit click, stops on request and adds no live announcement', async () => {
    const speech = fakeController(true);
    const plan = buildUtterancePlan('root', 'de-DE');
    const controls = SpeechControls({
      speech,
      snapshot: speech.snapshot(),
      plan,
      copy: prototypeCopy.el,
    });
    const markup = renderToStaticMarkup(controls);
    expect(markup).not.toMatch(/aria-live|role="status"/);
    expect(speech.speak).not.toHaveBeenCalled();
    const typedControls = controls as ReactElement<{
      readonly children: ReactNode;
    }> | null;
    const buttons = Children.toArray(typedControls?.props.children).filter(
      isValidElement,
    ) as ReactElement<{ onClick: () => void }>[];
    buttons[0]?.props.onClick();
    await Promise.resolve();
    expect(speech.speak).toHaveBeenCalledExactlyOnceWith(plan);
    buttons[1]?.props.onClick();
    expect(speech.cancel).toHaveBeenCalledOnce();
  });

  it.each<PrototypeAction>([
    { type: 'home' },
    { type: 'back' },
    { type: 'continue' },
    { type: 'selectBadge', badge: 'triangle' },
    { type: 'showHint' },
    { type: 'selectRepresentation', representation: 'root' },
  ])('cancels before action $type', (action) => {
    const order: string[] = [];
    dispatchPrototypeAction(action, () => order.push('visual'), {
      cancel: () => order.push('cancel'),
    });
    expect(order).toEqual(['cancel', 'visual']);
  });

  it('keeps Voice Check out of normal child navigation', () => {
    const speech = fakeController(false);
    const normal = renderToStaticMarkup(
      <App preferences={preferences} speech={speech} />,
    );
    expect(normal).not.toContain('Adult Voice Check');
    expect(normal).toContain('Διάλεξε το σήμα σου');
    const diagnostic = renderToStaticMarkup(
      <App
        preferences={{ ...preferences, uiLocale: 'fr-FR' }}
        speech={speech}
        voiceCheck
      />,
    );
    expect(diagnostic).toContain('Adult Voice Check');
    expect(diagnostic).toContain(
      'Planned/incomplete pack; written prototype uses el-GR',
    );
    expect(diagnostic).toContain('local does not prove offline');
    expect(diagnostic).not.toContain('Test fixed phrase in');
  });
});
