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
import { FamilyProofExperience } from './family-proof/FamilyProofExperience';
import type { FamilyProofOptions } from './family-proof/options';
import type { OfflineController } from '../presentation/offline/controller';
import { OfflineControls } from './offline/OfflineControls';

export function App({
  language = 'el',
  preferences: initialPreferences,
  speech,
  voiceCheck = false,
  familyProof,
  onPreferencesChange,
  offline,
}: {
  readonly language?: PrototypeLanguage;
  readonly preferences?: LanguagePreferences;
  readonly speech?: SpeechController;
  readonly voiceCheck?: boolean;
  readonly familyProof?: FamilyProofOptions;
  readonly onPreferencesChange?: (preferences: LanguagePreferences) => void;
  readonly offline?: OfflineController;
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
  const offlineSnapshot = useSyncExternalStore(
    (listener) => offline?.subscribe(listener) ?? (() => undefined),
    () => offline?.snapshot() ?? null,
    () => offline?.snapshot() ?? null,
  );
  useEffect(() => {
    onPreferencesChange?.(preferences);
  }, [preferences, onPreferencesChange]);
  useEffect(() => {
    if (familyProof?.enabled === true) offline?.setSafeBoundary(false);
  }, [familyProof, offline]);
  useEffect(() => {
    if (offlineSnapshot?.frozen === true) speech?.cancel();
  }, [offlineSnapshot?.frozen, speech]);
  const experience = (
    <>
      {familyProof?.enabled === true ? (
        <FamilyProofExperience
          options={familyProof}
          preferences={preferences}
          {...(speech === undefined ? {} : { speech })}
        />
      ) : (
        <PrototypeExperience
          language={prototypeLanguageForLocale(preferences.uiLocale)}
          preferences={preferences}
          {...(speech === undefined ? {} : { speech })}
          {...(offline === undefined
            ? {}
            : {
                onSafeBoundary: (safe: boolean) =>
                  offline.setSafeBoundary(safe),
                canInteract: () => offline.canInteract(),
              })}
        />
      )}
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
  if (offline === undefined || offlineSnapshot === null) return experience;
  return (
    <>
      <div id="offline-interaction-surface" inert={offlineSnapshot.frozen}>
        {experience}
      </div>
      <OfflineControls
        locale={preferences.uiLocale}
        snapshot={offlineSnapshot}
        onUpdate={() => {
          void offline.requestUpdate();
        }}
      />
    </>
  );
}
