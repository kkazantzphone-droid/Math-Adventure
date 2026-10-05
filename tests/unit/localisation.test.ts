import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  PROTOTYPE_LOCALES,
  REQUIRED_MESSAGE_IDS,
  SUPPORTED_LOCALES,
  defaultLanguagePreferences,
  formatInteger,
  formatMessage,
  getPrototypeCopy,
  isLocale,
  isPrototypeLocale,
  localeForPrototypeLanguage,
  packManifests,
  parseLanguagePreferences,
  prototypeLanguageForLocale,
  prototypePacks,
  resolvePrototypeLocale,
  setLanguagePreference,
  validatePrototypeMessages,
} from '../../src/presentation/localisation';
import type {
  LanguagePreferences,
  Locale,
  MessageArguments,
} from '../../src/presentation/localisation';
import { prototypeCopy } from '../../src/ui/prototype/copy';
import { parsePrototypeLanguage } from '../../src/ui/prototype/options';

describe('exact prototype locale architecture', () => {
  it('centralises all seven accepted regional tags without generic or regional substitutes', () => {
    expect(SUPPORTED_LOCALES).toEqual([
      'el-GR',
      'en-GB',
      'de-DE',
      'fr-FR',
      'es-ES',
      'it-IT',
      'pt-PT',
    ]);
    expect(PROTOTYPE_LOCALES).toEqual(['el-GR', 'en-GB', 'de-DE']);
    for (const locale of SUPPORTED_LOCALES) expect(isLocale(locale)).toBe(true);
    for (const value of [
      'en',
      'en-US',
      'pt-BR',
      'DE-de',
      '',
      null,
      undefined,
    ]) {
      expect(isLocale(value)).toBe(false);
    }
  });

  it.each(PROTOTYPE_LOCALES)(
    '%s is a complete current-prototype draft, never an official or reviewed pack',
    (locale) => {
      expect(isPrototypeLocale(locale)).toBe(true);
      expect(packManifests[locale]).toEqual({
        locale,
        packVersion: '0.2.0-prototype',
        messageSchemaVersion: 'prototype-messages-v2',
        contentVersion: 'scripted-prototype-v1',
        status: 'draft',
        completeness: 'complete-prototype',
        reviewStatus: 'native-review-pending',
        reviewers: [],
        official: false,
        direction: 'ltr',
      });
      expect(validatePrototypeMessages(prototypePacks[locale])).toEqual({
        valid: true,
        missing: [],
        malformed: [],
        unexpected: [],
      });
      expect(Object.keys(prototypePacks[locale]).sort()).toEqual(
        [...REQUIRED_MESSAGE_IDS].sort(),
      );
      expect(resolvePrototypeLocale(locale)).toEqual({
        requestedLocale: locale,
        effectiveLocale: locale,
        reason: 'available-draft',
      });
    },
  );

  it.each(['fr-FR', 'es-ES', 'it-IT', 'pt-PT'] as const)(
    '%s remains visibly planned/incomplete without fabricated translations',
    (locale) => {
      expect(isPrototypeLocale(locale)).toBe(false);
      expect(Object.hasOwn(prototypePacks, locale)).toBe(false);
      expect(packManifests[locale]).toMatchObject({
        locale,
        packVersion: null,
        status: 'planned',
        completeness: 'incomplete',
        reviewStatus: 'native-review-pending',
        official: false,
      });
      expect(resolvePrototypeLocale(locale)).toEqual({
        requestedLocale: locale,
        effectiveLocale: 'el-GR',
        reason: 'planned-pack',
      });
      expect(getPrototypeCopy(locale)).toEqual(getPrototypeCopy('el-GR'));
      expect(formatMessage(locale, 'showMe')).toBe('Δείξε μου');
    },
  );

  it('keeps complete German child copy and preserves the accepted English/Greek copy facade', () => {
    expect(prototypeCopy.el.locale).toBe('el-GR');
    expect(prototypeCopy.en.locale).toBe('en-GB');
    expect(prototypeCopy.de.locale).toBe('de-DE');
    expect(prototypeCopy.el.showMe).toBe('Δείξε μου');
    expect(prototypeCopy.en.showMe).toBe('Show me');
    expect(prototypeCopy.de.showMe).toBe('Zeig es mir');
    expect(prototypeCopy.de.shapeChoices).toHaveLength(3);
    expect(prototypeCopy.de.rootArrayLabel).toBe(
      '16 Plättchen in einem Quadrat',
    );
    expect(prototypeCopy.de.representationCaptions[2]).toBe('4 an jeder Seite');
    expect(prototypeCopy.de.rootNotation).toContain('Hauptwert');
    expect(prototypeCopy.de.exploreGuides.root).toBe('');
    expect(prototypeCopy.de.listen).toBe('Anhören');
    expect(prototypeCopy.de.mute).toBe('Stimme stoppen');
  });
});

