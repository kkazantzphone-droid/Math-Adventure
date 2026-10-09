import { resolvePrototypeLocale } from './locales';
import type { Locale, PrototypeLocale } from './locales';

export const CHILD_MESSAGE_SCHEMA = 'child-messages-v1';
export const CHILD_PACK_VERSION = '0.1.0-child-draft';

/** Required child wording, independent of mathematical content and replay IDs. */
export const CHILD_TEXT_IDS = [
  'addition',
  'shape',
  'length',
  'numeral',
  'counting',
  'comparison',
  'subtraction',
  'missing',
  'left',
  'right',
  'part',
  'all',
  'group',
  'dot',
  'removed',
  'empty',
  'square',
  'rectangle',
  'parallelogram',
  'fewer',
  'same',
  'more',
  'step',
  'start',
  'firstStep',
  'nextStep',
  'lastStep',
  'again',
  'outline',
  'line',
  'answers',
  'retry',
  'success',
  'wait',
  'unavailable',
  'help',
] as const;

export const CHILD_HELP_IDS = [
  'additionHelp',
  'shapeHelp',
  'lengthHelp',
  'numeralHelp',
  'countingHelp',
  'comparisonHelp',
  'subtractionHelp',
  'missingHelp',
] as const;

export type ChildTextId = (typeof CHILD_TEXT_IDS)[number];
export type ChildHelpId = (typeof CHILD_HELP_IDS)[number];
export type ChildMessages = Readonly<
  Record<ChildTextId, string> &
    Record<ChildHelpId, readonly [string, string, string]>
>;

