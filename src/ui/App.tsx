import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  defaultLanguagePreferences,
  setLanguagePreference,
} from '../presentation/localisation/preferences';
import type { LanguagePreferences } from '../presentation/localisation/preferences';
import {
  localeForPrototypeLanguage,
  prototypeLanguageForLocale,
} from '../presentation/localisation/locales';
import type { SpeechController } from '../presentation/speech/controller';
import { VoiceCheck } from './speech/VoiceCheck';
import { PrototypeExperience } from './prototype/PrototypeExperience';
import type { PrototypeLanguage } from './prototype/options';

export function App({
  language = 'el',
  preferences: initialPreferences,
  speech,
  voiceCheck = false,
  onPreferencesChange,
}: {
  readonly language?: PrototypeLanguage;
  readonly preferences?: LanguagePreferences;
  readonly speech?: SpeechController;
  readonly voiceCheck?: boolean;
  readonly onPreferencesChange?: (preferences: LanguagePreferences) => void;
} = {}) {
  const [preferences, setPreferences] = useState<LanguagePreferences>(() => {
    if (initialPreferences !== undefined) return initialPreferences;
    const locale = localeForPrototypeLanguage(language);
    return {
      ...defaultLanguagePreferences,
      uiLocale: locale,
      instructionLocale: locale,
      numberSpeechLocale: locale,
    };
  });
  const snapshot = useSyncExternalStore(
    (listener) => speech?.subscribe(listener) ?? (() => undefined),
    () => speech?.snapshot() ?? null,
    () => speech?.snapshot() ?? null,
  );
  useEffect(() => {
    onPreferencesChange?.(preferences);
  }, [preferences, onPreferencesChange]);
  return (
    <>
      <PrototypeExperience
        language={prototypeLanguageForLocale(preferences.uiLocale)}
        preferences={preferences}
        {...(speech === undefined ? {} : { speech })}
      />
      {voiceCheck && speech !== undefined && snapshot !== null && (
        <VoiceCheck
          preferences={preferences}
          speech={speech}
          snapshot={snapshot}
          onPreference={(key, locale) => {
            speech.cancel();
            setPreferences((previous) =>
              setLanguagePreference(previous, key, locale),
            );
          }}
        />
      )}
    </>
  );
}