describe('independent transient language preferences', () => {
  it('starts deterministically in Greek without environment negotiation', () => {
    expect(parseLanguagePreferences('')).toEqual(defaultLanguagePreferences);
    expect(defaultLanguagePreferences).toEqual({
      uiLocale: 'el-GR',
      instructionLocale: 'el-GR',
      numberSpeechLocale: 'el-GR',
    });
  });

  it.each([
    ['el', 'el-GR'],
    ['en', 'en-GB'],
    ['de', 'de-DE'],
  ] as const)(
    'lang=%s is a compatibility convenience for all three %s preferences',
    (language, locale) => {
      expect(parseLanguagePreferences(`?lang=${language}`)).toEqual({
        uiLocale: locale,
        instructionLocale: locale,
        numberSpeechLocale: locale,
      });
      expect(parsePrototypeLanguage(`?lang=${language}`)).toBe(language);
      expect(localeForPrototypeLanguage(language)).toBe(locale);
      expect(prototypeLanguageForLocale(locale)).toBe(language);
    },
  );

  it('represents Greek UI, English instructions and German number speech independently', () => {
    expect(
      parseLanguagePreferences('?ui=el-GR&instruction=en-GB&speech=de-DE'),
    ).toEqual({
      uiLocale: 'el-GR',
      instructionLocale: 'en-GB',
      numberSpeechLocale: 'de-DE',
    });
    expect(
      parseLanguagePreferences('?lang=de&ui=el-GR&instruction=en-GB'),
    ).toEqual({
      uiLocale: 'el-GR',
      instructionLocale: 'en-GB',
      numberSpeechLocale: 'de-DE',
    });
  });

  it.each(SUPPORTED_LOCALES)(
    'represents an explicit %s preference without declaring a complete translation',
    (locale) => {
      expect(
        parseLanguagePreferences(
          `?ui=${locale}&instruction=${locale}&speech=${locale}`,
        ),
      ).toEqual({
        uiLocale: locale,
        instructionLocale: locale,
        numberSpeechLocale: locale,
      });
    },
  );

  it.each(['uiLocale', 'instructionLocale', 'numberSpeechLocale'] as const)(
    'changing %s preserves the two other preferences and its input',
    (key) => {
      const initial: LanguagePreferences = Object.freeze({
        uiLocale: 'el-GR',
        instructionLocale: 'en-GB',
        numberSpeechLocale: 'de-DE',
      });
      expect(setLanguagePreference(initial, key, 'pt-PT')).toEqual({
        ...initial,
        [key]: 'pt-PT',
      });
      expect(initial).toEqual({
        uiLocale: 'el-GR',
        instructionLocale: 'en-GB',
        numberSpeechLocale: 'de-DE',
      });
    },
  );

  it('changing numberSpeechLocale does not overwrite uiLocale', () => {
    const initial: LanguagePreferences = {
      uiLocale: 'el-GR',
      instructionLocale: 'en-GB',
      numberSpeechLocale: 'de-DE',
    };
    const changed = setLanguagePreference(
      initial,
      'numberSpeechLocale',
      'en-GB',
    );
    expect(changed).toEqual({
      uiLocale: 'el-GR',
      instructionLocale: 'en-GB',
      numberSpeechLocale: 'en-GB',
    });
    expect(changed.uiLocale).toBe(initial.uiLocale);
  });

  it.each([
    '?lang=en-GB',
    '?lang=EN',
    '?lang=en&lang=en',
    '?lang=en&lang=de',
    '?lang=',
    '?lang=%',
    '?lang=%2565n',
    '?lang=pt-BR',
  ])(
    'invalid or repeated compatibility query %s deterministically defaults all to Greek',
    (search) => {
      expect(parseLanguagePreferences(search)).toEqual(
        defaultLanguagePreferences,
      );
    },
  );

  it.each(['en', 'en-US', 'EN-gb', '', '%', 'en-GB&speech=en-GB', '%2564e-DE'])(
    'invalid or repeated explicit speech=%s resets only speech to Greek',
    (value) => {
      expect(parseLanguagePreferences(`?lang=de&speech=${value}`)).toEqual({
        uiLocale: 'de-DE',
        instructionLocale: 'de-DE',
        numberSpeechLocale: 'el-GR',
      });
    },
  );

  it('decodes once and ignores unrelated historical theme parameters', () => {
    expect(
      parseLanguagePreferences(
        '?lang=%65n&ui=%65l-GR&speech=%64e-DE&variant=C',
      ),
    ).toEqual({
      uiLocale: 'el-GR',
      instructionLocale: 'en-GB',
      numberSpeechLocale: 'de-DE',
    });
    expect(
      parseLanguagePreferences('?lang=en&ui=en-GB&ui=en-GB&instruction=de-DE'),
    ).toEqual({
      uiLocale: 'el-GR',
      instructionLocale: 'de-DE',
      numberSpeechLocale: 'en-GB',
    });
  });

  it('rejects unsupported runtime preferences rather than substituting a regional voice or pack', () => {
    expect(() =>
      setLanguagePreference(
        defaultLanguagePreferences,
        'numberSpeechLocale',
        'pt-BR' as Locale,
      ),
    ).toThrow('unsupported-locale');
  });

  it('rejects an unsupported runtime rendering locale instead of labelling Greek as a regional substitute', () => {
    const unsupported = 'pt-BR' as Locale;
    expect(() => resolvePrototypeLocale(unsupported)).toThrow(
      'unsupported-locale',
    );
    expect(() => getPrototypeCopy(unsupported)).toThrow('unsupported-locale');
    expect(() => formatMessage(unsupported, 'showMe')).toThrow(
      'unsupported-locale',
    );
    expect(() => formatInteger(unsupported, 4)).toThrow('unsupported-locale');
  });
});

