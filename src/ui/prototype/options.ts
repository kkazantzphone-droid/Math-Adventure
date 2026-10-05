import { prototypeLanguageForLocale } from '../../presentation/localisation/locales';
import type { PrototypeLanguage } from '../../presentation/localisation/locales';
import { parseLanguagePreferences } from '../../presentation/localisation/preferences';

export type { PrototypeLanguage } from '../../presentation/localisation/locales';

/** Compatibility alias; independent exact preferences are parsed at the bootstrap. */
export function parsePrototypeLanguage(search: string): PrototypeLanguage {
  return prototypeLanguageForLocale(parseLanguagePreferences(search).uiLocale);
}
