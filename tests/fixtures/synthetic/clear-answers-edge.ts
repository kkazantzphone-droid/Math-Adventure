/** Artificial finite-edge wire fixture, never an actual learner trajectory.
 * Bundled separately by the explicit installed-browser capacity proof only.
 * It refuses any existing profile, preserving an accidentally selected origin.
 */
import {
  enterGrowingWorld,
  growingJourneyForRecord,
  initialSyntheticLoop,
  syntheticLoopCodec,
  syntheticLoopRecordId,
} from '../../../src/application/synthetic-loop';
import type { SyntheticLoopRecord } from '../../../src/application/synthetic-loop';
import { operationId } from '../../../src/application/core/integrity';
import { COMMAND_VERSION } from '../../../src/application/ports/repository';
import {
  CHAPTER_FAMILY_IDS,
  CHAPTER_GENERATOR_IDS,
} from '../../../src/domain/growing-world/content';
import type { ChapterFamilyId } from '../../../src/domain/growing-world/content';
import { GROWING_JOURNEY_POLICY } from '../../../src/domain/growing-world/journey';
import type { ChapterObservation } from '../../../src/domain/growing-world/journey';
import { canonicalize } from '../../../src/domain/replay/canonical';
import { createIndexedDbRepository } from '../../../src/infrastructure/persistence/adapter';
import {
  openSyntheticLoopDatabase,
  SYNTHETIC_LOOP_RECEIPT_LIMIT,
  validateSyntheticLoopDatabase,
} from '../../../src/infrastructure/persistence/synthetic-loop-database';

type EdgeLocale = 'el-GR' | 'en-GB' | 'de-DE';
function value<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string } },
): T {
  if (!result.ok)
    throw new Error(`Synthetic finite-edge fixture: ${result.error.code}`);
  return result.value;
}

// Independently spelled semantic relationships, from the finite authored scope.
const cases: Readonly<Record<ChapterFamilyId, readonly string[]>> = {
  'number.make-ten': ['make-ten:6', 'make-ten:7', 'make-ten:8', 'make-ten:9'],
  'number.part-whole': [
    'missing-part:1:11',
    'missing-part:2:12',
    'missing-part:3:13',
    'missing-part:4:14',
  ],
  'groups.equal': [
    'equal-groups:2:2',
    'equal-groups:2:3',
    'equal-groups:2:4',
    'equal-groups:2:5',
  ],
  'groups.missing': [
    'missing-group:2:4',
    'missing-group:2:6',
    'missing-group:2:8',
    'missing-group:2:10',
  ],
  'measurement.array-area': [
    'array-area:2:2',
    'array-area:2:3',
    'array-area:2:4',
    'array-area:2:5',
  ],
  'powers.square-side': [
    'square-side:1',
    'square-side:4',
    'square-side:9',
    'square-side:16',
  ],
};

export function clearAnswersFiniteEdgeFixture(
  locale: EdgeLocale,
): SyntheticLoopRecord {
  const initial = enterGrowingWorld(initialSyntheticLoop('SYNTHETIC-PLAYER-1'));
  const chapterEvents = CHAPTER_FAMILY_IDS.flatMap((familyId, familyIndex) =>
    cases[familyId].map((fingerprint, index): ChapterObservation => ({
      schema: 'growing-world-observation-v1',
      policyVersion: GROWING_JOURNEY_POLICY.version,
      id: `SYNTHETIC-clear-edge-${familyIndex}-${index}`,
      familyId,
      concept: `growth.${familyId}`,
      representation: `representation.growth.${familyId}.${index % 2 ? 'relational' : 'concrete'}`,
      fingerprint,
      generatorVersion: CHAPTER_GENERATOR_IDS[familyIndex] ?? '',
      sessionOrdinal: index < 2 ? 1 : 2,
      correct: true,
      mathematicalHintTier: 0,
      meaningfulAttempts: 1,
      solutionExposed: false,
      accessible: true,
    })),
  ).sort((left, right) => left.sessionOrdinal - right.sessionOrdinal);
  const fixture = value(
    syntheticLoopCodec.decode({
      ...initial,
      mode: 'synthetic-policy',
      selectedFamily: 'groups.equal',
      sessionOrdinal: 3,
      chapterEvents,
      completedCount: chapterEvents.length,
      taskOrdinal: chapterEvents.length,
      preferences: {
        uiLocale: locale,
        instructionLocale: locale,
        numberSpeechLocale: locale,
      },
    }),
  );
  const journey = value(growingJourneyForRecord(fixture));
  if (
    !journey.currentEdge ||
    journey.readiness.filter((item) => item.readyForInvitation).length !== 6
  )
    throw new Error('Synthetic finite-edge fixture: incomplete readiness');
  return fixture;
}

export async function seedClearAnswersFiniteEdge(locale: EdgeLocale) {
  if (!['el-GR', 'en-GB', 'de-DE'].includes(locale))
    throw new Error('Synthetic finite-edge fixture: unsupported locale');
  const database = value(await openSyntheticLoopDatabase({ bootstrap: true }));
  value(await validateSyntheticLoopDatabase(database));
  const handle = value(
    createIndexedDbRepository(database, syntheticLoopCodec, {
      receiptCapacity: SYNTHETIC_LOOP_RECEIPT_LIMIT,
    }),
  );
  try {
    const epoch = value(await handle.repository.getEpoch());
    if (epoch !== 0)
      throw new Error(
        'Synthetic finite-edge fixture: origin is not disposable',
      );
    for (const profile of [
      'SYNTHETIC-PLAYER-1',
      'SYNTHETIC-PLAYER-2',
    ] as const) {
      const existing = await handle.repository.load(
        value(syntheticLoopRecordId(profile)),
      );
      if (existing.ok || existing.error.code !== 'record_not_found')
        throw new Error(
          'Synthetic finite-edge fixture: profile already exists',
        );
    }
    const fixture = clearAnswersFiniteEdgeFixture(locale);
    const receipt = value(
      await handle.repository.execute({
        version: COMMAND_VERSION,
        recordSchema: syntheticLoopCodec.schema,
        operationId: value(
          operationId(`clear-edge-seed-${locale.toLowerCase()}`),
        ),
        storageEpoch: epoch,
        recordId: value(syntheticLoopRecordId('SYNTHETIC-PLAYER-1')),
        kind: 'create',
        expectedRevision: null,
        payload: fixture,
      }),
    );
    const canonical = value(canonicalize(fixture));
    const bytes = new TextEncoder().encode(canonical);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return {
      marker: 'synthetic-only-artificial-finite-edge',
      locale,
      currentEdge: true,
      readyFamilies: 6,
      chapterEvents: 24,
      mode: fixture.mode,
      revision: receipt.revision,
      storageEpoch: receipt.storageEpoch,
      canonicalSha256: [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join(''),
    };
  } finally {
    handle.close();
  }
}

declare global {
  interface Window {
    seedClearAnswersFiniteEdge: typeof seedClearAnswersFiniteEdge;
  }
}
if (typeof window !== 'undefined')
  Object.defineProperty(window, 'seedClearAnswersFiniteEdge', {
    value: seedClearAnswersFiniteEdge,
    writable: false,
  });
