/** Exact accepted tags. Browser language and regional substitutes are not authority. */
export const SUPPORTED_LOCALES = [
  'el-GR',
  'en-GB',
  'de-DE',
  'fr-FR',
  'es-ES',
  'it-IT',
  'pt-PT',
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const PROTOTYPE_LOCALES = ['el-GR', 'en-GB', 'de-DE'] as const;
export type PrototypeLocale = (typeof PROTOTYPE_LOCALES)[number];
export type PrototypeLanguage = 'el' | 'en' | 'de';

export function isLocale(value: unknown): value is Locale {
  return SUPPORTED_LOCALES.some((locale) => locale === value);
}

export function isPrototypeLocale(value: unknown): value is PrototypeLocale {
  return PROTOTYPE_LOCALES.some((locale) => locale === value);
}

export interface PrototypeLocaleResolution {
  readonly requestedLocale: Locale;
  readonly effectiveLocale: PrototypeLocale;
  readonly reason: 'available-draft' | 'planned-pack';
}

/** Only planned packs fall back; a missing essential key in a draft is an error. */
export function resolvePrototypeLocale(
  locale: Locale,
): PrototypeLocaleResolution {
  if (!isLocale(locale)) throw new RangeError('unsupported-locale');
  return {
    requestedLocale: locale,
    effectiveLocale: isPrototypeLocale(locale) ? locale : 'el-GR',
    reason: isPrototypeLocale(locale) ? 'available-draft' : 'planned-pack',
  };
}

export function prototypeLanguageForLocale(locale: Locale): PrototypeLanguage {
  const effective = resolvePrototypeLocale(locale).effectiveLocale;
  return effective === 'en-GB' ? 'en' : effective === 'de-DE' ? 'de' : 'el';
}

export function localeForPrototypeLanguage(
  language: PrototypeLanguage,
): PrototypeLocale {
  return language === 'en' ? 'en-GB' : language === 'de' ? 'de-DE' : 'el-GR';
}
