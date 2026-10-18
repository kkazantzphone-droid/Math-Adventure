import type { Locale } from './locales';
import { resolvePrototypeLocale } from './locales';

/** Complete authored drafts for this chapter, pending native linguistic review. */
export const GROWING_WORLD_COPY_VERSION = 'growing-world-draft-v1';

const english = {
  oneSquareUnit: 'One square unit',
  legacyCapacity:
    'This familiar practice has reached its current edge. Keep playing or choose a new discovery.',
  chooseGuidedPractice: 'Let practice guide invitations',
  guidedPractice: 'Practice guides invitations · choose just play',
  chapterTitle: 'A world of connections',
  chapterIntro:
    'Make a whole. Build equal groups. Discover what connects them.',
  journey: 'Choose your next discovery',
  chooseDiscovery: 'Choose a discovery',
  closeDiscoveries: 'Back to the activity',
  experimentalNotice:
    'Practice helps us suggest discoveries. You can always choose something else.',
  familiarTitle: 'Return to something familiar',
  chapterEnd:
    'This is the current edge of the chapter. Revisit, try another representation, or explore freely.',
  capacityReached:
    'This synthetic history is full. Unscored play and Explore are still available.',
  readyLabel: 'Tried independently in different ways',
  practiceLabel: 'Try with practice and help',
  invitation: 'An invitation for you',
  tryInvitation: 'Try this',
  familiar: 'Something familiar',
  exploreAhead: 'Explore ahead',
  chapterEdge:
    'You have reached the edge of this chapter. You can try another representation, revisit, or explore freely.',
  boundary:
    'This chapter explores parts up to 20, arrays up to 5 by 5, and square sides up to 6. More mathematics belongs beyond this chapter.',
  experimental:
    'Synthetic chapter · experimental invitations · no educational effectiveness claim',
  reasons: {
    ready:
      'You have shown this in different ways. Here is a connected idea to try.',
    support: 'Let us see it another way. Help and familiar practice are here.',
    insufficient:
      'We do not know yet. You can try it, ask for help, or explore.',
    familiar: 'A familiar idea to revisit when you choose.',
    connection: 'These ideas connect. Exploring one does not prove the other.',
    edge: 'There is more to discover beyond the current chapter.',
    connectedReadiness:
      'You tried a connected idea independently. Try this next if you like.',
    chooseFreely:
      'We are still discovering what you know. You can try this, ask for help, or explore.',
  },
  familyLabels: {
    'number.make-ten': 'Make a ten',
    'number.part-whole': 'Find the missing part',
    'groups.equal': 'Build equal groups',
    'groups.missing': 'Share into equal groups',
    'measurement.array-area': 'Measure with square units',
    'powers.square-side': 'From a square to its side',
  },
  prompts: {
    makeTen: 'How many can move to fill the ten?',
    missingPart: 'What is the missing part?',
    equalGroups: 'How many are in all the equal groups?',
    missingGroup: 'How many belong in each equal group?',
    arrayArea: 'How many square units cover the rectangle?',
    squareSide: 'How many tiles are along one side of the square?',
  },
  help: {
    makeTen: [
      'Look at the empty spaces in the frame of ten.',
      'Match one tile from the second part to each empty space.',
      'Here is a worked example. These tiles fill the ten.',
    ],
    missingPart: [
      'The two parts make the whole.',
      'Keep the known part. Look for what is still needed.',
      'Here is the whole separated into its two parts.',
    ],
    equalGroups: [
      'Each group has the same number.',
      'Line the groups up in rows. Each row is one group.',
      'Here is a worked example. Add one equal row at a time.',
    ],
    missingGroup: [
      'Every group must have the same amount.',
      'Give one tile to every group, then repeat.',
      'Here is a worked example with the same amount in every group.',
    ],
    arrayArea: [
      'One tile is one square unit.',
      'Count equal rows of square units. Leave no gap or overlap.',
      'Here is a worked example. The rows cover the whole rectangle.',
    ],
    squareSide: [
      'A square has equal sides.',
      'Follow just the top row from one end to the other.',
      'Here is a worked example. The top row gives the side length.',
    ],
  },
  helpButton: 'Show me',
  worked: 'Worked example · learning with help',
  again: 'Show the pictures again',
  answers: 'Choose a card',
  success: 'Yes, you found it!',
  retry: 'Try again',
  unavailable: 'This activity cannot open. Choose another discovery.',
  connection: 'Connected discoveries',
  left: 'First part',
  right: 'Second part',
  total: 'Whole',
  group: 'Equal group',
  empty: 'Empty',
  tile: 'Tile',
  unit: 'square units',
  side: 'One side',
  rows: 'Rows',
  columns: 'Tiles in each row',
  square: 'A square: the same number of rows and columns',
  rectangle: 'A rectangle made of equal square units',
  partsWorkshop: 'Make and separate',
  arrayWorkshop: 'Groups, units and squares',
  exploreTitle: 'What happens if…?',
  exploreIntro:
    'Change something and watch the relationship. There are no questions to pass.',
  unassessed: 'Just exploring. Nothing here counts towards learning progress.',
  add: 'Add one tile',
  remove: 'Take one tile away',
  moveLeft: 'Move one to the first part',
  moveRight: 'Move one to the second part',
  addRow: 'Add a row',
  removeRow: 'Take away a row',
  addColumn: 'Add one to every row',
  removeColumn: 'Take one from every row',
  turn: 'Turn the arrangement',
  makeSquare: 'Make equal sides',
  undo: 'Undo',
  reset: 'Start again',
  symbols: 'See the symbols',
  hideSymbols: 'Hide the symbols',
  seeSide: 'Look at one side',
  seeWhole: 'Look at the whole square',
  practiceSeparate: 'Try a separate practice activity',
  splitDescription:
    '{left} in the first part and {right} in the second part make {total} altogether.',
  arrayDescription:
    '{rows} rows with {columns} square tiles in each row. {total} tiles altogether.',
  groupsDescription: '{groups} equal groups, each with {each} tiles.',
  sharingDescription: '{total} tiles to share equally between {groups} groups.',
  squareDescription:
    'A square of {total} equal tiles. Find how many are along one side.',
  squareAreaDescription:
    'A square covers {total} square units. Find how many unit lengths fit along one side.',
  squareSideDescription:
    'A square of {total} tiles has {side} along each side. The principal square root is {side}.',
  tenDescription:
    'A frame of ten spaces, with {first} tiles in it. A second part has {second} tiles.',
  missingDescription:
    'The whole is {total}. One part is {known}. Find the other part.',
  preservedTotal: 'Moving a tile between the parts keeps the whole the same.',
  sameTotal:
    'Turning exchanges the rows and columns. The total stays the same.',
  equalUnits:
    'Each tile is one square unit. An edge counts length; the whole surface counts area.',
  tenAndRest:
    'A full ten and the tiles beyond it are another way to see the whole.',
} as const;