// Draft child content. Completeness does not confer linguistic review.
const copy = {
  'el-GR': {
    addition: 'Πόσα είναι όλα μαζί;',
    shape: 'Ποιο σχήμα ταιριάζει;',
    length: 'Πόσα βήματα έχει η γραμμή;',
    numeral: 'Ποια ομάδα ταιριάζει;',
    counting: 'Πόσες κουκκίδες βλέπεις;',
    comparison: 'Πού έχει πιο πολλά;',
    subtraction: 'Πόσες μένουν;',
    missing: 'Τι μπαίνει στο κενό;',
    left: 'Αριστερά',
    right: 'Δεξιά',
    part: 'Μέρος',
    all: 'Όλα μαζί',
    group: 'Ομάδα',
    dot: 'Κουκκίδα',
    removed: 'Κουκκίδα που έφυγε',
    empty: 'Καμία κουκκίδα',
    square: 'Τετράγωνο',
    rectangle: 'Ορθογώνιο',
    parallelogram: 'Πλάγιο σχήμα',
    fewer: 'Πιο πολλά δεξιά',
    same: 'Ίδιες',
    more: 'Πιο πολλά αριστερά',
    step: 'Ένα βήμα',
    start: 'Αρχή',
    firstStep: 'Πρώτο βήμα',
    nextStep: 'Επόμενο βήμα',
    lastStep: 'Τελευταίο βήμα',
    again: 'Από την αρχή',
    outline: 'Σχήμα με τέσσερις πλευρές',
    line: 'Γραμμή από ίσα βήματα',
    answers: 'Διάλεξε μια κάρτα',
    retry: 'Ξαναδοκίμασε',
    success: 'Ναι, το βρήκες!',
    wait: 'Μια στιγμή…',
    unavailable: 'Ζήτησε βοήθεια από έναν μεγάλο.',
    help: 'Δείξε μου',
    additionHelp: [
      'Βάλε τις δύο ομάδες μαζί.',
      'Κοίτα κάθε κουκκίδα.',
      'Άγγιξε τις κουκκίδες μία μία.',
    ],
    shapeHelp: [
      'Κοίτα τις γωνίες.',
      'Ακολούθησε τις πλευρές.',
      'Κοίτα και τις κάρτες.',
    ],
    lengthHelp: [
      'Κοίτα τα ίσα βήματα.',
      'Ακολούθησε τη γραμμή.',
      'Άγγιξε κάθε βήμα μία φορά.',
    ],
    numeralHelp: [
      'Κοίτα τον αριθμό και τις ομάδες.',
      'Βάλε τις κουκκίδες σε σειρά.',
      'Μέτρα κάθε ομάδα μία μία.',
    ],
    countingHelp: [
      'Βάλε τις κουκκίδες σε σειρά.',
      'Άγγιξε κάθε κουκκίδα.',
      'Κοίτα όσες δεν άγγιξες ακόμη.',
    ],
    comparisonHelp: [
      'Βάλε τις ομάδες δίπλα δίπλα.',
      'Ταίριαξε μία με μία.',
      'Κοίτα όσα μένουν μόνα.',
    ],
    subtractionHelp: [
      'Οι διαγραμμένες κουκκίδες έφυγαν.',
      'Κοίτα μόνο όσες μένουν.',
      'Άγγιξε όσες μένουν μία μία.',
    ],
    missingHelp: [
      'Κοίτα το κενό και όσα ξέρεις.',
      'Τα μέρη φτιάχνουν το σύνολο.',
      'Μέτρα όσα ξέρεις.',
    ],
  },
  'en-GB': {
    addition: 'How many altogether?',
    shape: 'Which shape matches?',
    length: 'How many steps along the line?',
    numeral: 'Which group matches?',
    counting: 'How many dots?',
    comparison: 'Where are there more dots?',
    subtraction: 'How many are left?',
    missing: 'What goes in the gap?',
    left: 'Left',
    right: 'Right',
    part: 'Part',
    all: 'Altogether',
    group: 'Group',
    dot: 'Dot',
    removed: 'Removed dot',
    empty: 'No dots',
    square: 'Square',
    rectangle: 'Rectangle',
    parallelogram: 'Leaning shape',
    fewer: 'More on the right',
    same: 'Same',
    more: 'More on the left',
    step: 'One step',
    start: 'Start here',
    firstStep: 'First step',
    nextStep: 'Next step',
    lastStep: 'Last step',
    again: 'Start again',
    outline: 'Shape with four sides',
    line: 'Line made of equal steps',
    answers: 'Choose a card',
    retry: 'Try again',
    success: 'Yes, you found it!',
    wait: 'One moment…',
    unavailable: 'Ask a grown-up for help.',
    help: 'Show me',
    additionHelp: [
      'Bring both groups together.',
      'Look at every dot.',
      'Touch the dots one at a time.',
    ],
    shapeHelp: [
      'Look at the corners.',
      'Follow the sides.',
      'Look at the cards too.',
    ],
    lengthHelp: [
      'Look at the equal steps.',
      'Follow the line.',
      'Touch each step once.',
    ],
    numeralHelp: [
      'Look at the number and the groups.',
      'Line up the dots.',
      'Count each group one at a time.',
    ],
    countingHelp: [
      'Line up the dots.',
      'Touch each dot.',
      'Look for dots you have not touched.',
    ],
    comparisonHelp: [
      'Put the groups side by side.',
      'Match one with one.',
      'Look for any dots left over.',
    ],
    subtractionHelp: [
      'Crossed-out dots have gone.',
      'Look only at dots left.',
      'Touch those left one at a time.',
    ],
    missingHelp: [
      'Look at the gap and what you know.',
      'Parts make the whole.',
      'Use the dots you know.',
    ],
  },
  'de-DE': {
    addition: 'Wie viele sind es zusammen?',
    shape: 'Welche Form passt?',
    length: 'Wie viele Schritte hat die Linie?',
    numeral: 'Welche Gruppe passt?',
    counting: 'Wie viele Punkte?',
    comparison: 'Wo sind mehr Punkte?',
    subtraction: 'Wie viele bleiben übrig?',
    missing: 'Was kommt in die Lücke?',
    left: 'Links',
    right: 'Rechts',
    part: 'Teil',
    all: 'Zusammen',
    group: 'Gruppe',
    dot: 'Punkt',
    removed: 'Weggenommener Punkt',
    empty: 'Keine Punkte',
    square: 'Quadrat',
    rectangle: 'Rechteck',
    parallelogram: 'Schräge Form',
    fewer: 'Rechts mehr',
    same: 'Gleich viele',
    more: 'Links mehr',
    step: 'Ein Schritt',
    start: 'Anfang',
    firstStep: 'Erster Schritt',
    nextStep: 'Nächster Schritt',
    lastStep: 'Letzter Schritt',
    again: 'Von vorn',
    outline: 'Form mit vier Seiten',
    line: 'Linie aus gleichen Schritten',
    answers: 'Wähle eine Karte',
    retry: 'Noch einmal',
    success: 'Ja, du hast es gefunden!',
    wait: 'Einen Moment…',
    unavailable: 'Bitte eine erwachsene Person um Hilfe.',
    help: 'Zeig es mir',
    additionHelp: [
      'Lege beide Gruppen zusammen.',
      'Schau dir jeden Punkt an.',
      'Berühre die Punkte einzeln.',
    ],
    shapeHelp: [
      'Schau dir die Ecken an.',
      'Folge den Seiten.',
      'Schau dir auch die Karten an.',
    ],
    lengthHelp: [
      'Schau auf die gleich langen Schritte.',
      'Folge der Linie.',
      'Berühre jeden Schritt einmal.',
    ],
    numeralHelp: [
      'Schau auf die Zahl und die Gruppen.',
      'Lege die Punkte in eine Reihe.',
      'Zähle jede Gruppe einzeln.',
    ],
    countingHelp: [
      'Lege die Punkte in eine Reihe.',
      'Berühre jeden Punkt.',
      'Suche die Punkte ohne Häkchen.',
    ],
    comparisonHelp: [
      'Lege die Gruppen nebeneinander.',
      'Paare die Punkte aus beiden Gruppen.',
      'Suche die Punkte ohne Partner.',
    ],
    subtractionHelp: [
      'Durchgestrichene Punkte sind weg.',
      'Schau nur auf die übrigen Punkte.',
      'Berühre die übrigen Punkte einzeln.',
    ],
    missingHelp: [
      'Schau auf die Lücke und die Zahlen.',
      'Teile ergeben das Ganze.',
      'Nutze die bekannten Punkte.',
    ],
  },
} as const satisfies Readonly<Record<PrototypeLocale, ChildMessages>>;

// Speech catalogue validation shares these exact phrases. Keep runtime callers
// from changing the allowed wording through an otherwise readonly reference.
for (const messages of Object.values(copy)) {
  for (const id of CHILD_HELP_IDS) Object.freeze(messages[id]);
  Object.freeze(messages);
}
Object.freeze(copy);

/** These manifests describe wording only; generator/content IDs are unchanged. */
export const childPackManifests = Object.freeze(
  (['el-GR', 'en-GB', 'de-DE'] as const).map((locale) =>
    Object.freeze({
      locale,
      packVersion: CHILD_PACK_VERSION,
      messageSchemaVersion: CHILD_MESSAGE_SCHEMA,
      completeness: 'complete-eight-family-child-content',
      status: 'draft',
      reviewStatus: 'native-review-pending',
      reviewers: Object.freeze([]),
      official: false,
    }),
  ),
);

export function childCopy(locale: Locale): ChildMessages {
  return copy[resolvePrototypeLocale(locale).effectiveLocale];
}
