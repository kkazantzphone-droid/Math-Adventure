import { describe, expect, it } from 'vitest';
import { getGrowingWorldCopy } from '../../src/presentation/localisation/growing-world-copy';
import {
  PROTOTYPE_LOCALES,
  SUPPORTED_LOCALES,
} from '../../src/presentation/localisation/locales';
import {
  buildChapterUtterancePlan,
  isCatalogueUtterancePlan,
} from '../../src/presentation/speech/plans';

const kinds = [
  'makeTen',
  'missingPart',
  'equalGroups',
  'missingGroup',
  'arrayArea',
  'squareSide',
] as const;
describe('fixed chapter speech preserves the exact-local optional catalogue boundary', () => {
  it.each(PROTOTYPE_LOCALES)(
    'keeps useful fixed prompts immutable in %s',
    (locale) => {
      const copy = getGrowingWorldCopy(locale);
      expect(Object.isFrozen(copy)).toBe(true);
      expect(Object.isFrozen(copy.prompts)).toBe(true);
      expect(
        Reflect.set(copy.prompts, 'makeTen', 'SYNTHETIC arbitrary utterance'),
      ).toBe(false);
      for (const kind of kinds) {
        const plan = buildChapterUtterancePlan(kind, locale);
        expect(plan?.segments[0]?.text).toBe(copy.prompts[kind]);
        expect(isCatalogueUtterancePlan(plan)).toBe(true);
        expect(
          isCatalogueUtterancePlan({
            ...plan,
            segments: [{ locale, text: 'SYNTHETIC arbitrary utterance' }],
          }),
        ).toBe(false);
        expect(plan?.segments[0]?.text).not.toMatch(/[0-9=√²]/u);
      }
    },
  );
  it('never fills a planned locale with an available regional/default phrase', () => {
    for (const locale of SUPPORTED_LOCALES.slice(3))
      for (const kind of kinds)
        expect(buildChapterUtterancePlan(kind, locale)).toBeNull();
  });
});