type Widen<T> = T extends string
  ? string
  : T extends readonly string[]
    ? readonly string[]
    : { readonly [K in keyof T]: Widen<T[K]> };
export type GrowingWorldCopy = Widen<typeof english>;

const greek: GrowingWorldCopy = {
  oneSquareUnit: 'Μία τετραγωνική μονάδα',
  legacyCapacity:
    'Αυτή η γνώριμη εξάσκηση έφτασε στο σημερινό της όριο. Συνέχισε να παίζεις ή διάλεξε μια νέα ανακάλυψη.',
  chooseGuidedPractice: 'Η εξάσκηση να προτείνει ανακαλύψεις',
  guidedPractice: 'Η εξάσκηση προτείνει · παίξε χωρίς καταγραφή',
  chapterTitle: 'Ένας κόσμος που συνδέεται',
  chapterIntro: 'Φτιάξε ένα όλο. Χτίσε ίσες ομάδες. Δες τι τις συνδέει.',
  journey: 'Διάλεξε την επόμενη ανακάλυψη',
  chooseDiscovery: 'Διάλεξε μια ανακάλυψη',
  closeDiscoveries: 'Πίσω στη δραστηριότητα',
  experimentalNotice:
    'Η εξάσκηση μας βοηθά να προτείνουμε ανακαλύψεις. Μπορείς πάντα να διαλέξεις κάτι άλλο.',
  familiarTitle: 'Γύρισε σε κάτι γνώριμο',
  chapterEnd:
    'Αυτή είναι η τωρινή άκρη του κεφαλαίου. Γύρισε πίσω, δοκίμασε άλλη εικόνα ή εξερεύνησε ελεύθερα.',
  capacityReached:
    'Το συνθετικό ιστορικό γέμισε. Παραμένουν διαθέσιμα το παιχνίδι χωρίς αξιολόγηση και η Εξερεύνηση.',
  readyLabel: 'Δοκιμάστηκε ανεξάρτητα με διαφορετικούς τρόπους',
  practiceLabel: 'Δοκίμασε με εξάσκηση και βοήθεια',
  invitation: 'Μια πρόταση για σένα',
  tryInvitation: 'Δοκίμασέ το',
  familiar: 'Κάτι γνώριμο',
  exploreAhead: 'Εξερεύνησε παρακάτω',
  chapterEdge:
    'Έφτασες στην άκρη αυτού του κεφαλαίου. Δοκίμασε μια άλλη εικόνα, γύρισε σε κάτι γνώριμο ή εξερεύνησε ελεύθερα.',
  boundary:
    'Εδώ εξερευνούμε μέρη έως το 20, σειρές έως 5 επί 5 και πλευρές τετραγώνου έως το 6. Πέρα από αυτό το κεφάλαιο υπάρχουν κι άλλα μαθηματικά.',
  experimental:
    'Συνθετικό κεφάλαιο · πειραματικές προτάσεις · χωρίς ισχυρισμό εκπαιδευτικής αποτελεσματικότητας',
  reasons: {
    ready:
      'Το έδειξες με διαφορετικούς τρόπους. Δοκίμασε μια ιδέα που συνδέεται.',
    support: 'Ας το δούμε αλλιώς. Υπάρχει βοήθεια και γνώριμη εξάσκηση.',
    insufficient:
      'Δεν ξέρουμε ακόμη. Μπορείς να δοκιμάσεις, να ζητήσεις βοήθεια ή να εξερευνήσεις.',
    familiar: 'Μια γνώριμη ιδέα για όποτε θέλεις.',
    connection:
      'Αυτές οι ιδέες συνδέονται. Η εξερεύνηση της μιας δεν αποδεικνύει την άλλη.',
    edge: 'Υπάρχουν κι άλλα πέρα από το τωρινό κεφάλαιο.',
    connectedReadiness:
      'Δοκίμασες ανεξάρτητα μια σχετική ιδέα. Δοκίμασε αυτή αν θέλεις.',
    chooseFreely:
      'Ακόμη ανακαλύπτουμε τι γνωρίζεις. Μπορείς να δοκιμάσεις, να ζητήσεις βοήθεια ή να εξερευνήσεις.',
  },
  familyLabels: {
    'number.make-ten': 'Φτιάξε μια δεκάδα',
    'number.part-whole': 'Βρες το μέρος που λείπει',
    'groups.equal': 'Φτιάξε ίσες ομάδες',
    'groups.missing': 'Μοίρασε σε ίσες ομάδες',
    'measurement.array-area': 'Μέτρησε με τετραγωνάκια',
    'powers.square-side': 'Από το τετράγωνο στην πλευρά',
  },
  prompts: {
    makeTen: 'Πόσα θα μετακινηθούν για να γεμίσει η δεκάδα;',
    missingPart: 'Ποιο μέρος λείπει;',
    equalGroups: 'Πόσα έχουν όλες οι ίσες ομάδες μαζί;',
    missingGroup: 'Πόσα μπαίνουν σε κάθε ίση ομάδα;',
    arrayArea: 'Πόσα τετραγωνάκια καλύπτουν το ορθογώνιο;',
    squareSide: 'Πόσα πλακάκια έχει μια πλευρά του τετραγώνου;',
  },
  help: {
    makeTen: [
      'Κοίτα τις άδειες θέσεις στη δεκάδα.',
      'Ταίριαξε ένα πλακάκι από το δεύτερο μέρος σε κάθε άδεια θέση.',
      'Να ένα λυμένο παράδειγμα. Αυτά τα πλακάκια γεμίζουν τη δεκάδα.',
    ],
    missingPart: [
      'Τα δύο μέρη φτιάχνουν το όλο.',
      'Κράτησε το γνωστό μέρος. Δες τι χρειάζεται ακόμη.',
      'Να το όλο χωρισμένο στα δύο του μέρη.',
    ],
    equalGroups: [
      'Κάθε ομάδα έχει το ίδιο πλήθος.',
      'Βάλε τις ομάδες σε σειρές. Κάθε σειρά είναι μια ομάδα.',
      'Να ένα λυμένο παράδειγμα. Πρόσθεσε μια ίση σειρά κάθε φορά.',
    ],
    missingGroup: [
      'Κάθε ομάδα πρέπει να έχει το ίδιο πλήθος.',
      'Δώσε ένα πλακάκι σε κάθε ομάδα και επανάλαβε.',
      'Να ένα λυμένο παράδειγμα με το ίδιο πλήθος σε κάθε ομάδα.',
    ],
    arrayArea: [
      'Ένα πλακάκι είναι μία τετραγωνική μονάδα.',
      'Μέτρα ίσες σειρές. Χωρίς κενά και χωρίς πλακάκια το ένα πάνω στο άλλο.',
      'Να ένα λυμένο παράδειγμα. Οι σειρές καλύπτουν όλο το ορθογώνιο.',
    ],
    squareSide: [
      'Το τετράγωνο έχει ίσες πλευρές.',
      'Ακολούθησε μόνο την πάνω σειρά από τη μια άκρη ως την άλλη.',
      'Να ένα λυμένο παράδειγμα. Η πάνω σειρά δίνει το μήκος της πλευράς.',
    ],
  },
  helpButton: 'Δείξε μου',
  worked: 'Λυμένο παράδειγμα · μαθαίνουμε με βοήθεια',
  again: 'Δείξε πάλι τις εικόνες',
  answers: 'Διάλεξε μια κάρτα',
  success: 'Ναι, το βρήκες!',
  retry: 'Ξαναδοκίμασε',
  unavailable: 'Αυτή η δραστηριότητα δεν ανοίγει. Διάλεξε μια άλλη ανακάλυψη.',
  connection: 'Ιδέες που συνδέονται',
  left: 'Πρώτο μέρος',
  right: 'Δεύτερο μέρος',
  total: 'Όλο',
  group: 'Ίση ομάδα',
  empty: 'Άδειο',
  tile: 'Πλακάκι',
  unit: 'τετραγωνικές μονάδες',
  side: 'Μία πλευρά',
  rows: 'Σειρές',
  columns: 'Πλακάκια σε κάθε σειρά',
  square: 'Τετράγωνο: ίδιες σειρές και στήλες',
  rectangle: 'Ορθογώνιο από ίσα τετραγωνάκια',
  partsWorkshop: 'Ένωσε και χώρισε',
  arrayWorkshop: 'Ομάδες, μονάδες και τετράγωνα',
  exploreTitle: 'Τι θα γίνει αν…;',
  exploreIntro:
    'Άλλαξε κάτι και δες τη σχέση. Δεν υπάρχουν ερωτήσεις που πρέπει να περάσεις.',
  unassessed: 'Μόνο εξερεύνηση. Εδώ τίποτα δεν μετρά στη μαθησιακή πρόοδο.',
  add: 'Πρόσθεσε ένα πλακάκι',
  remove: 'Βγάλε ένα πλακάκι',
  moveLeft: 'Μετάφερε ένα στο πρώτο μέρος',
  moveRight: 'Μετάφερε ένα στο δεύτερο μέρος',
  addRow: 'Πρόσθεσε μια σειρά',
  removeRow: 'Βγάλε μια σειρά',
  addColumn: 'Πρόσθεσε ένα σε κάθε σειρά',
  removeColumn: 'Βγάλε ένα από κάθε σειρά',
  turn: 'Γύρισε τη διάταξη',
  makeSquare: 'Φτιάξε ίσες πλευρές',
  undo: 'Αναίρεση',
  reset: 'Από την αρχή',
  symbols: 'Δες τα σύμβολα',
  hideSymbols: 'Κρύψε τα σύμβολα',
  seeSide: 'Κοίτα μία πλευρά',
  seeWhole: 'Κοίτα όλο το τετράγωνο',
  practiceSeparate: 'Δοκίμασε μια ξεχωριστή εξάσκηση',
  splitDescription:
    '{left} στο πρώτο μέρος και {right} στο δεύτερο κάνουν {total} όλα μαζί.',
  arrayDescription:
    '{rows} σειρές με {columns} τετραγωνάκια σε κάθε σειρά. {total} πλακάκια όλα μαζί.',
  groupsDescription: '{groups} ίσες ομάδες, καθεμία με {each} πλακάκια.',
  sharingDescription: '{total} πλακάκια για ίσο μοίρασμα σε {groups} ομάδες.',
  squareDescription:
    'Ένα τετράγωνο από {total} ίσα πλακάκια. Βρες πόσα έχει μία πλευρά.',
  squareAreaDescription:
    'Ένα τετράγωνο καλύπτει {total} τετραγωνικές μονάδες. Βρες πόσες μονάδες μήκους χωρούν σε μία πλευρά.',
  squareSideDescription:
    'Τετράγωνο από {total} πλακάκια έχει {side} σε κάθε πλευρά. Η κύρια τετραγωνική ρίζα είναι {side}.',
  tenDescription:
    'Μια δεκάδα θέσεων με {first} πλακάκια. Το δεύτερο μέρος έχει {second} πλακάκια.',
  missingDescription:
    'Το όλο είναι {total}. Το ένα μέρος είναι {known}. Βρες το άλλο.',
  preservedTotal:
    'Όταν μεταφέρεις ένα πλακάκι ανάμεσα στα μέρη, το όλο μένει ίδιο.',
  sameTotal:
    'Το γύρισμα αλλάζει τις σειρές με τις στήλες. Το σύνολο μένει ίδιο.',
  equalUnits:
    'Κάθε πλακάκι είναι μία τετραγωνική μονάδα. Η άκρη μετρά μήκος. Η επιφάνεια μετρά εμβαδόν.',
  tenAndRest:
    'Μια γεμάτη δεκάδα και όσα περισσεύουν είναι ένας ακόμη τρόπος να δεις το όλο.',
};

