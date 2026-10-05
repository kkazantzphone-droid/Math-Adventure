import { isLocale } from './locales';
import type { Locale } from './locales';

export interface LanguagePreferences {
  readonly uiLocale: Locale;
  readonly instructionLocale: Locale;
  readonly numberSpeechLocale: Locale;
}

export const defaultLanguagePreferences: LanguagePreferences = Object.freeze({
  uiLocale: 'el-GR',
  instructionLocale: 'el-GR',
  numberSpeechLocale: 'el-GR',
});

export type LanguagePreferenceKey = keyof LanguagePreferences;

/** Transient presentation settings; changing one never mutates either other setting. */
export function setLanguagePreference(
  preferences: LanguagePreferences,
  key: LanguagePreferenceKey,
  locale: Locale,
): LanguagePreferences {
  if (!isLocale(locale)) throw new RangeError('unsupported-locale');
  return { ...preferences, [key]: locale };
}

function aliasLocale(value: string | undefined): Locale {
  return value === 'en' ? 'en-GB' : value === 'de' ? 'de-DE' : 'el-GR';
}

/**
 * lang=el/en/de sets all three; exact ui/instruction/speech override independently.
 * Missing overrides retain that base. Invalid/repeated overrides reset only their
 * own preference to Greek. URLSearchParams decodes once; no browser negotiation.
 */
export function parseLanguagePreferences(search: string): LanguagePreferences {
  const parameters = new URLSearchParams(search);
  const aliases = parameters.getAll('lang');
  const base = aliasLocale(aliases.length === 1 ? aliases[0] : undefined);
  const explicitLocale = (parameter: string): Locale => {
    const values = parameters.getAll(parameter);
    if (values.length === 0) return base;
    const value = values.length === 1 ? values[0] : undefined;
    return isLocale(value) ? value : 'el-GR';
  };
  return {
    uiLocale: explicitLocale('ui'),
    instructionLocale: explicitLocale('instruction'),
    numberSpeechLocale: explicitLocale('speech'),
  };
}
