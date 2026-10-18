/** Artificial bounded wire-capacity fixture, never an actual learner trajectory.
 * Repeated semantic observations intentionally test storage, not readiness. */
import { createChapterTask } from '../../../src/application/growing-world';
import {
  deriveSyntheticLoop,
  enterGrowingWorld,
  growingJourneyForRecord,
  initialSyntheticLoop,
  legacySyntheticLoopCodec,
  prepareSyntheticLoopAnswer,
  syntheticLoopCodec,
  syntheticLoopRecordId,
  SYNTHETIC_LOOP_CATALOG,
} from '../../../src/application/synthetic-loop';
import type {
  LoopAnswerRequest,
  SyntheticLoopRecord,
} from '../../../src/application/synthetic-loop';
import { completePendingSyntheticLoop } from '../../../src/application/synthetic-loop/record';
import {
  operationId,
  revision,
  storageEpoch,
} from '../../../src/application/core/integrity';
import { COMMAND_VERSION } from '../../../src/application/ports/repository';
import type { RepositoryCommand } from '../../../src/application/ports/repository';
import { commandFingerprint } from '../../../src/application/repository/validation';
import { createProofReplay } from '../../../src/domain/families/proofs';
import {
  CANONICAL_LIMITS,
  canonicalize,
} from '../../../src/domain/replay/canonical';
import type { ChapterSupport } from '../../../src/domain/growing-world/support';
import { createIndexedDbRepository } from '../../../src/infrastructure/persistence/adapter';
import {
  openSyntheticLoopDatabase,
  SYNTHETIC_LOOP_RECEIPT_LIMIT,
  validateSyntheticLoopDatabase,
} from '../../../src/infrastructure/persistence/synthetic-loop-database';

function value<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string } },
): T {
  if (!result.ok)
    throw new Error(`Synthetic native capacity: ${result.error.code}`);
  return result.value;
}

function requireProof(condition: boolean, code: string): asserts condition {
  if (!condition) throw new Error(`Synthetic native capacity: ${code}`);
}

const maximumOperation = (index: number) =>
  `capacity-${String(index).padStart(3, '0')}-${'x'.repeat(67)}`;

/** All finite valid semantic support contexts, independently spelled out for
 * bounded capacity proof; historical cases reuse the immutable catalog. */
export function growingWorldCapacitySupport(): readonly ChapterSupport[] {
  const support: ChapterSupport[] = SYNTHETIC_LOOP_CATALOG.scopes.flatMap(
    (scope) =>
      scope.cases.map((entry) => ({
        familyId: scope.familyId,
        fingerprint: entry.fingerprint,
        maxHintTier: 3 as const,
      })),
  );
  const add = (familyId: ChapterSupport['familyId'], fingerprint: string) => {
    support.push({ familyId, fingerprint, maxHintTier: 3 });
  };
  for (let first = 6; first <= 9; first++)
    add('number.make-ten', `make-ten:${first}`);
  for (let total = 11; total <= 20; total++)
    for (let known = 1; known < total; known++)
      add('number.part-whole', `missing-part:${known}:${total}`);
  for (let first = 2; first <= 5; first++)
    for (let second = 2; second <= 5; second++) {
      add('groups.missing', `missing-group:${first}:${first * second}`);
      if (first <= second) {
        add('groups.equal', `equal-groups:${first}:${second}`);
        add('measurement.array-area', `array-area:${first}:${second}`);
      }
    }
  for (let side = 1; side <= 6; side++)
    add('powers.square-side', `square-side:${side * side}`);
  return support;
}

function chapterRequest(): LoopAnswerRequest {
  const task = value(
    createChapterTask('number.make-ten', '00000001000000020000000300000004'),
  );
  if (task.task.kind !== 'makeTen') throw new Error('Synthetic task kind');
  return {
    replay: task.replay,
    answer: {
      kind: 'exactValue',
      value: {
        schema: 'rational-v1',
        numerator: String(10 - task.task.first),
        denominator: '1',
      },
    },
    mathematicalHintTier: 0,
    meaningfulAttempts: 1,
    solutionExposed: false,
    accessible: true,
    accessibilitySupports: [],
    playMode: 'practice',
    coarseDay: 100,
    clockCertain: false,
    revisit: false,
  };
}

