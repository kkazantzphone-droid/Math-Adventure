import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { languageControlCopy } from '../../src/presentation/localisation/language-controls-copy';
import { SUPPORTED_LOCALES } from '../../src/presentation/localisation/locales';
import type { SpeechSnapshot } from '../../src/presentation/speech/controller';
import {
  buildChildActivityUtterancePlan,
  buildUtterancePlan,
} from '../../src/presentation/speech/plans';
import { getPrototypeCopy } from '../../src/presentation/localisation/format';
import { SpeechAvailabilityNotice } from '../../src/ui/speech/SpeechAvailabilityNotice';
import { SpeechControls } from '../../src/ui/speech/SpeechControls';

function snapshot(): SpeechSnapshot {
  return {
    capabilities: Object.fromEntries(
      SUPPORTED_LOCALES.map((locale) => [locale, { state: 'ready-local' }]),
    ) as SpeechSnapshot['capabilities'],
    voices: [],
  };
}

describe('Child speech availability describes its exact role and fixed phrase', () => {
  it.each(['fr-FR', 'es-ES', 'it-IT', 'pt-PT'] as const)(
    'keeps planned %s unavailable even with an exposed exact local voice',
    (locale) => {
      const plan = buildChildActivityUtterancePlan('countItems', locale);
      const words = languageControlCopy('en-GB');
      expect(plan).toBeNull();
      const markup = renderToStaticMarkup(
        <SpeechAvailabilityNotice
          locale={locale}
          plan={plan}
          snapshot={snapshot()}
          unavailable={words.unavailable}
          loading={words.loading}
          speechRole="question"
        />,
      );
      expect(markup).toContain(
        'Reading this question aloud is unavailable here. You can still play.',
      );
      expect(markup).not.toContain('Checking');
      expect(markup).not.toMatch(/aria-live|role="status"/);
    },
  );

  it('can explain unavailable question reading alongside useful independent number speech without claiming all sound is missing or autoplaying', () => {
    const states = snapshot();
    const current: SpeechSnapshot = {
      ...states,
      capabilities: { ...states.capabilities, 'en-GB': { state: 'missing' } },
    };
    const question = buildChildActivityUtterancePlan(
      'numeralRecognition',
      'en-GB',
    );
    const number = buildUtterancePlan('cardinalThree', 'de-DE');
    const words = languageControlCopy('en-GB');
    const speech = {
      snapshot: () => current,
      subscribe: () => () => {},
      refresh: vi.fn(),
      dispose: vi.fn(),
      cancel: vi.fn(),
      capabilities: () => Promise.resolve({ state: 'ready-local' as const }),
      speak: vi.fn(() => Promise.resolve({ kind: 'completed' as const })),
    };
    const markup = renderToStaticMarkup(
      <>
        <SpeechAvailabilityNotice
          locale="en-GB"
          plan={question}
          snapshot={current}
          unavailable={words.unavailable}
          loading={words.loading}
          speechRole="question"
        />
        <SpeechControls
          speech={speech}
          snapshot={current}
          plan={number}
          copy={getPrototypeCopy('en-GB')}
        />
        <SpeechAvailabilityNotice
          locale="de-DE"
          plan={number}
          snapshot={current}
          unavailable={words.numberUnavailable}
          loading={words.loading}
          speechRole="number"
        />
      </>,
    );
    expect(markup).toContain('Reading this question aloud is unavailable');
    expect(markup).toContain('Listen');
    expect(markup).not.toContain('data-child-number-speech-availability');
    expect(markup).not.toContain('Sound is unavailable');
    expect(speech.speak).not.toHaveBeenCalled();
  });
});