describe('required message schema and typed presentation', () => {
  it('does not let a fallback hide a missing German required message', () => {
    const incomplete = Object.fromEntries(
      Object.entries(prototypePacks['de-DE']).filter(([id]) => id !== 'showMe'),
    );
    expect(validatePrototypeMessages(incomplete)).toEqual({
      valid: false,
      missing: ['showMe'],
      malformed: [],
      unexpected: [],
    });
    expect(validatePrototypeMessages({}).missing).toEqual(REQUIRED_MESSAGE_IDS);
  });

  it('rejects markup, executable-template shapes, missing plural other and unknown keys', () => {
    expect(
      validatePrototypeMessages({
        ...prototypePacks['en-GB'],
        showMe: '<strong>Show me</strong>',
      }),
    ).toMatchObject({ valid: false, malformed: ['showMe'] });
    expect(
      validatePrototypeMessages({
        ...prototypePacks['en-GB'],
        'tiles.count': {
          kind: 'plural',
          argument: 'count',
          cases: { one: [{ number: 'count' }, ' tile'] },
        },
      }),
    ).toMatchObject({ valid: false, malformed: ['tiles.count'] });
    expect(
      validatePrototypeMessages({
        ...prototypePacks['en-GB'],
        'tiles.count': {
          kind: 'plural',
          argument: 'count',
          cases: { other: [{ execute: 'count' }] },
        },
      }),
    ).toMatchObject({ valid: false, malformed: ['tiles.count'] });
    expect(
      validatePrototypeMessages({
        ...prototypePacks['en-GB'],
        unknown: 'unused',
      }),
    ).toMatchObject({ valid: false, unexpected: ['unknown'] });
  });

  it('has typed bounded number and select arguments', () => {
    expectTypeOf<MessageArguments<'tiles.count'>>().toEqualTypeOf<{
      readonly count: number;
    }>();
    expectTypeOf<MessageArguments<'badge.description'>>().toEqualTypeOf<{
      readonly badge: 'star' | 'triangle';
    }>();
    expectTypeOf<MessageArguments<'showMe'>>().toEqualTypeOf<undefined>();
  });

  it.each([
    ['el-GR', '1 πλακάκι', '0 πλακάκια', '16 πλακάκια'],
    ['en-GB', '1 tile', '0 tiles', '16 tiles'],
    ['de-DE', '1 Plättchen', '0 Plättchen', '16 Plättchen'],
  ] as const)(
    'uses Intl cardinal plural rules and typed count interpolation for %s',
    (locale, one, zero, sixteen) => {
      expect(formatMessage(locale, 'tiles.count', { count: 1 })).toBe(one);
      expect(formatMessage(locale, 'tiles.count', { count: 0 })).toBe(zero);
      expect(formatMessage(locale, 'tiles.count', { count: 16 })).toBe(sixteen);
      expect(getPrototypeCopy(locale).arrayLabel).toBe(sixteen);
    },
  );

  it.each([
    ['el-GR', 'Το σήμα σου: Αστέρι', 'Το σήμα σου: Τρίγωνο'],
    ['en-GB', 'Your badge: Star', 'Your badge: Triangle'],
    ['de-DE', 'Dein Zeichen: Stern', 'Dein Zeichen: Dreieck'],
  ] as const)(
    'uses the structured badge selection for %s',
    (locale, star, triangle) => {
      expect(
        formatMessage(locale, 'badge.description', { badge: 'star' }),
      ).toBe(star);
      expect(
        formatMessage(locale, 'badge.description', { badge: 'triangle' }),
      ).toBe(triangle);
    },
  );

  it('returns text that React renders as text; message syntax does not execute markup', () => {
    const text = formatMessage('en-GB', 'tiles.count', { count: 16 });
    expect(renderToStaticMarkup(createElement('p', null, text))).toBe(
      '<p>16 tiles</p>',
    );
    const hostile = '<img src=x onerror=alert(1)>';
    expect(renderToStaticMarkup(createElement('p', null, hostile))).toBe(
      '<p>&lt;img src=x onerror=alert(1)&gt;</p>',
    );
    expect(() =>
      formatMessage('en-GB', 'tiles.count', {
        count: hostile as unknown as number,
      }),
    ).toThrow('invalid-message-arguments');
    expect(() => formatMessage('en-GB', 'missing' as 'showMe')).toThrow(
      'missing-message',
    );
  });

  it.each([
    -1,
    1.2,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects an invalid tile-count argument %s', (count) => {
    expect(() => formatMessage('en-GB', 'tiles.count', { count })).toThrow(
      'invalid-message-arguments',
    );
  });

  it.each(SUPPORTED_LOCALES)(
    'formats exact bounded integer values without grouping for %s',
    (locale) => {
      for (const value of [
        0,
        4,
        16,
        -12,
        1000,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
      ]) {
        const formatted = formatInteger(locale, value);
        expect(formatted).toBe(String(value));
        expect(formatted).not.toMatch(/[,.\s]/u);
      }
    },
  );

  it.each([
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects approximate or unsafe integer presentation %s', (value) => {
    expect(() => formatInteger('en-GB', value)).toThrow('unsupported-integer');
  });
});