export function growingWorldCapacityFixture(expectedFinalRevision: number) {
  let legacy = value(
    syntheticLoopCodec.decode({
      ...initialSyntheticLoop('SYNTHETIC-PLAYER-1'),
      mode: 'synthetic-policy',
    }),
  );
  const old = value(
    prepareSyntheticLoopAnswer(
      legacy,
      {
        ...chapterRequest(),
        replay: value(
          createProofReplay(
            'number.addition',
            '00000001000000020000000300000004',
          ),
        ),
        answer: {
          kind: 'exactValue',
          value: { schema: 'rational-v1', numerator: '0', denominator: '1' },
        },
      },
      maximumOperation(0),
      2,
      0,
    ),
  );
  requireProof(
    old.kind === 'pending' && old.pending.observation !== null,
    'legacy-source',
  );
  const sourceEvent = old.pending.observation;
  const events = Array.from({ length: 64 }, (_, index) => ({
    ...sourceEvent,
    input: {
      ...sourceEvent.input,
      id: `SYNTHETIC-${maximumOperation(index)}`,
    },
  }));
  legacy = value(
    syntheticLoopCodec.decode({
      ...legacy,
      events,
      derived: value(deriveSyntheticLoop(legacy.profileId, events)).derived,
      completedCount: 64,
      taskOrdinal: 64,
    }),
  );
  const chapter = value(
    syntheticLoopCodec.decode({
      ...enterGrowingWorld(legacy),
      selectedFamily: 'number.make-ten',
      chapterSupport: growingWorldCapacitySupport(),
    }),
  );
  const source = value(
    prepareSyntheticLoopAnswer(
      chapter,
      chapterRequest(),
      maximumOperation(64),
      expectedFinalRevision,
      0,
    ),
  );
  requireProof(
    source.kind === 'pending' && !!source.pending.chapterObservation,
    'chapter-source',
  );
  const chapterEvents = Array.from({ length: 71 }, (_, index) => ({
    ...source.pending.chapterObservation,
    id: `SYNTHETIC-${maximumOperation(64 + index)}`,
  }));
  const beforeFinal = value(
    syntheticLoopCodec.decode({
      ...chapter,
      chapterEvents,
      completedCount: 135,
      taskOrdinal: 135,
    }),
  );
  const pending = value(
    prepareSyntheticLoopAnswer(
      beforeFinal,
      chapterRequest(),
      maximumOperation(135),
      expectedFinalRevision,
      0,
    ),
  );
  requireProof(pending.kind === 'pending', 'final-pending');
  const prepared = value(
    syntheticLoopCodec.decode({ ...beforeFinal, pending: pending.pending }),
  );
  return {
    legacy,
    prepared,
    final: value(completePendingSyntheticLoop(prepared)),
  };
}

