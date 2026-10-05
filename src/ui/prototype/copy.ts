import type { PrototypeRepresentation } from './fixtures';
import type { PrototypeLanguage } from './options';

/** Tiny, incomplete prototype-only copy. Not an official pack or Phase 1D localisation. */
export interface PrototypeCopy {
  readonly locale: 'el-GR' | 'en-GB';
  readonly badgesHeading: string;
  readonly badgesIntro: string;
  readonly star: string;
  readonly triangle: string;
  readonly selectedBadge: string;
  readonly homeHeading: string;
  readonly homeIntro: string;
  readonly play: string;
  readonly shapes: string;
  readonly explore: string;
  readonly numberHeading: string;
  readonly numberPrompt: string;
  readonly shapePrompt: string;
  readonly shapeReference: string;
  readonly targetDescription: string;
  readonly shapeChoices: readonly [string, string, string];
  readonly showMe: string;
  readonly numberHint: string;
  readonly shapeHint: string;
  readonly retry: string;
  readonly success: string;
  readonly continue: string;
  readonly home: string;
  readonly back: string;
  readonly exploreIntro: string;
  readonly arrayDescription: string;
  readonly arrayLabel: string;
  readonly rootArrayLabel: string;
  readonly rootNotation: string;
  readonly representations: readonly [string, string, string];
  readonly representationCaptions: readonly [string, string, string];
  readonly exploreGuides: Readonly<Record<PrototypeRepresentation, string>>;
  readonly prototypeNote: string;
}

export const prototypeCopy: Readonly<Record<PrototypeLanguage, PrototypeCopy>> =
  {
    el: {
      locale: 'el-GR',
      badgesHeading: 'Διάλεξε το σήμα σου',
      badgesIntro: 'Με ποιο θα παίξεις;',
      star: 'Αστέρι',
      triangle: 'Τρίγωνο',
      selectedBadge: 'Το σήμα σου',
      homeHeading: 'Τι θέλεις να δοκιμάσεις;',
      homeIntro: 'Διάλεξε και ξεκίνα',
      play: 'Παίξε',
      shapes: 'Σχήματα',
      explore: 'Εξερεύνησε',
      numberHeading: 'Βρες τον αριθμό',
      numberPrompt: 'Τρία συν δύο. Διάλεξε έναν αριθμό.',
      shapePrompt: 'Βρες το ίδιο σχήμα',
      shapeReference: 'Ταίριαξε αυτό',
      targetDescription:
        'Σχήμα με τέσσερις ίσες πλευρές και τέσσερις ορθές γωνίες',
      shapeChoices: [
        'Σχήμα με τρεις πλευρές',
        'Σχήμα με τέσσερις ίσες πλευρές και τέσσερις ορθές γωνίες',
        'Σχήμα με τέσσερις ορθές γωνίες, δύο μακριές και δύο κοντές πλευρές',
      ],
      showMe: 'Δείξε μου',
      numberHint: 'Τρία μαζί με δύο',
      shapeHint: 'Κοίτα τις τέσσερις ίσες πλευρές. Βρες ένα σχήμα σαν αυτό.',
      retry: 'Δοκίμασε άλλη ιδέα',
      success: 'Το βρήκες!',
      continue: 'Συνέχισε',
      home: 'Αρχική',
      back: 'Πίσω',
      exploreIntro: 'Ξεκίνα με τα πλακάκια. Πάτησε κάθε βήμα και εξερεύνησε.',
      arrayLabel: '16 πλακάκια',
      rootArrayLabel: '16 πλακάκια σε τετράγωνο',
      rootNotation: 'Κύρια τετραγωνική ρίζα του δεκαέξι ίσον τέσσερα',
      arrayDescription:
        'Τέσσερις σειρές με τέσσερα τετραγωνάκια η καθεμία. Δεκαέξι τετραγωνάκια.',
      representations: [
        'Τέσσερα επί τέσσερα ίσον δεκαέξι',
        'Τέσσερα στο τετράγωνο ίσον δεκαέξι',
        '16 πλακάκια σε τετράγωνο',
      ],
      representationCaptions: [
        '4 σειρές, 4 σε κάθε σειρά',
        '4 σε κάθε πλευρά',
        '4 σε κάθε πλευρά',
      ],
      exploreGuides: {
        multiply:
          'Τέσσερις σειρές με τέσσερα πλακάκια σε κάθε σειρά: δεκαέξι πλακάκια.',
        square:
          'Τέσσερα πλακάκια σε κάθε πλευρά του τετραγώνου. Μέσα είναι και τα δεκαέξι.',
        root: '',
      },
      prototypeNote: 'Πρωτότυπο — η πρόοδος δεν αποθηκεύεται',
    },
    en: {
      locale: 'en-GB',
      badgesHeading: 'Choose your badge',
      badgesIntro: 'Which one will you play with?',
      star: 'Star',
      triangle: 'Triangle',
      selectedBadge: 'Your badge',
      homeHeading: 'What would you like to try?',
      homeIntro: 'Choose and begin',
      play: 'Play',
      shapes: 'Shapes',
      explore: 'Explore',
      numberHeading: 'Find the number',
      numberPrompt: 'Three plus two. Choose a number.',
      shapePrompt: 'Find the same shape',
      shapeReference: 'Match this',
      targetDescription: 'Shape with four equal sides and four right angles',
      shapeChoices: [
        'Shape with three sides',
        'Shape with four equal sides and four right angles',
        'Shape with four right angles, two long sides and two short sides',
      ],
      showMe: 'Show me',
      numberHint: 'Three together with two',
      shapeHint: 'Look at the four equal sides. Find a shape like this one.',
      retry: 'Try another idea',
      success: 'You found it!',
      continue: 'Continue',
      home: 'Home',
      back: 'Back',
      exploreIntro: 'Start with the tiles. Tap each step and explore.',
      arrayLabel: '16 tiles',
      rootArrayLabel: '16 tiles in a square',
      rootNotation: 'Principal square root of sixteen equals four',
      arrayDescription:
        'Four rows of four little squares. Sixteen little squares.',
      representations: [
        'Four times four equals sixteen',
        'Four squared equals sixteen',
        '16 tiles in a square',
      ],
      representationCaptions: [
        '4 rows, 4 in each row',
        '4 along each side',
        '4 on each side',
      ],
      exploreGuides: {
        multiply: 'Four rows with four tiles in each row: sixteen tiles.',
        square:
          'Four tiles along each side of the square. All sixteen tiles are inside.',
        root: '',
      },
      prototypeNote: 'Prototype — progress is not saved',
    },
  };
