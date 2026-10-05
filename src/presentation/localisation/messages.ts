import type { Locale, PrototypeLocale } from './locales';

/** Stable, bounded schema for the current scripted prototype, not a V1 catalogue. */
export const SIMPLE_MESSAGE_IDS = [
  'badgesHeading',
  'badgesIntro',
  'star',
  'triangle',
  'selectedBadge',
  'homeHeading',
  'homeIntro',
  'play',
  'shapes',
  'explore',
  'numberHeading',
  'numberPrompt',
  'shapePrompt',
  'shapeReference',
  'targetDescription',
  'shapeChoice.triangle',
  'shapeChoice.square',
  'shapeChoice.rectangle',
  'showMe',
  'numberHint',
  'shapeHint',
  'retry',
  'success',
  'continue',
  'home',
  'back',
  'exploreIntro',
  'arrayDescription',
  'arrayLabel',
  'rootArrayLabel',
  'rootNotation',
  'representation.multiply',
  'representation.square',
  'representation.root',
  'caption.multiply',
  'caption.square',
  'caption.root',
  'guide.multiply',
  'guide.square',
  'guide.root',
  'prototypeNote',
  'listen',
  'mute',
] as const;

export type SimpleMessageId = (typeof SIMPLE_MESSAGE_IDS)[number];
export type MessageId = SimpleMessageId | 'tiles.count' | 'badge.description';
export const REQUIRED_MESSAGE_IDS: readonly MessageId[] = [
  ...SIMPLE_MESSAGE_IDS,
  'tiles.count',
  'badge.description',
];

/** Literal segments and a single typed number slot; never HTML or executable text. */
export type NumberTemplate = readonly (string | { readonly number: 'count' })[];
export interface PluralMessage {
  readonly kind: 'plural';
  readonly argument: 'count';
  readonly cases: Readonly<
    Partial<Record<Intl.LDMLPluralRule, NumberTemplate>> & {
      other: NumberTemplate;
    }
  >;
}
export interface SelectMessage {
  readonly kind: 'select';
  readonly argument: 'badge';
  readonly cases: Readonly<Record<'star' | 'triangle', string>>;
}

export type PrototypeMessages = Readonly<
  Record<SimpleMessageId, string> & {
    'tiles.count': PluralMessage;
    'badge.description': SelectMessage;
  }
>;

export type MessageArguments<Id extends MessageId> = Id extends 'tiles.count'
  ? { readonly count: number }
  : Id extends 'badge.description'
    ? { readonly badge: 'star' | 'triangle' }
    : undefined;

export interface PackManifest {
  readonly locale: Locale;
  readonly packVersion: '0.1.0-prototype' | null;
  readonly messageSchemaVersion: 'prototype-messages-v1';
  readonly contentVersion: 'scripted-prototype-v1';
  readonly status: 'draft' | 'planned';
  readonly completeness: 'complete-prototype' | 'incomplete';
  readonly reviewStatus: 'native-review-pending';
  readonly reviewers: readonly string[];
  readonly official: false;
  readonly direction: 'ltr';
}

/** Keep old view fields as a compatibility facade, populated by stable message IDs. */
export interface PrototypeCopy {
  readonly locale: PrototypeLocale;
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
  readonly exploreGuides: Readonly<
    Record<'multiply' | 'square' | 'root', string>
  >;
  readonly prototypeNote: string;
  readonly listen: string;
  readonly mute: string;
}
