import {
  isLocale,
  isPrototypeLocale,
  type Locale,
  type PrototypeLocale,
} from '../localisation/locales';

export const speechKinds = [
  'childInstructions',
  'numberPrompt',
  'numberHint',
  'shapePrompt',
  'shapeHint',
  'positiveFeedback',
  'multiply',
  'square',
  'root',
  'cardinalTwo',
  'cardinalThree',
  'cardinalFour',
  'cardinalFive',
  'cardinalSix',
  'cardinalSixteen',
] as const;

export type SpeechKind = (typeof speechKinds)[number];

export interface UtteranceSegment {
  readonly locale: Locale;
  readonly text: string;
}

export interface UtterancePlan {
  readonly kind: SpeechKind;
  readonly locale: Locale;
  readonly segments: readonly UtteranceSegment[];
}

/** Fixed synthetic prototype phrases only. All three are drafts pending native review.
 * This catalogue describes visible relationships; it never evaluates mathematics.
 */
const phrases: Readonly<
  Record<PrototypeLocale, Readonly<Record<SpeechKind, string>>>
> = {
  'el-GR': {
    childInstructions: 'Διάλεξε και ξεκίνα.',
    numberPrompt: 'Τρία συν δύο. Διάλεξε έναν αριθμό.',
    numberHint: 'Τρία μαζί με δύο.',
    shapePrompt: 'Βρες το ίδιο σχήμα.',
    shapeHint: 'Κοίτα τις τέσσερις ίσες πλευρές. Βρες ένα σχήμα σαν αυτό.',
    positiveFeedback: 'Το βρήκες!',
    multiply: 'Τέσσερα επί τέσσερα ίσον δεκαέξι.',
    square: 'Τέσσερα στο τετράγωνο ίσον δεκαέξι.',
    root: 'Δεκαέξι πλακάκια σε τετράγωνο. Τέσσερα σε κάθε πλευρά. Η κύρια τετραγωνική ρίζα του δεκαέξι είναι τέσσερα.',
    cardinalTwo: 'Δύο.',
    cardinalThree: 'Τρία.',
    cardinalFour: 'Τέσσερα.',
    cardinalFive: 'Πέντε.',
    cardinalSix: 'Έξι.',
    cardinalSixteen: 'Δεκαέξι.',
  },
  'en-GB': {
    childInstructions: 'Choose and begin.',
    numberPrompt: 'Three plus two. Choose a number.',
    numberHint: 'Three together with two.',
    shapePrompt: 'Find the same shape.',
    shapeHint: 'Look at the four equal sides. Find a shape like this one.',
    positiveFeedback: 'You found it!',
    multiply: 'Four times four equals sixteen.',
    square: 'Four squared equals sixteen.',
    root: 'Sixteen tiles in a square. Four on each side. The principal square root of sixteen is four.',
    cardinalTwo: 'Two.',
    cardinalThree: 'Three.',
    cardinalFour: 'Four.',
    cardinalFive: 'Five.',
    cardinalSix: 'Six.',
    cardinalSixteen: 'Sixteen.',
  },
  'de-DE': {
    childInstructions: 'Wähle und beginne.',
    numberPrompt: 'Drei plus zwei. Wähle eine Zahl.',
    numberHint: 'Drei zusammen mit zwei.',
    shapePrompt: 'Finde die gleiche Form.',
    shapeHint:
      'Schau dir die vier gleich langen Seiten an. Finde eine Form wie diese.',
    positiveFeedback: 'Du hast es gefunden!',
    multiply: 'Vier mal vier ist sechzehn.',
    square: 'Vier zum Quadrat ist sechzehn.',
    root: 'Sechzehn Plättchen in einem Quadrat. Vier auf jeder Seite. Der Hauptwert der Quadratwurzel von sechzehn ist vier.',
    cardinalTwo: 'Zwei.',
    cardinalThree: 'Drei.',
    cardinalFour: 'Vier.',
    cardinalFive: 'Fünf.',
    cardinalSix: 'Sechs.',
    cardinalSixteen: 'Sechzehn.',
  },
};

export function buildUtterancePlan(
  kind: SpeechKind,
  locale: Locale,
): UtterancePlan | null {
  if (!isPrototypeLocale(locale) || !speechKinds.includes(kind)) return null;
  return Object.freeze({
    kind,
    locale,
    segments: Object.freeze([
      Object.freeze({ locale, text: phrases[locale][kind] }),
    ]),
  });
}

function dataObject(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const actual = Reflect.ownKeys(value);
  return (
    actual.length === keys.length &&
    keys.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor !== undefined && 'value' in descriptor;
    })
  );
}

/** Reject arbitrary text, extra personal fields and accessor/class payloads at the port boundary. */
export function isCatalogueUtterancePlan(
  value: unknown,
): value is UtterancePlan {
  try {
    if (!dataObject(value, ['kind', 'locale', 'segments'])) return false;
    if (!isLocale(value.locale) || !isPrototypeLocale(value.locale))
      return false;
    if (
      typeof value.kind !== 'string' ||
      !speechKinds.some((kind) => kind === value.kind)
    )
      return false;
    if (
      !Array.isArray(value.segments) ||
      value.segments.length !== 1 ||
      Reflect.ownKeys(value.segments).length !== 2
    )
      return false;
    const item = Object.getOwnPropertyDescriptor(value.segments, '0');
    if (item === undefined || !('value' in item)) return false;
    const segment: unknown = item.value;
    return (
      dataObject(segment, ['locale', 'text']) &&
      segment.locale === value.locale &&
      segment.text === phrases[value.locale][value.kind as SpeechKind]
    );
  } catch {
    return false;
  }
}
