import { resolvePrototypeLocale, type Locale } from './locales';

/** Native names let a family find its language before reading the current UI. */
export const languageNames: Readonly<Record<Locale, string>> = {
  'el-GR': 'Ελληνικά',
  'en-GB': 'English',
  'de-DE': 'Deutsch',
  'fr-FR': 'Français',
  'es-ES': 'Español',
  'it-IT': 'Italiano',
  'pt-PT': 'Português',
};

const copy = {
  'el-GR': {
    heading: 'Γλώσσα',
    mixed: 'Έχουν επιλεγεί διαφορετικές γλώσσες.',
    planned: 'σε προετοιμασία',
    unavailable: 'Η ερώτηση δεν μπορεί να ακουστεί εδώ. Μπορείς να παίξεις.',
    numberUnavailable: 'Η ανάγνωση αριθμών δεν είναι διαθέσιμη εδώ.',
    loading: 'Ελέγχουμε αν υπάρχει φωνή. Μπορείς να παίξεις.',
  },
  'en-GB': {
    heading: 'Language',
    mixed: 'Different languages are selected.',
    planned: 'planned',
    unavailable:
      'Reading this question aloud is unavailable here. You can still play.',
    numberUnavailable: 'Reading numbers aloud is unavailable here.',
    loading: 'Checking for a voice. You can still play.',
  },
  'de-DE': {
    heading: 'Sprache',
    mixed: 'Es sind verschiedene Sprachen ausgewählt.',
    planned: 'in Vorbereitung',
    unavailable:
      'Die Frage kann hier nicht vorgelesen werden. Du kannst trotzdem spielen.',
    numberUnavailable: 'Zahlen werden hier nicht vorgelesen.',
    loading: 'Wir suchen nach einer Stimme. Du kannst trotzdem spielen.',
  },
} as const;

export function languageControlCopy(locale: Locale) {
  return copy[resolvePrototypeLocale(locale).effectiveLocale];
}
