import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  createChapterTask,
  validateChapterAnswer,
} from '../../src/application/growing-world';
import {
  enterGrowingWorld,
  initialSyntheticLoop,
  prepareSyntheticLoopAnswer,
  syntheticLoopCodec,
} from '../../src/application/synthetic-loop';
import type {
  LoopAnswerRequest,
  SyntheticLoopRecord,
} from '../../src/application/synthetic-loop';
import { rememberChapterSupport } from '../../src/domain/growing-world/support';
import { ChapterAnswerEntry } from '../../src/ui/synthetic-loop/ChapterAnswerEntry';
import {
  chapterAnswerMaximum,
  chapterNumberAnswer,
} from '../../src/ui/synthetic-loop/chapter-answers';
import {
  ORACLE_CHAPTER_FAMILIES,
  chapterSeedWitnesses,
} from '../oracle/growing-world';
import type {
  OracleChapterCase,
  OracleChapterFamily,
} from '../oracle/growing-world';

function value<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string } },
): T {
  if (!result.ok)
    throw new Error(`Independent response review: ${result.error.code}`);
  return result.value;
}

// Frozen direct-choice UI bounds, independent of the implementation helper and
// independent of the correct result. Zero and all incorrect replies stay present.
const RESPONSE_MAXIMUM: Readonly<Record<OracleChapterFamily, number>> = {
  'number.make-ten': 10,
  'number.part-whole': 20,
  'groups.equal': 25,
  'groups.missing': 10,
  'measurement.array-area': 25,
  'powers.square-side': 6,
};
const RESPONSE_CASE_COUNTS: Readonly<Record<OracleChapterFamily, number>> = {
  'number.make-ten': 572,
  'number.part-whole': 12_180,
  'groups.equal': 832,
  'groups.missing': 352,
  'measurement.array-area': 832,
  'powers.square-side': 84,
};

/** Previous direct-card wire meaning, constructed without production answers. */
function directAnswer(row: OracleChapterCase, response: number) {
  const magnitude = {
    schema: 'rational-v1' as const,
    numerator: String(response),
    denominator: '1',
  };
  return row.family === 'measurement.array-area'
    ? {
        kind: 'quantity' as const,
        quantity: {
          schema: 'quantity-v1' as const,
          kind: 'exact' as const,
          magnitude,
          unitId: 'unit.square-step',
          dimension: 'area' as const,
        },
      }
    : { kind: 'exactValue' as const, value: magnitude };
}

function record(family: OracleChapterFamily): SyntheticLoopRecord {
  return value(
    syntheticLoopCodec.decode({
      ...enterGrowingWorld(initialSyntheticLoop('SYNTHETIC-PLAYER-1')),
      mode: 'synthetic-policy',
      selectedFamily: family,
    }),
  );
}

function request(
  replay: LoopAnswerRequest['replay'],
  answer: unknown,
  meaningfulAttempts: 1 | 2 = 1,
) {
  return {
    replay,
    answer,
    mathematicalHintTier: 0,
    meaningfulAttempts,
    solutionExposed: false,
    accessibilitySupports: [],
    accessible: true,
    playMode: 'practice',
    coarseDay: 100,
    clockCertain: false,
    revisit: false,
  };
}