async function digest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function runGrowingWorldCapacityProof() {
  requireProof(maximumOperation(0).length === 80, 'operation-bound');
  const database = value(await openSyntheticLoopDatabase({ bootstrap: true }));
  value(await validateSyntheticLoopDatabase(database));
  const handle = value(
    createIndexedDbRepository(database, syntheticLoopCodec, {
      receiptCapacity: SYNTHETIC_LOOP_RECEIPT_LIMIT,
    }),
  );
  const profiles = ['SYNTHETIC-PLAYER-1', 'SYNTHETIC-PLAYER-2'] as const;
  const revisions = [0, 0];
  const epoch = value(storageEpoch(0));
  let successes = 0;
  // Small unchanged wire fixtures fill a shared receipt allowance cheaply.
  // These commands are explicitly not observations or a learner journey.
  for (let index = 0; index < 2081; index++) {
    const badge = index % 2;
    const profile = profiles[badge];
    const priorRevision = revisions[badge];
    requireProof(!!profile && priorRevision !== undefined, 'profile-index');
    const common = {
      version: COMMAND_VERSION,
      recordSchema: syntheticLoopCodec.schema,
      operationId: value(operationId(`capacity-fill-${index}`)),
      storageEpoch: epoch,
      recordId: value(syntheticLoopRecordId(profile)),
      payload: initialSyntheticLoop(profile),
    } as const;
    const command: RepositoryCommand<SyntheticLoopRecord> =
      priorRevision === 0
        ? { ...common, kind: 'create', expectedRevision: null }
        : {
            ...common,
            kind: 'update',
            expectedRevision: value(revision(priorRevision)),
          };
    const receipt = value(await handle.repository.execute(command));
    revisions[badge] = receipt.revision;
    successes++;
  }
  const firstRevision = revisions[0];
  requireProof(firstRevision !== undefined, 'first-revision');
  const fixture = growingWorldCapacityFixture(firstRevision + 2);
  const id = value(syntheticLoopRecordId('SYNTHETIC-PLAYER-1'));
  let currentRevision = firstRevision;
  let finalCommand: RepositoryCommand<SyntheticLoopRecord> | undefined;
  const fingerprintLengths: number[] = [];
  for (const [index, payload] of [
    fixture.legacy,
    fixture.prepared,
    fixture.final,
  ].entries()) {
    const command: RepositoryCommand<SyntheticLoopRecord> = {
      version: COMMAND_VERSION,
      recordSchema: syntheticLoopCodec.schema,
      operationId: value(
        operationId(
          index === 2 ? maximumOperation(135) : `capacity-stage-${index}`,
        ),
      ),
      storageEpoch: epoch,
      recordId: id,
      kind: 'update',
      expectedRevision: value(revision(currentRevision)),
      payload,
    };
    const fingerprint = value(commandFingerprint(command, syntheticLoopCodec));
    fingerprintLengths.push(fingerprint.length);
    requireProof(
      fingerprint.length < CANONICAL_LIMITS.output,
      'fingerprint-bound',
    );
    currentRevision = value(await handle.repository.execute(command)).revision;
    finalCommand = command;
    successes++;
  }
  requireProof(!!finalCommand, 'final-command');
  const expectedFinal = value(canonicalize(fixture.final));
  const beforeReopen = value(await handle.repository.load(id));
  requireProof(
    value(canonicalize(beforeReopen.payload)) === expectedFinal,
    'native-saved-identity',
  );
  handle.close();

  const reopened = value(await openSyntheticLoopDatabase({ bootstrap: false }));
  value(await validateSyntheticLoopDatabase(reopened));
  const restored = value(
    createIndexedDbRepository(reopened, syntheticLoopCodec, {
      receiptCapacity: SYNTHETIC_LOOP_RECEIPT_LIMIT,
    }),
  );
  const snapshot = value(await restored.repository.load(id));
  requireProof(
    value(canonicalize(snapshot.payload)) === expectedFinal,
    'reopen-identity',
  );
  requireProof(snapshot.revision === currentRevision, 'reopen-revision');
  requireProof(snapshot.storageEpoch === epoch, 'reopen-epoch');
  const retried = value(await restored.repository.execute(finalCommand));
  requireProof(retried.revision === currentRevision, 'retry-revision');
  const afterRetry = value(await restored.repository.load(id));
  requireProof(
    value(canonicalize(afterRetry.payload)) === expectedFinal,
    'retry-identity',
  );
  const other = value(
    await restored.repository.load(
      value(syntheticLoopRecordId('SYNTHETIC-PLAYER-2')),
    ),
  );
  requireProof(
    value(canonicalize(other.payload)) ===
      value(canonicalize(initialSyntheticLoop('SYNTHETIC-PLAYER-2'))),
    'other-profile-identity',
  );
  const count = await new Promise<number>((resolve, reject) => {
    const transaction = reopened.transaction('receipts', 'readonly');
    const request = transaction.objectStore('receipts').count();
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(new Error('Synthetic receipt count'));
  });
  requireProof(
    count === successes &&
      count > 1024 &&
      count <= SYNTHETIC_LOOP_RECEIPT_LIMIT,
    'receipt-count',
  );
  requireProof(
    fixture.final.schema === 'growing-world-synthetic-loop-v2',
    'final-schema',
  );
  const preservedLegacy =
    value(canonicalize(fixture.final.events)) ===
      value(canonicalize(fixture.legacy.events)) &&
    value(canonicalize(fixture.final.derived)) ===
      value(canonicalize(fixture.legacy.derived));
  requireProof(preservedLegacy, 'legacy-preserved');
  requireProof(
    !legacySyntheticLoopCodec.decode(snapshot.payload).ok,
    'old-codec-rejected',
  );
  // An old native adapter must also reject this stable namespace's v2 payload.
  const oldHandle = value(
    createIndexedDbRepository(reopened, legacySyntheticLoopCodec, {
      receiptCapacity: SYNTHETIC_LOOP_RECEIPT_LIMIT,
    }),
  );
  const oldRead = await oldHandle.repository.load(id);
  requireProof(
    !oldRead.ok && oldRead.error.code === 'invalid_record',
    'old-native-reader',
  );
  const result = {
    marker: 'synthetic-only-wire-capacity',
    legacyEvents: fixture.final.events.length,
    chapterEvents: fixture.final.chapterEvents.length,
    supportContexts: fixture.final.chapterSupport.length,
    completedCount: fixture.final.completedCount,
    successfulCommands: successes,
    receiptCount: count,
    receiptLimit: SYNTHETIC_LOOP_RECEIPT_LIMIT,
    profileRevisions: [currentRevision, other.revision],
    storageEpoch: snapshot.storageEpoch,
    preparedCanonicalLength: value(canonicalize(fixture.prepared)).length,
    finalCanonicalLength: expectedFinal.length,
    commandFingerprintLengths: fingerprintLengths,
    canonicalOutputLimit: CANONICAL_LIMITS.output,
    finalCanonicalSha256: await digest(expectedFinal),
    legacyCanonicalSha256: await digest(value(canonicalize(fixture.legacy))),
    preservedLegacy,
    reopened: true,
    exactRetryDidNotReapply: afterRetry.revision === snapshot.revision,
    otherProfilePreserved: true,
    oldNativeReaderError: oldRead.ok ? null : oldRead.error.code,
    capacityReached: value(growingJourneyForRecord(fixture.final))
      .capacityReached,
  };
  oldHandle.close();
  restored.close();
  return result;
}

declare global {
  interface Window {
    growingWorldCapacityProof: typeof runGrowingWorldCapacityProof;
  }
}

// This fixture is bundled only by the explicit integration proof below.
if (typeof window !== 'undefined')
  Object.defineProperty(window, 'growingWorldCapacityProof', {
    value: runGrowingWorldCapacityProof,
    writable: false,
  });
