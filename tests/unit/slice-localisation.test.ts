import { describe, expect, it } from 'vitest';
import type { Locale } from '../../src/presentation/localisation/locales';
import {
  formatSlice,
  SLICE_MESSAGE_IDS,
  SLICE_MESSAGE_SCHEMA,
  SLICE_PACK_VERSION,
  slicePackManifests,
} from '../../src/presentation/localisation/slice-copy';
import type { SliceMessageId } from '../../src/presentation/localisation/slice-copy';

const locales = ['el-GR', 'en-GB', 'de-DE'] as const;
const argumentKeys = [
  'slice.profileChoice',
  'slice.profileSelected',
  'slice.missingPosition',
  'slice.savedActivities',
] as const;
function formatEvery(locale: Locale, key: SliceMessageId): string {
  if (key === 'slice.profileChoice' || key === 'slice.profileSelected')
    return formatSlice(locale, key, { player: 1 });
  if (key === 'slice.missingPosition')
    return formatSlice(locale, key, { position: 'left' });
  if (key === 'slice.savedActivities')
    return formatSlice(locale, key, { count: 0 });
  return formatSlice(locale, key);
}

describe('complete bounded three-locale synthetic slice draft schema', () => {
  it('keeps separate versioned draft manifests and no planned-locale copy', () => {
    expect(SLICE_MESSAGE_SCHEMA).toBe('slice-messages-v1');
    expect(SLICE_PACK_VERSION).toBe('0.1.0-synthetic-slice');
    expect(slicePackManifests.map((manifest) => manifest.locale)).toEqual(
      locales,
    );
    for (const manifest of slicePackManifests) {
      expect(manifest).toMatchObject({
        status: 'draft',
        completeness: 'complete-slice',
        reviewStatus: 'native-review-pending',
        official: false,
      });
      expect(manifest.reviewers).toEqual([]);
      expect(Object.isFrozen(manifest)).toBe(true);
    }
    expect(new Set(SLICE_MESSAGE_IDS).size).toBe(SLICE_MESSAGE_IDS.length);
  });

  it('contains every Phase 3C plan inventory key without adding a fallback for missing keys', () => {
    const groups = {
      slice: [
        'profileHeading',
        'profileChoice',
        'changeProfile',
        'chooseActivity',
        'skip',
        'stop',
        'stopped',
        'anotherExample',
        'workedExample',
        'chooseAnother',
        'resume',
        'startNewSession',
        'saving',
        'saved',
        'unsaved',
        'saveFailed',
        'storageUnavailable',
        'askAdult',
        'readOnly',
        'changedElsewhere',
        'reloadChoice',
        'noTask',
        'retrySave',
        'checkingSave',
        'numeralPrompt',
        'countPrompt',
        'comparePrompt',
        'subtractPrompt',
        'missingNumberPrompt',
        'numeralHint',
        'countHint',
        'compareHint',
        'subtractHint',
        'missingNumberHint',
        'solutionShown',
        'answerLabel',
        'quantityItems',
        'comparisonLess',
        'comparisonEqual',
        'comparisonGreater',
        'missingPosition',
        'profileSelected',
        'sessionRestored',
        'adultHeading',
        'manualMode',
        'simulationMode',
        'syntheticNotice',
        'recoveryHeading',
        'closeOtherTabs',
        'upgradeBlocked',
        'futureSchema',
        'migrationFailed',
        'recoveryPending',
        'clearPending',
        'deleteProfile',
        'confirmDelete',
        'clearLocal',
        'confirmClear',
        'cancel',
        'retainedFenceNotice',
        'uiLanguage',
        'instructionLanguage',
        'numberSpeechLanguage',
        'languageDraft',
        'speechUnavailable',
        'speechReportedLocal',
      ],
      recommendation: [
        'manual',
        'requestedHelp',
        'support',
        'revisit',
        'developing',
        'new',
        'familiar',
        'limitedEvidence',
        'clockUncertain',
      ],
    };
    for (const [prefix, suffixes] of Object.entries(groups))
      for (const suffix of suffixes)
        expect(SLICE_MESSAGE_IDS).toContain(`${prefix}.${suffix}`);
    expect(() =>
      formatSlice('en-GB', 'slice.missingKey' as 'slice.countPrompt'),
    ).toThrow('missing-slice-message');
  });

  it.each(locales)(
    'formats every required message and every bounded slot in %s',
    (locale) => {
      for (const key of SLICE_MESSAGE_IDS) {
        const text = formatEvery(locale, key);
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/[{}<>]/u);
      }
      for (const player of [1, 2] as const) {
        expect(
          formatSlice(locale, 'slice.profileChoice', { player }),
        ).toContain(String(player));
        expect(
          formatSlice(locale, 'slice.profileSelected', { player }),
        ).toContain(String(player));
      }
      for (const count of [0, 1, 2, 500])
        expect(
          formatSlice(locale, 'slice.savedActivities', { count }),
        ).toContain(String(count));
      const positions = ['left', 'right', 'total'] as const;
      expect(
        new Set(
          positions.map((position) =>
            formatSlice(locale, 'slice.missingPosition', { position }),
          ),
        ).size,
      ).toBe(3);
    },
  );

  it('keeps planned identity separate from the effective Greek fallback', () => {
    for (const locale of ['fr-FR', 'es-ES', 'it-IT', 'pt-PT'] as const)
      expect(formatSlice(locale, 'slice.countPrompt')).toBe(
        formatSlice('el-GR', 'slice.countPrompt'),
      );
    expect(() => formatSlice('en-US' as Locale, 'slice.countPrompt')).toThrow(
      'unsupported-locale',
    );
  });

  it('rejects invalid players/counts/selects and never invokes a slot accessor', () => {
    for (const player of [0, 3, -1, 1.5, '1'])
      expect(() =>
        formatSlice('en-GB', 'slice.profileChoice', { player: player as 1 }),
      ).toThrow();
    for (const count of [-1, 501, 1.5, NaN, Infinity])
      expect(() =>
        formatSlice('en-GB', 'slice.savedActivities', { count }),
      ).toThrow();
    expect(() =>
      formatSlice('en-GB', 'slice.missingPosition', {
        position: 'other' as 'left',
      }),
    ).toThrow();
    let calls = 0;
    const accessor = Object.defineProperty({}, 'player', {
      enumerable: true,
      get() {
        calls += 1;
        return 1;
      },
    });
    expect(() =>
      formatSlice('en-GB', 'slice.profileChoice', accessor as { player: 1 }),
    ).toThrow();
    expect(calls).toBe(0);
    for (const key of SLICE_MESSAGE_IDS.filter(
      (candidate) =>
        !argumentKeys.some((argumentKey) => argumentKey === candidate),
    ))
      expect(formatEvery('de-DE', key)).not.toContain('{');
  });
});
