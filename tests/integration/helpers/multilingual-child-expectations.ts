// Authored child-language contract, separate from the production copy lookup.
// These words are draft acceptance expectations, never native-language approval.
export const PLAYABLE_CHILD_LOCALES = ['el-GR', 'en-GB', 'de-DE'] as const;
export type PlayableChildLocale = (typeof PLAYABLE_CHILD_LOCALES)[number];

export const CHILD_LANGUAGE_EXPECTATIONS = {
  'el-GR': {
    name: 'Ελληνικά',
    badges: ['Αστέρι', 'Τρίγωνο'],
    navigation: ['Παίξε', 'Σχήματα', 'Εξερεύνησε'],
    help: 'Δείξε μου',
    retry: 'Ξαναδοκίμασε',
    success: 'Ναι, το βρήκες!',
    group: 'Ομάδα',
    pictures: {
      dot: 'Κουκκίδα',
      sun: 'Ήλιος',
      planet: 'Πλανήτης',
      moon: 'Φεγγάρι',
      rocket: 'Πύραυλος',
    },
    empty: 'Δεν έχει τίποτα',
    shapes: ['Τετράγωνο', 'Ορθογώνιο', 'Πλάγιο σχήμα'],
    comparison: ['Πιο πολλά δεξιά', 'Ίσα', 'Πιο πολλά αριστερά'],
    prompts: [
      'Πόσα είναι όλα μαζί;',
      'Ποιο σχήμα ταιριάζει;',
      'Πόσα βήματα έχει η γραμμή;',
      'Ποια ομάδα ταιριάζει;',
      'Πόσα βλέπεις;',
      'Πού έχει πιο πολλά;',
      'Πόσα μένουν;',
      'Τι μπαίνει στο κενό;',
    ],
    hints: [
      ['Βάλε τις δύο ομάδες μαζί.', 'Κοίτα το καθένα.', 'Άγγιξέ τα ένα ένα.'],
      ['Κοίτα τις γωνίες.', 'Ακολούθησε τις πλευρές.', 'Κοίτα και τις κάρτες.'],
      [
        'Κοίτα τα ίσα βήματα.',
        'Ακολούθησε τη γραμμή.',
        'Άγγιξε κάθε βήμα μία φορά.',
      ],
      [
        'Κοίτα τον αριθμό και τις ομάδες.',
        'Βάλε κάθε ομάδα σε σειρά.',
        'Μέτρα κάθε ομάδα μία μία.',
      ],
      [
        'Βάλε τα σε σειρά.',
        'Άγγιξε το καθένα.',
        'Κοίτα όσα δεν άγγιξες ακόμη.',
      ],
      [
        'Βάλε τις ομάδες δίπλα δίπλα.',
        'Ταίριαξε μία με μία.',
        'Κοίτα όσα μένουν μόνα.',
      ],
      [
        'Όσα είναι διαγραμμένα έφυγαν.',
        'Κοίτα μόνο όσα μένουν.',
        'Άγγιξε όσα μένουν ένα ένα.',
      ],
      [
        'Κοίτα το κενό και όσα ξέρεις.',
        'Τα μέρη φτιάχνουν το σύνολο.',
        'Μέτρα όσα ξέρεις.',
      ],
    ],
  },
  'en-GB': {
    name: 'English',
    badges: ['Star', 'Triangle'],
    navigation: ['Play', 'Shapes', 'Explore'],
    help: 'Show me',
    retry: 'Try again',
    success: 'Yes, you found it!',
    group: 'Group',
    pictures: {
      dot: 'Dot',
      sun: 'Sun',
      planet: 'Planet',
      moon: 'Moon',
      rocket: 'Rocket',
    },
    empty: 'None here',
    shapes: ['Square', 'Rectangle', 'Leaning shape'],
    comparison: ['More on the right', 'Same', 'More on the left'],
    prompts: [
      'How many altogether?',
      'Which shape matches?',
      'How many steps along the line?',
      'Which group matches?',
      'How many can you see?',
      'Which side has more?',
      'How many are left?',
      'What goes in the gap?',
    ],
    hints: [
      [
        'Bring both groups together.',
        'Look at each one.',
        'Touch them one at a time.',
      ],
      ['Look at the corners.', 'Follow the sides.', 'Look at the cards too.'],
      ['Look at the equal steps.', 'Follow the line.', 'Touch each step once.'],
      [
        'Look at the number and the groups.',
        'Line up each group.',
        'Count each group one at a time.',
      ],
      [
        'Line them up.',
        'Touch each one.',
        'Look for any you have not touched.',
      ],
      [
        'Put the groups side by side.',
        'Match one with one.',
        'Look for any left over.',
      ],
      [
        'Crossed-out ones have gone.',
        'Look only at the ones left.',
        'Touch those left one at a time.',
      ],
      [
        'Look at the gap and what you know.',
        'Parts make the whole.',
        'Use the parts you know.',
      ],
    ],
  },
  'de-DE': {
    name: 'Deutsch',
    badges: ['Stern', 'Dreieck'],
    navigation: ['Spielen', 'Formen', 'Entdecken'],
    help: 'Zeig es mir',
    retry: 'Noch einmal',
    success: 'Ja, du hast es gefunden!',
    group: 'Gruppe',
    pictures: {
      dot: 'Punkt',
      sun: 'Sonne',
      planet: 'Planet',
      moon: 'Mond',
      rocket: 'Rakete',
    },
    empty: 'Hier ist nichts',
    shapes: ['Quadrat', 'Rechteck', 'Schräge Form'],
    comparison: ['Rechts mehr', 'Gleich viele', 'Links mehr'],
    prompts: [
      'Wie viele sind es zusammen?',
      'Welche Form passt?',
      'Wie viele Schritte hat die Linie?',
      'Welche Gruppe passt?',
      'Wie viele siehst du?',
      'Auf welcher Seite sind mehr?',
      'Wie viele bleiben übrig?',
      'Was kommt in die Lücke?',
    ],
    hints: [
      [
        'Lege beide Gruppen zusammen.',
        'Schau dir jedes einzeln an.',
        'Berühre sie einzeln.',
      ],
      [
        'Schau dir die Ecken an.',
        'Folge den Seiten.',
        'Schau dir auch die Karten an.',
      ],
      [
        'Schau auf die gleich langen Schritte.',
        'Folge der Linie.',
        'Berühre jeden Schritt einmal.',
      ],
      [
        'Schau auf die Zahl und die Gruppen.',
        'Lege jede Gruppe in eine Reihe.',
        'Zähle jede Gruppe einzeln.',
      ],
      [
        'Lege sie in eine Reihe.',
        'Berühre jedes einzeln.',
        'Suche die, die noch kein Häkchen haben.',
      ],
      [
        'Lege die Gruppen nebeneinander.',
        'Bilde Paare aus beiden Gruppen.',
        'Welche haben keinen Partner?',
      ],
      [
        'Die durchgestrichenen sind weg.',
        'Schau nur auf die übrigen.',
        'Berühre die übrigen einzeln.',
      ],
      [
        'Schau auf die Lücke und die Zahlen.',
        'Teile ergeben das Ganze.',
        'Nutze, was du schon weißt.',
      ],
    ],
  },
} as const;

/** Independent restatement of the drawn-picture rule: the second seed word
 * picks one picture for every countable item in a task. */
const PICTURE_ORDER = ['dot', 'sun', 'planet', 'moon', 'rocket'] as const;
export function expectedPicture(
  seedHex: string,
): (typeof PICTURE_ORDER)[number] {
  return (
    PICTURE_ORDER[Number(BigInt(`0x${seedHex.slice(8, 16)}`) % 5n)] ?? 'dot'
  );
}
