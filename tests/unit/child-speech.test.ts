import { describe, expect, it } from 'vitest';
import { childCopy } from '../../src/presentation/localisation/child-copy';
import {
  PROTOTYPE_LOCALES,
  SUPPORTED_LOCALES,
} from '../../src/presentation/localisation/locales';
import {
  buildChildActivityUtterancePlan,
  buildUtterancePlan,
  isCatalogueUtterancePlan,
  speechKinds,
} from '../../src/presentation/speech/plans';
import type { ChildActivityKind } from '../../src/presentation/speech/plans';

const activities = [
  [
    'evaluateExpression',
    'activityAddition',
    'Πόσα είναι όλα μαζί;',
    'How many altogether?',
    'Wie viele sind es zusammen?',
  ],
  [
    'classifyGeometry',
    'activityShape',
    'Ποιο σχήμα ταιριάζει;',
    'Which shape matches?',
    'Welche Form passt?',
  ],
  [
    'measureGeometry',
    'activityLength',
    'Πόσα βήματα έχει η γραμμή;',
    'How many steps along the line?',
    'Wie viele Schritte hat die Linie?',
  ],
  [
    'numeralRecognition',
    'activityNumeral',
    'Ποια ομάδα ταιριάζει;',
    'Which group matches?',
    'Welche Gruppe passt?',
  ],
  [
    'countItems',
    'activityCounting',
    'Πόσες κουκκίδες βλέπεις;',
    'How many dots?',
    'Wie viele Punkte?',
  ],
  [
    'compareQuantities',
    'activityComparison',
    'Πού έχει πιο πολλά;',
    'Where are there more dots?',
    'Wo sind mehr Punkte?',
  ],
  [
    'subtractItems',
    'activitySubtraction',
    'Πόσες μένουν;',
    'How many are left?',
    'Wie viele bleiben übrig?',
  ],
  [
    'missingNumber',
    'activityMissing',
    'Τι μπαίνει στο κενό;',
    'What goes in the gap?',
    'Was kommt in die Lücke?',
  ],
] as const;

describe('bounded child activity speech — wording draft, no voice certification', () => {
  it.each(PROTOTYPE_LOCALES)(
    'speaks the meaning of every current activity in %s',
    (locale) => {
      const phraseIndex = locale === 'el-GR' ? 2 : locale === 'en-GB' ? 3 : 4;
      for (const row of activities) {
        const plan = buildChildActivityUtterancePlan(row[0], locale);
        expect(plan).toEqual({
          kind: row[1],
          locale,
          segments: [{ locale, text: row[phraseIndex] }],
        });
        expect(isCatalogueUtterancePlan(plan)).toBe(true);
        expect(Object.isFrozen(plan)).toBe(true);
        expect(Object.isFrozen(plan?.segments)).toBe(true);
        expect(Object.isFrozen(plan?.segments[0])).toBe(true);
        expect(plan?.segments[0]?.text).not.toMatch(
          /\d|[+=√²]|SYNTHETIC|Choose and begin|Wähle und beginne|Διάλεξε και ξεκίνα/u,
        );
      }
    },
  );

  it.each(SUPPORTED_LOCALES.slice(3))(
    'does not manufacture activity speech for planned %s',
    (locale) => {
      for (const [kind] of activities)
        expect(buildChildActivityUtterancePlan(kind, locale)).toBeNull();
    },
  );

  it('keeps the historical fixed catalogue and its prototype distinction', () => {
    expect(speechKinds.slice(0, 15)).toEqual([
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
    ]);
    expect(buildUtterancePlan('numberPrompt', 'en-GB')?.segments[0]?.text).toBe(
      'Three plus two. Choose a number.',
    );
    expect(
      buildChildActivityUtterancePlan('evaluateExpression', 'en-GB')
        ?.segments[0]?.text,
    ).toBe('How many altogether?');
    expect(
      buildUtterancePlan('childInstructions', 'de-DE')?.segments[0]?.text,
    ).toBe('Wähle und beginne.');
    expect(
      buildUtterancePlan('cardinalSixteen', 'el-GR')?.segments[0]?.text,
    ).toBe('Δεκαέξι.');
  });

  it('rejects unknown task kinds and forged activity text, roles, personal fields or accessors', () => {
    for (const input of ['newActivity', 'toString', '__proto__', null, {}])
      expect(
        buildChildActivityUtterancePlan(input as ChildActivityKind, 'en-GB'),
      ).toBeNull();
    const plan = buildChildActivityUtterancePlan('subtractItems', 'en-GB');
    expect(plan).not.toBeNull();
    const candidates: unknown[] = [
      { ...plan, kind: 'enteredText' },
      { ...plan, locale: 'en-US' },
      {
        ...plan,
        segments: [
          { locale: 'en-GB', text: 'A synthetic entered answer is two.' },
        ],
      },
      {
        ...plan,
        segments: [{ locale: 'de-DE', text: plan?.segments[0]?.text }],
      },
      { ...plan, segments: [{ ...plan?.segments[0], answer: 2 }] },
      { ...plan, learnerName: 'SYNTHETIC-NAME' },
      { ...plan, segments: [plan?.segments[0], plan?.segments[0]] },
      {
        ...plan,
        get segments() {
          throw new Error('not data');
        },
      },
    ];
    for (const candidate of candidates)
      expect(isCatalogueUtterancePlan(candidate)).toBe(false);
    expect(
      isCatalogueUtterancePlan(JSON.parse(JSON.stringify(plan)) as unknown),
    ).toBe(true);
  });

  it('cannot change the permitted speech catalogue through the shared child wording reference', () => {
    const copy = childCopy('en-GB');
    expect(Object.isFrozen(copy)).toBe(true);
    expect(Object.isFrozen(copy.countingHelp)).toBe(true);
    expect(Reflect.set(copy, 'counting', 'A synthetic entered message.')).toBe(
      false,
    );
    expect(
      Reflect.set(copy.countingHelp, '0', 'A synthetic entered message.'),
    ).toBe(false);
    expect(
      buildChildActivityUtterancePlan('countItems', 'en-GB')?.segments[0]?.text,
    ).toBe('How many dots?');
    expect(
      isCatalogueUtterancePlan({
        kind: 'activityCounting',
        locale: 'en-GB',
        segments: [{ locale: 'en-GB', text: 'A synthetic entered message.' }],
      }),
    ).toBe(false);
  });
});
