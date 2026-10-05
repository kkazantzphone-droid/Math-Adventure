import { isPrototypeLocale } from './locales';
import type { Locale, PrototypeLocale } from './locales';
import type { PackManifest, PrototypeMessages } from './messages';

/** Complete only for the current prototype; every locale is native-review pending. */
export const prototypePacks: Readonly<
  Record<PrototypeLocale, PrototypeMessages>
> = {
  'el-GR': {
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
    prototypeNote: 'Πρωτότυπο — η πρόοδος δεν αποθηκεύεται',
    listen: 'Άκου',
    mute: 'Σταμάτα τη φωνή',
    'shapeChoice.triangle': 'Σχήμα με τρεις πλευρές',
    'shapeChoice.square':
      'Σχήμα με τέσσερις ίσες πλευρές και τέσσερις ορθές γωνίες',
    'shapeChoice.rectangle':
      'Σχήμα με τέσσερις ορθές γωνίες, δύο μακριές και δύο κοντές πλευρές',
    'representation.multiply': 'Τέσσερα επί τέσσερα ίσον δεκαέξι',
    'caption.multiply': '4 σειρές, 4 σε κάθε σειρά',
    'guide.multiply':
      'Τέσσερις σειρές με τέσσερα πλακάκια σε κάθε σειρά: δεκαέξι πλακάκια.',
    'representation.square': 'Τέσσερα στο τετράγωνο ίσον δεκαέξι',
    'caption.square': '4 σε κάθε πλευρά',
    'guide.square':
      'Τέσσερα πλακάκια σε κάθε πλευρά του τετραγώνου. Μέσα είναι και τα δεκαέξι.',
    'representation.root': '16 πλακάκια σε τετράγωνο',
    'caption.root': '4 σε κάθε πλευρά',
    'guide.root': '',
    'tiles.count': {
      kind: 'plural',
      argument: 'count',
      cases: {
        one: [
          {
            number: 'count',
          },
          ' πλακάκι',
        ],
        other: [
          {
            number: 'count',
          },
          ' πλακάκια',
        ],
      },
    },
    'badge.description': {
      kind: 'select',
      argument: 'badge',
      cases: {
        star: 'Το σήμα σου: Αστέρι',
        triangle: 'Το σήμα σου: Τρίγωνο',
      },
    },
  },
  'en-GB': {
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
    prototypeNote: 'Prototype — progress is not saved',
    listen: 'Listen',
    mute: 'Stop speech',
    'shapeChoice.triangle': 'Shape with three sides',
    'shapeChoice.square': 'Shape with four equal sides and four right angles',
    'shapeChoice.rectangle':
      'Shape with four right angles, two long sides and two short sides',
    'representation.multiply': 'Four times four equals sixteen',
    'caption.multiply': '4 rows, 4 in each row',
    'guide.multiply': 'Four rows with four tiles in each row: sixteen tiles.',
    'representation.square': 'Four squared equals sixteen',
    'caption.square': '4 along each side',
    'guide.square':
      'Four tiles along each side of the square. All sixteen tiles are inside.',
    'representation.root': '16 tiles in a square',
    'caption.root': '4 on each side',
    'guide.root': '',
    'tiles.count': {
      kind: 'plural',
      argument: 'count',
      cases: {
        one: [
          {
            number: 'count',
          },
          ' tile',
        ],
        other: [
          {
            number: 'count',
          },
          ' tiles',
        ],
      },
    },
    'badge.description': {
      kind: 'select',
      argument: 'badge',
      cases: {
        star: 'Your badge: Star',
        triangle: 'Your badge: Triangle',
      },
    },
  },
  'de-DE': {
    badgesHeading: 'Wähle dein Zeichen',
    badgesIntro: 'Mit welchem möchtest du spielen?',
    star: 'Stern',
    triangle: 'Dreieck',
    selectedBadge: 'Dein Zeichen',
    homeHeading: 'Was möchtest du ausprobieren?',
    homeIntro: 'Wähle und leg los',
    play: 'Spielen',
    shapes: 'Formen',
    explore: 'Entdecken',
    numberHeading: 'Finde die Zahl',
    numberPrompt: 'Drei plus zwei. Wähle eine Zahl.',
    shapePrompt: 'Finde die gleiche Form',
    shapeReference: 'Finde diese Form',
    targetDescription:
      'Form mit vier gleich langen Seiten und vier rechten Winkeln',
    showMe: 'Zeig es mir',
    numberHint: 'Drei zusammen mit zwei',
    shapeHint:
      'Schau auf die vier gleich langen Seiten. Finde eine Form wie diese.',
    retry: 'Probiere eine andere Idee',
    success: 'Du hast es gefunden!',
    continue: 'Weiter',
    home: 'Start',
    back: 'Zurück',
    exploreIntro:
      'Beginne mit den Plättchen. Tippe auf die Schritte und entdecke.',
    arrayLabel: '16 Plättchen',
    rootArrayLabel: '16 Plättchen in einem Quadrat',
    rootNotation: 'Hauptwert der Quadratwurzel von sechzehn ist vier',
    arrayDescription:
      'Vier Reihen mit je vier kleinen Quadraten. Sechzehn kleine Quadrate.',
    prototypeNote: 'Prototyp — Fortschritt wird nicht gespeichert',
    listen: 'Anhören',
    mute: 'Stimme stoppen',
    'shapeChoice.triangle': 'Form mit drei Seiten',
    'shapeChoice.square':
      'Form mit vier gleich langen Seiten und vier rechten Winkeln',
    'shapeChoice.rectangle':
      'Form mit vier rechten Winkeln, zwei langen und zwei kurzen Seiten',
    'representation.multiply': 'Vier mal vier ist sechzehn',
    'caption.multiply': '4 Reihen, 4 in jeder Reihe',
    'guide.multiply': 'Vier Reihen mit je vier Plättchen: sechzehn Plättchen.',
    'representation.square': 'Vier zum Quadrat ist sechzehn',
    'caption.square': '4 an jeder Seite',
    'guide.square':
      'Vier Plättchen an jeder Seite des Quadrats. Alle sechzehn Plättchen sind darin.',
    'representation.root': '16 Plättchen in einem Quadrat',
    'caption.root': '4 an jeder Seite',
    'guide.root': '',
    'tiles.count': {
      kind: 'plural',
      argument: 'count',
      cases: {
        one: [
          {
            number: 'count',
          },
          ' Plättchen',
        ],
        other: [
          {
            number: 'count',
          },
          ' Plättchen',
        ],
      },
    },
    'badge.description': {
      kind: 'select',
      argument: 'badge',
      cases: {
        star: 'Dein Zeichen: Stern',
        triangle: 'Dein Zeichen: Dreieck',
      },
    },
  },
};

function manifest(locale: Locale): PackManifest {
  return {
    locale,
    packVersion: isPrototypeLocale(locale) ? '0.1.0-prototype' : null,
    messageSchemaVersion: 'prototype-messages-v1',
    contentVersion: 'scripted-prototype-v1',
    status: isPrototypeLocale(locale) ? 'draft' : 'planned',
    completeness: isPrototypeLocale(locale)
      ? 'complete-prototype'
      : 'incomplete',
    reviewStatus: 'native-review-pending',
    reviewers: [],
    official: false,
    direction: 'ltr',
  };
}

export const packManifests: Readonly<Record<Locale, PackManifest>> = {
  'el-GR': manifest('el-GR'),
  'en-GB': manifest('en-GB'),
  'de-DE': manifest('de-DE'),
  'fr-FR': manifest('fr-FR'),
  'es-ES': manifest('es-ES'),
  'it-IT': manifest('it-IT'),
  'pt-PT': manifest('pt-PT'),
};