const german: GrowingWorldCopy = {
  oneSquareUnit: 'Eine Flächeneinheit',
  legacyCapacity:
    'Diese vertraute Übung hat ihre jetzige Grenze erreicht. Spiele weiter oder wähle eine neue Entdeckung.',
  chooseGuidedPractice: 'Übungen für neue Vorschläge nutzen',
  guidedPractice: 'Übungen geben Vorschläge · einfach spielen wählen',
  chapterTitle: 'Eine Welt voller Verbindungen',
  chapterIntro:
    'Bilde ein Ganzes. Baue gleiche Gruppen. Entdecke ihre Verbindungen.',
  journey: 'Wähle deine nächste Entdeckung',
  chooseDiscovery: 'Wähle eine Entdeckung',
  closeDiscoveries: 'Zurück zur Aufgabe',
  experimentalNotice:
    'Üben hilft uns, Entdeckungen vorzuschlagen. Du kannst immer etwas anderes wählen.',
  familiarTitle: 'Zu etwas Vertrautem zurückkehren',
  chapterEnd:
    'Hier endet das aktuelle Kapitel. Kehre zurück, probiere eine andere Darstellung oder entdecke frei.',
  capacityReached:
    'Dieser synthetische Verlauf ist voll. Spielen ohne Wertung und Entdecken bleiben möglich.',
  readyLabel: 'Auf verschiedene Arten selbstständig versucht',
  practiceLabel: 'Mit Übung und Hilfe versuchen',
  invitation: 'Ein Vorschlag für dich',
  tryInvitation: 'Ausprobieren',
  familiar: 'Etwas Vertrautes',
  exploreAhead: 'Weiter entdecken',
  chapterEdge:
    'Du bist am Rand dieses Kapitels angekommen. Probiere eine andere Darstellung, kehre zurück oder entdecke frei.',
  boundary:
    'Hier entdecken wir Teile bis 20, Anordnungen bis 5 mal 5 und Quadratseiten bis 6. Dahinter gibt es noch mehr Mathematik.',
  experimental:
    'Synthetisches Kapitel · experimentelle Vorschläge · keine Aussage zur pädagogischen Wirksamkeit',
  reasons: {
    ready:
      'Du hast es auf verschiedene Arten gezeigt. Probiere eine verbundene Idee.',
    support: 'Schauen wir es anders an. Hilfe und vertraute Aufgaben sind da.',
    insufficient:
      'Wir wissen es noch nicht. Du kannst es versuchen, Hilfe holen oder entdecken.',
    familiar: 'Eine vertraute Idee, zu der du jederzeit zurückkehren kannst.',
    connection:
      'Diese Ideen sind verbunden. Die eine zu entdecken beweist nicht die andere.',
    edge: 'Hinter diesem Kapitel gibt es noch mehr zu entdecken.',
    connectedReadiness:
      'Du hast eine verbundene Idee selbstständig versucht. Probiere diese, wenn du möchtest.',
    chooseFreely:
      'Wir entdecken noch, was du weißt. Du kannst es versuchen, Hilfe holen oder entdecken.',
  },
  familyLabels: {
    'number.make-ten': 'Eine Zehn bilden',
    'number.part-whole': 'Den fehlenden Teil finden',
    'groups.equal': 'Gleiche Gruppen bilden',
    'groups.missing': 'In gleiche Gruppen verteilen',
    'measurement.array-area': 'Mit Flächeneinheiten messen',
    'powers.square-side': 'Vom Quadrat zu seiner Seite',
  },
  prompts: {
    makeTen: 'Wie viele können die Zehn auffüllen?',
    missingPart: 'Welcher Teil fehlt?',
    equalGroups: 'Wie viele sind in allen gleichen Gruppen zusammen?',
    missingGroup: 'Wie viele gehören in jede gleiche Gruppe?',
    arrayArea: 'Wie viele Quadratplättchen bedecken das Rechteck?',
    squareSide: 'Wie viele Plättchen liegen an einer Seite des Quadrats?',
  },
  help: {
    makeTen: [
      'Schau auf die leeren Plätze im Zehnerfeld.',
      'Lege ein Plättchen aus dem zweiten Teil auf jeden leeren Platz.',
      'Hier ist ein gelöstes Beispiel. Diese Plättchen füllen die Zehn auf.',
    ],
    missingPart: [
      'Die beiden Teile bilden das Ganze.',
      'Behalte den bekannten Teil. Was fehlt noch?',
      'Hier ist das Ganze in seine beiden Teile zerlegt.',
    ],
    equalGroups: [
      'Jede Gruppe hat gleich viele.',
      'Ordne die Gruppen in Reihen. Jede Reihe ist eine Gruppe.',
      'Hier ist ein gelöstes Beispiel. Füge eine gleiche Reihe nach der anderen hinzu.',
    ],
    missingGroup: [
      'In jeder Gruppe sollen gleich viele sein.',
      'Gib jeder Gruppe ein Plättchen und wiederhole es.',
      'Hier ist ein gelöstes Beispiel mit gleich vielen in jeder Gruppe.',
    ],
    arrayArea: [
      'Ein Plättchen ist eine Flächeneinheit.',
      'Zähle gleiche Reihen. Lasse keine Lücken und lege nichts übereinander.',
      'Hier ist ein gelöstes Beispiel. Die Reihen bedecken das ganze Rechteck.',
    ],
    squareSide: [
      'Ein Quadrat hat gleich lange Seiten.',
      'Folge nur der obersten Reihe von einem Ende zum anderen.',
      'Hier ist ein gelöstes Beispiel. Die oberste Reihe zeigt die Seitenlänge.',
    ],
  },
  helpButton: 'Zeig es mir',
  worked: 'Gelöstes Beispiel · Lernen mit Hilfe',
  again: 'Die Bilder noch einmal zeigen',
  answers: 'Wähle eine Karte',
  success: 'Ja, du hast es gefunden!',
  retry: 'Versuche es noch einmal',
  unavailable: 'Diese Aufgabe kann nicht öffnen. Wähle eine andere Entdeckung.',
  connection: 'Verbundene Entdeckungen',
  left: 'Erster Teil',
  right: 'Zweiter Teil',
  total: 'Ganzes',
  group: 'Gleiche Gruppe',
  empty: 'Leer',
  tile: 'Plättchen',
  unit: 'Flächeneinheiten',
  side: 'Eine Seite',
  rows: 'Reihen',
  columns: 'Plättchen in jeder Reihe',
  square: 'Ein Quadrat: gleich viele Reihen und Spalten',
  rectangle: 'Ein Rechteck aus gleichen Quadratplättchen',
  partsWorkshop: 'Verbinden und zerlegen',
  arrayWorkshop: 'Gruppen, Einheiten und Quadrate',
  exploreTitle: 'Was passiert, wenn …?',
  exploreIntro:
    'Verändere etwas und beobachte die Verbindung. Hier musst du keine Fragen bestehen.',
  unassessed: 'Nur entdecken. Hier zählt nichts zum Lernfortschritt.',
  add: 'Ein Plättchen hinzufügen',
  remove: 'Ein Plättchen wegnehmen',
  moveLeft: 'Eines zum ersten Teil bewegen',
  moveRight: 'Eines zum zweiten Teil bewegen',
  addRow: 'Eine Reihe hinzufügen',
  removeRow: 'Eine Reihe wegnehmen',
  addColumn: 'Zu jeder Reihe eines hinzufügen',
  removeColumn: 'Aus jeder Reihe eines wegnehmen',
  turn: 'Die Anordnung drehen',
  makeSquare: 'Gleiche Seiten bilden',
  undo: 'Rückgängig',
  reset: 'Neu beginnen',
  symbols: 'Die Zeichen ansehen',
  hideSymbols: 'Die Zeichen ausblenden',
  seeSide: 'Eine Seite ansehen',
  seeWhole: 'Das ganze Quadrat ansehen',
  practiceSeparate: 'Eine getrennte Übungsaufgabe versuchen',
  splitDescription:
    '{left} im ersten Teil und {right} im zweiten Teil sind zusammen {total}.',
  arrayDescription:
    '{rows} Reihen mit je {columns} Quadratplättchen. Zusammen {total} Plättchen.',
  groupsDescription: '{groups} gleiche Gruppen mit je {each} Plättchen.',
  sharingDescription:
    '{total} Plättchen werden gleichmäßig auf {groups} Gruppen verteilt.',
  squareDescription:
    'Ein Quadrat aus {total} gleichen Plättchen. Finde die Anzahl an einer Seite.',
  squareAreaDescription:
    'Ein Quadrat bedeckt {total} Flächeneinheiten. Finde, wie viele Längeneinheiten an eine Seite passen.',
  squareSideDescription:
    'Ein Quadrat aus {total} Plättchen hat {side} an jeder Seite. Der Hauptwert der Quadratwurzel ist {side}.',
  tenDescription:
    'Ein Feld mit zehn Plätzen und {first} Plättchen. Ein zweiter Teil hat {second} Plättchen.',
  missingDescription:
    'Das Ganze ist {total}. Ein Teil ist {known}. Finde den anderen.',
  preservedTotal:
    'Ein Plättchen zwischen den Teilen zu bewegen lässt das Ganze gleich.',
  sameTotal:
    'Beim Drehen tauschen Reihen und Spalten. Die Gesamtzahl bleibt gleich.',
  equalUnits:
    'Jedes Plättchen ist eine Flächeneinheit. Eine Kante misst Länge, die ganze Oberfläche misst Fläche.',
  tenAndRest:
    'Eine volle Zehn und die übrigen Plättchen zeigen das Ganze auf eine andere Art.',
};

// Fixed speech validation shares these phrases. Runtime readonly typing alone
// cannot prevent a caller from replacing the permitted catalogue wording.
function freezeCopy(value: object): void {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object')
      freezeCopy(child as object);
  }
  Object.freeze(value);
}
for (const copy of [english, greek, german]) freezeCopy(copy);

export function getGrowingWorldCopy(locale: Locale): GrowingWorldCopy {
  const effective = resolvePrototypeLocale(locale).effectiveLocale;
  return effective === 'en-GB'
    ? english
    : effective === 'de-DE'
      ? german
      : greek;
}

export function growingWorldText(
  template: string,
  values: Readonly<Record<string, number>>,
): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}
