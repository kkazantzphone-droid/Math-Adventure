import { isLocale, resolvePrototypeLocale } from './locales';
import type { Locale } from './locales';
import { REQUIRED_MESSAGE_IDS, SIMPLE_MESSAGE_IDS } from './messages';
import type {
  MessageArguments,
  MessageId,
  NumberTemplate,
  PrototypeCopy,
  PrototypeMessages,
} from './messages';
import { prototypePacks } from './packs';

const pluralCategories: readonly Intl.LDMLPluralRule[] = [
  'zero',
  'one',
  'two',
  'few',
  'many',
  'other',
];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function literalText(value: unknown): value is string {
  return typeof value === 'string' && !/[<>]/u.test(value);
}

function numberTemplate(value: unknown): value is NumberTemplate {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (part: unknown) =>
        literalText(part) ||
        (record(part) &&
          Object.keys(part).length === 1 &&
          part.number === 'count'),
    )
  );
}

export interface PackValidation {
  readonly valid: boolean;
  readonly missing: readonly MessageId[];
  readonly malformed: readonly MessageId[];
  readonly unexpected: readonly string[];
}

/** Validate every required key before use; fallback never hides an incomplete draft. */
export function validatePrototypeMessages(value: unknown): PackValidation {
  const candidate = record(value) ? value : {};
  const missing = REQUIRED_MESSAGE_IDS.filter(
    (id) => !Object.hasOwn(candidate, id),
  );
  const malformed: MessageId[] = SIMPLE_MESSAGE_IDS.filter(
    (id) =>
      Object.hasOwn(candidate, id) &&
      (!literalText(candidate[id]) ||
        (candidate[id] === '' && id !== 'guide.root')),
  );
  const plural = candidate['tiles.count'];
  if (
    Object.hasOwn(candidate, 'tiles.count') &&
    (!record(plural) ||
      Object.keys(plural).length !== 3 ||
      plural.kind !== 'plural' ||
      plural.argument !== 'count' ||
      !record(plural.cases) ||
      !Object.hasOwn(plural.cases, 'other') ||
      !Object.entries(plural.cases).every(
        ([category, template]) =>
          pluralCategories.some((known) => known === category) &&
          numberTemplate(template),
      ))
  )
    malformed.push('tiles.count');
  const select = candidate['badge.description'];
  if (
    Object.hasOwn(candidate, 'badge.description') &&
    (!record(select) ||
      Object.keys(select).length !== 3 ||
      select.kind !== 'select' ||
      select.argument !== 'badge' ||
      !record(select.cases) ||
      Object.keys(select.cases).length !== 2 ||
      !literalText(select.cases.star) ||
      !literalText(select.cases.triangle) ||
      select.cases.star === '' ||
      select.cases.triangle === '')
  )
    malformed.push('badge.description');
  const unexpected = Object.keys(candidate).filter(
    (id) => !REQUIRED_MESSAGE_IDS.some((known) => known === id),
  );
  return {
    valid:
      missing.length === 0 && malformed.length === 0 && unexpected.length === 0,
    missing,
    malformed,
    unexpected,
  };
}

/** Formatting is presentation only. No parsing, grouping or approximate math. */
export function formatInteger(locale: Locale, value: number): string {
  if (!isLocale(locale)) throw new RangeError('unsupported-locale');
  if (!Number.isSafeInteger(value)) throw new RangeError('unsupported-integer');
  return new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Structured schema deliberately supports only this catalogue's plural/select variables. */
export function formatMessage<Id extends MessageId>(
  locale: Locale,
  id: Id,
  ...arguments_: MessageArguments<Id> extends undefined
    ? []
    : [MessageArguments<Id>]
): string {
  const effective = resolvePrototypeLocale(locale).effectiveLocale;
  const messages = prototypePacks[effective];
  if (!validatePrototypeMessages(messages).valid)
    throw new RangeError('incomplete-prototype-pack');
  if (!Object.hasOwn(messages, id)) throw new RangeError('missing-message');
  if (id === 'tiles.count') {
    const argument: unknown = arguments_[0];
    if (
      !record(argument) ||
      typeof argument.count !== 'number' ||
      !Number.isSafeInteger(argument.count) ||
      argument.count < 0 ||
      Object.keys(argument).length !== 1
    )
      throw new RangeError('invalid-message-arguments');
    const count = argument.count;
    const plural = messages['tiles.count'];
    const category = new Intl.PluralRules(effective).select(count);
    const template = plural.cases[category] ?? plural.cases.other;
    return template
      .map((part) =>
        typeof part === 'string' ? part : formatInteger(effective, count),
      )
      .join('');
  }
  if (id === 'badge.description') {
    const argument: unknown = arguments_[0];
    if (
      !record(argument) ||
      Object.keys(argument).length !== 1 ||
      (argument.badge !== 'star' && argument.badge !== 'triangle')
    )
      throw new RangeError('invalid-message-arguments');
    return messages['badge.description'].cases[argument.badge];
  }
  if (arguments_.length !== 0)
    throw new RangeError('invalid-message-arguments');
  const message = messages[id];
  if (typeof message !== 'string') throw new RangeError('invalid-message');
  return message;
}

/** Existing view shape, sourced exclusively from the required typed message catalogue. */
export function getPrototypeCopy(locale: Locale): PrototypeCopy {
  const effective = resolvePrototypeLocale(locale).effectiveLocale;
  const messages: PrototypeMessages = prototypePacks[effective];
  if (!validatePrototypeMessages(messages).valid)
    throw new RangeError('incomplete-prototype-pack');
  return {
    locale: effective,
    badgesHeading: messages.badgesHeading,
    badgesIntro: messages.badgesIntro,
    star: messages.star,
    triangle: messages.triangle,
    selectedBadge: messages.selectedBadge,
    homeHeading: messages.homeHeading,
    homeIntro: messages.homeIntro,
    play: messages.play,
    shapes: messages.shapes,
    explore: messages.explore,
    numberHeading: messages.numberHeading,
    numberPrompt: messages.numberPrompt,
    shapePrompt: messages.shapePrompt,
    shapeReference: messages.shapeReference,
    targetDescription: messages.targetDescription,
    shapeChoices: [
      messages['shapeChoice.triangle'],
      messages['shapeChoice.square'],
      messages['shapeChoice.rectangle'],
    ],
    showMe: messages.showMe,
    numberHint: messages.numberHint,
    shapeHint: messages.shapeHint,
    retry: messages.retry,
    success: messages.success,
    continue: messages.continue,
    home: messages.home,
    back: messages.back,
    exploreIntro: messages.exploreIntro,
    arrayDescription: messages.arrayDescription,
    arrayLabel: formatMessage(effective, 'tiles.count', { count: 16 }),
    rootArrayLabel: messages.rootArrayLabel,
    rootNotation: messages.rootNotation,
    representations: [
      messages['representation.multiply'],
      messages['representation.square'],
      messages['representation.root'],
    ],
    representationCaptions: [
      messages['caption.multiply'],
      messages['caption.square'],
      messages['caption.root'],
    ],
    exploreGuides: {
      multiply: messages['guide.multiply'],
      square: messages['guide.square'],
      root: messages['guide.root'],
    },
    prototypeNote: messages.prototypeNote,
    listen: messages.listen,
    mute: messages.mute,
  };
}