describe('Independent clear-answer mathematical and evidence compatibility', () => {
  it('labels answer controls in the UI language and the area unit in the independent instruction language', () => {
    const witness = chapterSeedWitnesses('measurement.array-area')
      .values()
      .next().value;
    if (!witness) throw new Error('Missing independent area witness');
    const task = value(
      createChapterTask('measurement.array-area', witness.seed),
    ).task;
    const html = renderToStaticMarkup(
      createElement(ChapterAnswerEntry, {
        task,
        uiLocale: 'el-GR',
        instructionLocale: 'de-DE',
        disabled: false,
        onAnswer: () => undefined,
      }),
    );
    expect(html).toContain('<div class="chapter-response" lang="el-GR">');
    expect(html).toContain('Η απάντησή σου');
    expect(html).toContain(
      '<span id="chapter-response-unit" lang="de-DE">Flächeneinheiten</span>',
    );
    expect(html).toContain('aria-describedby="chapter-response-unit"');
    expect(html).toContain('<summary lang="el-GR">');
    expect(html).not.toContain('τετραγωνικές μονάδες');
  });

  it.each(['el-GR', 'en-GB', 'de-DE'] as const)(
    'keeps every original direct answer and every compact whole-number option in %s',
    (locale) => {
      for (const family of ORACLE_CHAPTER_FAMILIES) {
        const witness = chapterSeedWitnesses(family).values().next().value;
        if (!witness) throw new Error('Missing independent finite witness');
        const presentation = value(createChapterTask(family, witness.seed));
        const html = renderToStaticMarkup(
          createElement(ChapterAnswerEntry, {
            task: presentation.task,
            uiLocale: locale,
            instructionLocale: locale,
            disabled: false,
            onAnswer: () => undefined,
          }),
        );
        const permitted = Array.from(
          { length: RESPONSE_MAXIMUM[family] + 1 },
          (_, index) => String(index),
        );
        expect(
          [...html.matchAll(/data-child-answer="(\d+)"/g)].map(
            (match) => match[1],
          ),
        ).toEqual(permitted);
        if (RESPONSE_MAXIMUM[family] > 10) {
          expect(
            [...html.matchAll(/<option value="(\d+)"/g)].map(
              (match) => match[1],
            ),
          ).toEqual(permitted);
          expect(html).toContain('<option value="" selected="">');
          expect(html).toMatch(/data-answer-submit="true" disabled=""/);
          expect(html).toContain('<details data-direct-answers="true">');
        } else {
          expect(html).not.toContain('<select');
          expect(html).not.toContain('data-answer-submit');
        }
      }
    },
  );

  it.each(ORACLE_CHAPTER_FAMILIES)(
    'preserves every permitted response across every finite task tuple: %s',
    (family) => {
      let responseCases = 0;
      for (const { seed, expected } of chapterSeedWitnesses(family).values()) {
        const presentation = value(createChapterTask(family, seed));
        expect(chapterAnswerMaximum(presentation.task)).toBe(
          RESPONSE_MAXIMUM[family],
        );
        for (
          let response = 0;
          response <= RESPONSE_MAXIMUM[family];
          response++
        ) {
          const mapped = chapterNumberAnswer(presentation.task, response);
          expect(mapped).toEqual(directAnswer(expected, response));
          // The oracle establishes truth by cardinality, cell enumeration or
          // unique finite equation search, never by reading a production answer.
          expect(validateChapterAnswer(presentation.replay, mapped)).toEqual({
            ok: true,
            value: { correct: response === expected.answer },
          });
          responseCases++;
        }
      }
      expect(responseCases).toBe(RESPONSE_CASE_COUNTS[family]);
    },
  );

  it.each(ORACLE_CHAPTER_FAMILIES)(
    'refuses nonintegral, nonfinite and outside-range UI replies: %s',
    (family) => {
      const witness = chapterSeedWitnesses(family).values().next().value;
      if (!witness) throw new Error('Missing independent finite witness');
      const task = value(createChapterTask(family, witness.seed)).task;
      for (const invalid of [
        -1,
        0.5,
        NaN,
        Infinity,
        -Infinity,
        RESPONSE_MAXIMUM[family] + 1,
        Number.MAX_SAFE_INTEGER + 1,
      ])
        expect(chapterNumberAnswer(task, invalid)).toBeNull();
    },
  );

  it.each(ORACLE_CHAPTER_FAMILIES)(
    'keeps direct-card evidence identical for every response with saved help and retry: %s',
    (family) => {
      // Every representation is witnessed. Source-wide finite response proof is
      // above; here the application boundary checks every response under each
      // relevant assistance/attempt context with separately built direct DTOs.
      for (const representation of ['concrete', 'relational'] as const) {
        const witness = [...chapterSeedWitnesses(family).values()].find(
          (candidate) => candidate.expected.representation === representation,
        );
        if (!witness) throw new Error('Missing representation witness');
        const presentation = value(createChapterTask(family, witness.seed));
        for (const tier of [0, 1, 3] as const) {
          const base = record(family);
          const supported = value(
            syntheticLoopCodec.decode({
              ...base,
              chapterSupport:
                tier === 0
                  ? []
                  : value(
                      rememberChapterSupport([], presentation.replay, tier),
                    ),
            }),
          );
          for (const attempts of [1, 2] as const) {
            for (
              let response = 0;
              response <= RESPONSE_MAXIMUM[family];
              response++
            ) {
              const mapped = chapterNumberAnswer(presentation.task, response);
              if (!mapped) throw new Error('Permitted response was removed');
              const operation = 'synthetic-response-compatibility';
              const actual = value(
                prepareSyntheticLoopAnswer(
                  supported,
                  request(presentation.replay, mapped, attempts),
                  operation,
                  1,
                  0,
                ),
              );
              expect(actual).toEqual(
                value(
                  prepareSyntheticLoopAnswer(
                    supported,
                    request(
                      presentation.replay,
                      directAnswer(witness.expected, response),
                      attempts,
                    ),
                    operation,
                    1,
                    0,
                  ),
                ),
              );
              if (actual.kind !== 'pending')
                throw new Error('Expected the unchanged assessed route');
              expect(actual.pending).toMatchObject({
                correct: response === witness.expected.answer,
                evidenceKind: 'limitedEvidence',
                chapterObservation: {
                  fingerprint: witness.expected.fingerprint,
                  representation: `representation.growth.${family}.${representation}`,
                  mathematicalHintTier: tier,
                  meaningfulAttempts: attempts,
                  solutionExposed: tier === 3,
                },
              });
            }
          }
        }
      }
    },
  );
});
