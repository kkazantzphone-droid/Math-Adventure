import { describe, expect, it } from 'vitest';
import {
  PROTOTYPE_LOCALES,
  SUPPORTED_LOCALES,
} from '../../src/presentation/localisation/locales';
import {
  buildUtterancePlan,
  isCatalogueUtterancePlan,
  speechKinds,
} from '../../src/presentation/speech/plans';

describe('bounded draft speech plans', () => {
  it.each(PROTOTYPE_LOCALES)(
    'provides every fixed concept in %s with language-tagged immutable segments',
    (locale) => {
      for (const kind of speechKinds) {
        const plan = buildUtterancePlan(kind, locale);
        expect(plan?.kind).toBe(kind);
        expect(plan?.locale).toBe(locale);
        expect(plan?.segments).toHaveLength(1);
        expect(plan?.segments[0]?.locale).toBe(locale);
        expect(plan?.segments[0]?.text.length).toBeGreaterThan(0);
        expect(isCatalogueUtterancePlan(plan)).toBe(true);
        expect(Object.isFrozen(plan)).toBe(true);
        expect(Object.isFrozen(plan?.segments)).toBe(true);
        expect(Object.isFrozen(plan?.segments[0])).toBe(true);
      }
    },
  );

  it.each(
    SUPPORTED_LOCALES.filter(
      (locale) =>
        !PROTOTYPE_LOCALES.includes(
          locale as (typeof PROTOTYPE_LOCALES)[number],
        ),
    ),
  )('keeps planned locale %s without fabricated speech', (locale) => {
    for (const kind of speechKinds)
      expect(buildUtterancePlan(kind, locale)).toBeNull();
  });

  it.each([
    [
      'el-GR',
      'Τέσσερα επί τέσσερα ίσον δεκαέξι.',
      'Τέσσερα στο τετράγωνο ίσον δεκαέξι.',
      'κύρια τετραγωνική ρίζα',
    ],
    [
      'en-GB',
      'Four times four equals sixteen.',
      'Four squared equals sixteen.',
      'principal square root',
    ],
    [
      'de-DE',
      'Vier mal vier ist sechzehn.',
      'Vier zum Quadrat ist sechzehn.',
      'Hauptwert der Quadratwurzel',
    ],
  ] as const)(
    'uses semantic relationship wording in %s rather than radical or power punctuation',
    (locale, multiply, square, root) => {
      expect(buildUtterancePlan('multiply', locale)?.segments[0]?.text).toBe(
        multiply,
      );
      expect(buildUtterancePlan('square', locale)?.segments[0]?.text).toBe(
        square,
      );
      expect(buildUtterancePlan('root', locale)?.segments[0]?.text).toContain(
        root,
      );
      for (const kind of ['multiply', 'square', 'root'] as const) {
        expect(buildUtterancePlan(kind, locale)?.segments[0]?.text).not.toMatch(
          /[√²=\d]/u,
        );
      }
    },
  );

  it('keeps a bounded cardinal catalogue without a general number-to-words engine', () => {
    expect(
      buildUtterancePlan('cardinalThree', 'el-GR')?.segments[0]?.text,
    ).toBe('Τρία.');
    expect(buildUtterancePlan('cardinalFive', 'en-GB')?.segments[0]?.text).toBe(
      'Five.',
    );
    expect(buildUtterancePlan('cardinalSix', 'de-DE')?.segments[0]?.text).toBe(
      'Sechs.',
    );
    expect(
      buildUtterancePlan('cardinalSixteen', 'de-DE')?.segments[0]?.text,
    ).toBe('Sechzehn.');
  });

  it('rejects externally forged text, locale, kind, extra personal fields, accessors and extra segments', () => {
    const plan = buildUtterancePlan('root', 'en-GB');
    expect(plan).not.toBeNull();
    const cases: unknown[] = [
      null,
      {},
      { ...plan, kind: 'enteredText' },
      { ...plan, locale: 'en-US' },
      {
        ...plan,
        segments: [{ locale: 'en-GB', text: 'A personal entered message' }],
      },
      { ...plan, childName: 'Synthetic-name-field' },
      {
        ...plan,
        segments: [...(plan?.segments ?? []), ...(plan?.segments ?? [])],
      },
      { ...plan, segments: [{ ...plan?.segments[0], locale: 'de-DE' }] },
      { ...plan, segments: [{ ...plan?.segments[0], answerHistory: [] }] },
      Object.create(plan) as unknown,
      {
        ...plan,
        get segments() {
          throw new Error('not data');
        },
      },
      { ...plan, [Symbol('extra')]: 'unexpected' },
    ];
    for (const candidate of cases)
      expect(isCatalogueUtterancePlan(candidate)).toBe(false);
  });
});
