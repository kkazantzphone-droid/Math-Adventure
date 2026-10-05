import {
  SUPPORTED_LOCALES,
  isLocale,
  resolvePrototypeLocale,
} from '../../presentation/localisation/locales';
import type { Locale } from '../../presentation/localisation/locales';
import type {
  LanguagePreferences,
  LanguagePreferenceKey,
} from '../../presentation/localisation/preferences';
import type {
  SpeechController,
  SpeechSnapshot,
} from '../../presentation/speech/controller';
import { buildUtterancePlan } from '../../presentation/speech/plans';

/** Deliberate adult-only query surface. Fixed synthetic phrases; no stored voice fingerprint. */
export function VoiceCheck({
  preferences,
  onPreference,
  speech,
  snapshot,
}: {
  readonly preferences: LanguagePreferences;
  readonly onPreference: (key: LanguagePreferenceKey, locale: Locale) => void;
  readonly speech: SpeechController;
  readonly snapshot: SpeechSnapshot;
}) {
  const testToken = useRef(0);
  const [lastTest, setLastTest] = useState<{
    readonly locale: Locale;
    readonly kind: SpeechOutcome['kind'] | 'pending';
  } | null>(null);
  return (
    <aside
      className="voice-check"
      lang="en-GB"
      aria-labelledby="voice-check-heading"
    >
      <h2 id="voice-check-heading">Adult Voice Check</h2>
      <p>
        Draft prototype wording; native review pending. Speech is optional.
        Reported local does not prove offline playback or pronunciation. Offline
        speech has not been tested in this session.
      </p>
      <div className="voice-preferences">
        {(['uiLocale', 'instructionLocale', 'numberSpeechLocale'] as const).map(
          (key) => {
            const resolution = resolvePrototypeLocale(preferences[key]);
            return (
              <label key={key}>
                {key}
                <select
                  value={preferences[key]}
                  onChange={(event) => {
                    const locale = event.currentTarget.value;
                    if (isLocale(locale)) {
                      testToken.current += 1;
                      setLastTest(null);
                      onPreference(key, locale);
                    }
                  }}
                >
                  {SUPPORTED_LOCALES.map((locale) => (
                    <option key={locale} value={locale}>
                      {locale}
                    </option>
                  ))}
                </select>
                {key !== 'numberSpeechLocale' &&
                  resolution.reason === 'planned-pack' && (
                    <span>
                      Planned/incomplete pack; written prototype uses{' '}
                      {resolution.effectiveLocale}.
                    </span>
                  )}
                {key === 'numberSpeechLocale' &&
                  resolution.reason === 'planned-pack' && (
                    <span>
                      Planned/incomplete wording; no substitute speech.
                    </span>
                  )}
              </label>
            );
          },
        )}
      </div>
      <button type="button" onClick={() => speech.refresh()}>
        Refresh exposed voices
      </button>
      <button
        type="button"
        onClick={() => {
          speech.cancel();
        }}
      >
        Stop speech
      </button>
      <p aria-live="off">
        Last fixed-phrase test:{' '}
        {lastTest === null
          ? 'none this session'
          : `${lastTest.locale} — ${lastTest.kind}`}
        . Browser outcome only; listening quality and offline operation remain
        unverified.
      </p>
      <ul>
        {SUPPORTED_LOCALES.map((locale) => {
          const capability = snapshot.capabilities[locale].state;
          const plan = buildUtterancePlan('numberPrompt', locale);
          const local = snapshot.voices.filter(
            (voice) =>
              voice.localService &&
              voice.locale.toLowerCase() === locale.toLowerCase(),
          );
          return (
            <li key={locale}>
              <strong>{locale}</strong>: {capability}; {local.length} exact
              voices reported local.
              {plan !== null && capability === 'ready-local' && (
                <button
                  type="button"
                  onClick={() => {
                    const token = ++testToken.current;
                    setLastTest({ locale, kind: 'pending' });
                    void speech
                      .speak(plan)
                      .then((outcome) => {
                        if (testToken.current === token)
                          setLastTest({ locale, kind: outcome.kind });
                      })
                      .catch(() => {
                        if (testToken.current === token)
                          setLastTest({ locale, kind: 'error' });
                      });
                  }}
                >
                  Test fixed phrase in {locale}
                </button>
              )}
              {plan === null && <span> Planned/incomplete phrase pack.</span>}
            </li>
          );
        })}
      </ul>
      <details>
        <summary>Browser-exposed voices (session only)</summary>
        <ul>
          {snapshot.voices.map((voice, index) => (
            <li key={index}>
              {voice.name}: {voice.locale}; localService=
              {String(voice.localService)}
            </li>
          ))}
        </ul>
      </details>
    </aside>
  );
}
import { useRef, useState } from 'react';
import type { SpeechOutcome } from '../../application/ports/speech';
