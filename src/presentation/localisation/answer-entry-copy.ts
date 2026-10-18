import type { PrototypeLocale } from './locales';

const copy = {
  'el-GR': {
    response: 'Η απάντησή σου',
    choose: 'Διάλεξε αριθμό',
    check: 'Έλεγξε την απάντηση',
    direct: 'Δείξε όλους τους αριθμούς',
    directHint: 'Πάτησε έναν αριθμό για να απαντήσεις αμέσως.',
  },
  'en-GB': {
    response: 'Your answer',
    choose: 'Choose a number',
    check: 'Check answer',
    direct: 'Show all numbers',
    directHint: 'Tap a number to answer straight away.',
  },
  'de-DE': {
    response: 'Deine Antwort',
    choose: 'Zahl auswählen',
    check: 'Antwort prüfen',
    direct: 'Alle Zahlen anzeigen',
    directHint: 'Tippe auf eine Zahl, um sofort zu antworten.',
  },
} as const;

export function answerEntryCopy(locale: PrototypeLocale) {
  return copy[locale];
}
