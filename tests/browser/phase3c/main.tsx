import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createFamilyProof,
  PROOF_FAMILY_IDS,
} from '../../../src/application/family-proof';
import { createSliceFamily } from '../../../src/application/slice-family';
import type {
  LoopFamilyId,
  LoopPreferences,
} from '../../../src/application/synthetic-loop';
import { syntheticLoopTaskSeed } from '../../../src/application/synthetic-loop';
import type { SyntheticProfileId } from '../../../src/domain/adaptation/types';
import { SLICE_FAMILY_IDS } from '../../../src/domain/families/slice';
import type { SliceFamilyId } from '../../../src/domain/families/slice';
import type { ProofFamilyId } from '../../../src/domain/families/proofs';
import { SYNTHETIC_PROFILE_IDS } from '../../../src/domain/adaptation/types';
import { LENGTH_UNIT_ID } from '../../../src/domain/families/proofs';
import type { StructuredAnswer } from '../../../src/domain/puzzles/contracts';
import { identifier } from '../../../src/domain/core/identifiers';
import { createBrowserOfflineController } from '../../../src/infrastructure/offline/browserOffline';
import { createBrowserSpeechAdapter } from '../../../src/infrastructure/speech/browserSpeech';
import {
  resolvePrototypeLocale,
  SUPPORTED_LOCALES,
  isLocale,
} from '../../../src/presentation/localisation/locales';
import {
  formatMessage,
  getPrototypeCopy,
} from '../../../src/presentation/localisation/format';
import {
  formatSlice,
  sliceOfflineCopy,
} from '../../../src/presentation/localisation/slice-copy';
import { buildUtterancePlan } from '../../../src/presentation/speech/plans';
import { TaskView } from '../../../src/ui/synthetic-loop/TaskView';
import type { LoopPresentation } from '../../../src/ui/synthetic-loop/TaskView';
import { OfflineControls } from '../../../src/ui/offline/OfflineControls';
import { SpeechControls } from '../../../src/ui/speech/SpeechControls';
import { createSliceRuntime } from './runtime';
import '../../../src/ui/styles.css';
import '../../../src/ui/synthetic-loop/slice.css';
import './shell.css';

declare const __PHASE3C_SYNTHETIC_CAPABILITY__: boolean;
if (
  !__PHASE3C_SYNTHETIC_CAPABILITY__ ||
  location.protocol !== 'http:' ||
  location.hostname !== '127.0.0.1' ||
  !location.port
)
  throw new Error('Synthetic developer capability unavailable');

const baseURL = new URL(import.meta.env.BASE_URL, document.baseURI);
const runtime = createSliceRuntime(baseURL);
const speech = createBrowserSpeechAdapter();
const shellId = document.querySelector<HTMLMetaElement>(
  'meta[name="math-adventure-shell"]',
)?.content;
const offline = shellId
  ? createBrowserOfflineController({
      serviceWorker:
        'serviceWorker' in navigator ? navigator.serviceWorker : null,
      shellId,
      baseURL,
      learnerData: runtime.learnerData,
      reload: () => location.reload(),
      online: () => navigator.onLine,
      onFreeze: (frozen) => {
        const surface = document.getElementById('offline-interaction-surface');
        if (surface) surface.inert = frozen;
        if (frozen) speech.cancel();
        runtime.notify();
      },
    })
  : null;
window.addEventListener('pagehide', () => speech.cancel());

const families: readonly LoopFamilyId[] = [
  ...PROOF_FAMILY_IDS,
  ...SLICE_FAMILY_IDS,
];
const labels: Readonly<
  Record<
    SliceFamilyId,
    | 'slice.numeralActivity'
    | 'slice.countActivity'
    | 'slice.compareActivity'
    | 'slice.subtractActivity'
    | 'slice.missingActivity'
  >
> = {
  'number.numeral': 'slice.numeralActivity',
  'number.counting': 'slice.countActivity',
  'number.comparison': 'slice.compareActivity',
  'number.subtraction': 'slice.subtractActivity',
  'number.missing': 'slice.missingActivity',
};
const operation = () => `synthetic-${crypto.randomUUID()}`;
let publicPresentation: LoopPresentation | null = null;

function generate(
  family: LoopFamilyId,
  ordinal: number,
  profile: SyntheticProfileId,
): LoopPresentation | null {
  const seed = syntheticLoopTaskSeed(profile, family, ordinal);
  if (!seed.ok) return null;
  const result = PROOF_FAMILY_IDS.some((id) => id === family)
    ? createFamilyProof(family as ProofFamilyId, seed.value)
    : createSliceFamily(family as SliceFamilyId, seed.value);
  return result.ok ? result.value : null;
}

function App() {
  const [, render] = useState(0);
  const [task, setTask] = useState<LoopPresentation | null>(null);
  const [response, setResponse] = useState('');
  const [classes, setClasses] = useState<readonly string[]>([]);
  const [hint, setHint] = useState(false);
  const [support, setSupport] = useState(false);
  const [attempts, setAttempts] = useState<1 | 2 | 3>(1);
  const [feedback, setFeedback] = useState<
    'none' | 'correct' | 'retry' | 'incorrect' | 'unavailable' | 'selection'
  >('none');
  const [finished, setFinished] = useState(false);
  const [playMode, setPlayMode] = useState<'practice' | 'exploration'>(
    'practice',
  );
  const [save, setSave] = useState(true);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const actionGeneration = useRef(0);
  const focusRequested = useRef(false);
  const session = runtime.session();
  const state = session.state();
  const record = state.record;
  const preferences: LoopPreferences = record?.preferences ?? {
    uiLocale: 'el-GR',
    instructionLocale: 'el-GR',
    numberSpeechLocale: 'el-GR',
  };
  const locale = preferences.uiLocale;
  const effective = resolvePrototypeLocale(locale).effectiveLocale;
  const copy = getPrototypeCopy(locale);
  const disabled = state.busy || state.frozen || runtime.recovery().recovering;
  const playDisabled =
    disabled || state.readOnly || state.uncertain || record?.pending != null;
  const recommendedFamily =
    record?.derived.recommendation?.concept === 'addition.part-whole'
      ? 'number.addition'
      : record?.derived.recommendation?.concept ===
          'geometry.quadrilateral.attributes'
        ? 'geometry.quadrilateral'
        : record?.derived.recommendation?.concept ===
            'measurement.length.unit-iteration'
          ? 'measurement.unit-length'
          : null;
  const numeralSpeech =
    task?.task.kind === 'numeralRecognition'
      ? (
          {
            '2': 'cardinalTwo',
            '3': 'cardinalThree',
            '4': 'cardinalFour',
            '5': 'cardinalFive',
          } as const
        )[task.task.numeral.numerator as '2' | '3' | '4' | '5']
      : undefined;
  const refresh = () => {
    runtime.notify();
    render((value) => value + 1);
  };

  useEffect(() => runtime.subscribe(() => render((value) => value + 1)), []);
  useEffect(() => speech.subscribe(() => render((value) => value + 1)), []);
  useEffect(() => offline?.subscribe(() => render((value) => value + 1)), []);
  useEffect(() => {
    document.documentElement.lang = effective;
    speech.cancel();
  }, [
    effective,
    preferences.instructionLocale,
    preferences.numberSpeechLocale,
  ]);
  useEffect(() => {
    offline?.setSafeBoundary(
      !state.busy && !state.uncertain && !record?.pending,
    );
  }, [state.busy, state.uncertain, record?.pending]);
  useLayoutEffect(() => {
    if (!focusRequested.current) return;
    focusRequested.current = false;
    const target =
      document.getElementById('slice-task-heading') ??
      document.querySelector<HTMLButtonElement>('[data-action="resume"]') ??
      document.querySelector<HTMLButtonElement>('[data-profile]');
    target?.focus();
  }, [task, record?.sessionActive]);

  function presentCurrent() {
    focusRequested.current = true;
    speech.cancel();
    const current = runtime.session().state().record;
    publicPresentation =
      current && current.sessionActive
        ? generate(
            current.selectedFamily,
            current.taskOrdinal,
            current.profileId,
          )
        : null;
    setTask(publicPresentation);
    setResponse('');
    setClasses([]);
    setHint(false);
    setSupport(false);
    setAttempts(1);
    setFeedback('none');
    setFinished(false);
    setDeleteRequested(false);
  }

  async function run(action: () => Promise<unknown>, present = false) {
    const token = ++actionGeneration.current;
    speech.cancel();
    const pending = action();
    refresh();
    await pending;
    refresh();
    if (present && token === actionGeneration.current) presentCurrent();
  }

  async function submit() {
    if (!task || finished) return;
    let answer: StructuredAnswer;
    if (
      task.task.kind === 'classifyGeometry' ||
      task.task.kind === 'compareQuantities'
    ) {
      answer = {
        kind: 'classification',
        classIds: task.task.kind === 'compareQuantities' ? [response] : classes,
      };
    } else {
      if (!/^(?:0|[1-9]|10)$/.test(response)) {
        setFeedback('selection');
        return;
      }
      const value = {
        schema: 'rational-v1' as const,
        numerator: response,
        denominator: '1',
      };
      const unit = identifier('unit', LENGTH_UNIT_ID);
      if (!unit.ok) return;
      answer =
        task.task.kind === 'measureGeometry'
          ? {
              kind: 'quantity',
              quantity: {
                schema: 'quantity-v1',
                kind: 'exact',
                magnitude: value,
                unitId: unit.value,
                dimension: 'length',
              },
            }
          : { kind: 'exactValue', value };
    }
    const selected = record?.profileId;
    const pending = session.submit(
      {
        replay: task.replay,
        answer,
        mathematicalHintTier: hint ? 1 : 0,
        meaningfulAttempts: attempts,
        solutionExposed: false,
        accessibilitySupports: support ? ['alternateControls'] : [],
        // New visual token families have no candidate evidence; old semantic
        // families expose the exact equivalent nonvisual alternative explicitly.
        accessible: true,
        playMode,
        coarseDay: 100,
        clockCertain: false,
        revisit: false,
      },
      operation(),
    );
    refresh();
    const result = await pending;
    if (
      runtime.session() !== session ||
      runtime.session().state().record?.profileId !== selected
    )
      return;
    refresh();
    const after = session.state();
    const completion =
      after.sessionOnlyCompletion ?? after.record?.lastCompletion;
    if (!result.ok || !completion) {
      setFeedback('unavailable');
      return;
    }
    setFeedback(completion.correct ? 'correct' : 'retry');
    setFinished(true);
  }

  async function retrySave() {
    const pending = session.retryPending();
    refresh();
    const result = await pending;
    if (runtime.session() !== session) return;
    refresh();
    const completion = session.state().record?.lastCompletion;
    if (result.ok && completion) {
      setFeedback(completion.correct ? 'correct' : 'retry');
      setFinished(true);
    }
  }

  const familyLabel = (family: LoopFamilyId) =>
    family === 'number.addition'
      ? formatMessage(locale, 'proof.number')
      : family === 'geometry.quadrilateral'
        ? formatMessage(locale, 'proof.geometry')
        : family === 'measurement.unit-length'
          ? formatMessage(locale, 'proof.measurement')
          : formatSlice(locale, labels[family]);

  return (
    <main className="app-shell synthetic-loop" lang={effective}>
      <header className="slice-header">
        <p className="slice-brand">Math Adventure · Space</p>
        <h1>{formatSlice(locale, 'slice.profileHeading')}</h1>
        <p>{formatSlice(locale, 'slice.syntheticNotice')}</p>
      </header>
      <div
        id="offline-interaction-surface"
        inert={offline?.snapshot().frozen ?? false}
      >
        <section className="slice-panel" aria-labelledby="profiles-heading">
          <h2 id="profiles-heading">
            {formatSlice(locale, 'slice.profileHeading')}
          </h2>
          <div className="slice-actions">
            {SYNTHETIC_PROFILE_IDS.map((profile, index) => (
              <button
                key={profile}
                data-profile={profile}
                type="button"
                disabled={state.frozen || runtime.recovery().recovering}
                aria-pressed={record?.profileId === profile}
                onClick={() =>
                  void run(
                    () => runtime.selectProfile(profile, operation(), save),
                    true,
                  )
                }
              >
                {formatSlice(locale, 'slice.profileChoice', {
                  player: index === 0 ? 1 : 2,
                })}
              </button>
            ))}
          </div>
          <label>
            <input
              type="checkbox"
              checked={save}
              onChange={(event) => setSave(event.target.checked)}
              disabled={disabled}
            />
            {formatSlice(locale, 'slice.storageChoice')}
          </label>
        </section>
        {!record && runtime.recovery().error && (
          <p role="status" data-recovery-error={runtime.recovery().error}>
            {formatSlice(
              locale,
              runtime.recovery().error === 'unsupported_schema'
                ? 'slice.futureSchema'
                : 'slice.storageUnavailable',
            )}
          </p>
        )}
        {record && (
          <>
            <section
              className="slice-panel"
              aria-labelledby="activities-heading"
            >
              <h2 id="activities-heading">
                {formatSlice(locale, 'slice.chooseActivity')}
              </h2>
              <div className="slice-activities">
                {families.map((family) => (
                  <button
                    key={family}
                    type="button"
                    data-family={family}
                    disabled={playDisabled || !record.sessionActive}
                    aria-pressed={record.selectedFamily === family}
                    onClick={() =>
                      void run(
                        () => session.setActivity(family, operation()),
                        true,
                      )
                    }
                  >
                    {familyLabel(family)}
                  </button>
                ))}
              </div>
              {record.mode === 'synthetic-policy' && recommendedFamily && (
                <button
                  type="button"
                  data-action="recommendation"
                  disabled={playDisabled || !record.sessionActive}
                  onClick={() =>
                    void run(
                      () => session.setActivity(recommendedFamily, operation()),
                      true,
                    )
                  }
                >
                  {formatSlice(locale, 'slice.tryRecommendation')}:{' '}
                  {familyLabel(recommendedFamily)}
                </button>
              )}
            </section>
            <section className="slice-panel" data-task-family={task?.familyId}>
              {record.sessionActive ? (
                <>
                  <TaskView
                    key={task?.replay.seedHex ?? 'empty'}
                    contextKey={record.profileId}
                    task={task}
                    preferences={preferences}
                    response={response}
                    selectedClasses={classes}
                    hintVisible={hint}
                    feedback={feedback}
                    disabled={playDisabled || finished}
                    retryDisabled={playDisabled}
                    onResponse={setResponse}
                    onClass={(id, selected) =>
                      setClasses((current) =>
                        selected
                          ? [...current.filter((value) => value !== id), id]
                          : current.filter((value) => value !== id),
                      )
                    }
                    onHint={() => setHint(true)}
                    onSubmit={() => void submit()}
                    onRetry={() => {
                      setFinished(false);
                      setFeedback('none');
                      setAttempts((value) =>
                        value === 3 ? 3 : value === 2 ? 3 : 2,
                      );
                    }}
                    onAccessibleSupport={() => setSupport(true)}
                  />
                  <div className="slice-actions">
                    {finished && (
                      <button
                        type="button"
                        data-action="next"
                        onClick={presentCurrent}
                      >
                        {copy.continue}
                      </button>
                    )}
                    <button
                      type="button"
                      data-action="skip"
                      disabled={playDisabled}
                      onClick={() =>
                        void run(() => session.skip(operation()), true)
                      }
                    >
                      {formatSlice(locale, 'slice.skip')}
                    </button>
                    <button
                      type="button"
                      data-action="stop"
                      disabled={playDisabled}
                      onClick={() =>
                        void run(() => session.endSession(operation()), true)
                      }
                    >
                      {formatSlice(locale, 'slice.stop')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p role="status">{formatSlice(locale, 'slice.stopped')}</p>
                  <button
                    type="button"
                    data-action="resume"
                    disabled={playDisabled}
                    onClick={() =>
                      void run(() => session.startSession(operation()), true)
                    }
                  >
                    {formatSlice(locale, 'slice.startNewSession')}
                  </button>
                </>
              )}
              <section aria-labelledby="instruction-speech-label">
                <h3 id="instruction-speech-label">
                  {formatSlice(locale, 'slice.instructionLanguage')}
                </h3>
                <SpeechControls
                  speech={speech}
                  snapshot={speech.snapshot()}
                  plan={buildUtterancePlan(
                    feedback === 'correct'
                      ? 'positiveFeedback'
                      : 'childInstructions',
                    preferences.instructionLocale,
                  )}
                  copy={copy}
                />
              </section>
              {numeralSpeech && (
                <section
                  data-speech-role="number"
                  aria-labelledby="number-speech-label"
                >
                  <h3 id="number-speech-label">
                    {formatSlice(locale, 'slice.numberSpeechLanguage')}
                  </h3>
                  <SpeechControls
                    speech={speech}
                    snapshot={speech.snapshot()}
                    plan={buildUtterancePlan(
                      numeralSpeech,
                      preferences.numberSpeechLocale,
                    )}
                    copy={copy}
                  />
                </section>
              )}
              <p
                className="slice-save-status"
                role="status"
                data-save-state={
                  state.busy
                    ? 'saving'
                    : state.uncertain
                      ? 'uncertain'
                      : state.saved
                        ? 'saved'
                        : 'unsaved'
                }
              >
                {formatSlice(
                  locale,
                  state.busy
                    ? 'slice.saving'
                    : state.uncertain
                      ? 'slice.checkingSave'
                      : state.saved
                        ? 'slice.saved'
                        : state.error
                          ? 'slice.saveFailed'
                          : 'slice.unsaved',
                )}
              </p>
            </section>
            <details className="slice-panel" data-developer-controls>
              <summary>{formatSlice(locale, 'slice.adultHeading')}</summary>
              <p>{formatSlice(locale, 'slice.languageDraft')}</p>
              <label>
                <input
                  type="checkbox"
                  data-mode="policy"
                  checked={record.mode === 'synthetic-policy'}
                  disabled={playDisabled}
                  onChange={(event) =>
                    void run(() =>
                      session.setMode(
                        event.target.checked ? 'synthetic-policy' : 'manual',
                        operation(),
                      ),
                    )
                  }
                />
                {formatSlice(locale, 'slice.simulationMode')}
              </label>
              <p>
                {formatSlice(
                  locale,
                  record.mode === 'manual'
                    ? 'slice.manualMode'
                    : 'slice.simulationMode',
                )}
              </p>
              <label>
                <input
                  type="checkbox"
                  data-mode="exploration"
                  checked={playMode === 'exploration'}
                  disabled={disabled}
                  onChange={(event) =>
                    setPlayMode(
                      event.target.checked ? 'exploration' : 'practice',
                    )
                  }
                />
                {copy.explore}
              </label>
              {(
                ['uiLocale', 'instructionLocale', 'numberSpeechLocale'] as const
              ).map((role) => (
                <label key={role}>
                  {formatSlice(
                    locale,
                    role === 'uiLocale'
                      ? 'slice.uiLanguage'
                      : role === 'instructionLocale'
                        ? 'slice.instructionLanguage'
                        : 'slice.numberSpeechLanguage',
                  )}
                  <select
                    data-language-role={role}
                    value={preferences[role]}
                    disabled={playDisabled}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (isLocale(value))
                        void run(() =>
                          session.setPreferences(
                            { ...preferences, [role]: value },
                            operation(),
                          ),
                        );
                    }}
                  >
                    {SUPPORTED_LOCALES.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <p data-locale-resolution>
                {JSON.stringify({
                  requested: preferences,
                  ui: effective,
                  instructions: resolvePrototypeLocale(
                    preferences.instructionLocale,
                  ).effectiveLocale,
                })}
              </p>
              <p>
                {formatSlice(
                  locale,
                  speech.snapshot().capabilities[preferences.instructionLocale]
                    .state === 'ready-local'
                    ? 'slice.speechReportedLocal'
                    : 'slice.speechUnavailable',
                )}
              </p>
              {record.mode === 'synthetic-policy' && (
                <pre data-recommendation>
                  {JSON.stringify(record.derived.recommendation, null, 2)}
                </pre>
              )}
              <pre data-inspection>
                {JSON.stringify(
                  {
                    profile: record.profileId,
                    sessionOrdinal: record.sessionOrdinal,
                    completedCount: record.completedCount,
                    observations: record.events.filter(
                      (event) => event.kind === 'observation',
                    ).length,
                    completion: record.lastCompletion,
                    error: state.error,
                    recovery: runtime.recovery(),
                    explorationCount: state.explorationCount,
                  },
                  null,
                  2,
                )}
              </pre>
              <div className="slice-actions">
                <button
                  type="button"
                  data-action="reconcile"
                  disabled={disabled}
                  onClick={() => void run(() => session.reload(), true)}
                >
                  {formatSlice(locale, 'slice.reloadChoice')}
                </button>
                <button
                  type="button"
                  data-action="retry-save"
                  disabled={disabled || !record.pending}
                  onClick={() => void retrySave()}
                >
                  {formatSlice(locale, 'slice.retrySave')}
                </button>
                <button
                  type="button"
                  data-action="unsaved"
                  disabled={disabled}
                  onClick={() => {
                    session.useUnsaved();
                    refresh();
                    presentCurrent();
                  }}
                >
                  {formatSlice(locale, 'slice.unsaved')}
                </button>
                <button
                  type="button"
                  data-action="delete"
                  disabled={state.frozen || runtime.recovery().recovering}
                  onClick={() => setDeleteRequested(true)}
                >
                  {formatSlice(locale, 'slice.deleteProfile')}
                </button>
                {deleteRequested && (
                  <div>
                    <p id="confirm-delete" role="status">
                      {formatSlice(locale, 'slice.confirmDelete')}
                    </p>
                    <button
                      type="button"
                      data-action="confirm-delete"
                      aria-describedby="confirm-delete"
                      disabled={state.frozen || runtime.recovery().recovering}
                      onClick={() =>
                        void run(() => session.deleteProfile(operation()), true)
                      }
                    >
                      {formatSlice(locale, 'slice.deleteProfile')}
                    </button>
                    <button
                      type="button"
                      data-action="cancel-delete"
                      onClick={() => {
                        setDeleteRequested(false);
                        document
                          .querySelector<HTMLButtonElement>(
                            '[data-action="delete"]',
                          )
                          ?.focus();
                      }}
                    >
                      {formatSlice(locale, 'slice.cancel')}
                    </button>
                  </div>
                )}
              </div>
            </details>
          </>
        )}
      </div>
      {offline && (
        <OfflineControls
          locale={locale}
          copyOverride={sliceOfflineCopy(locale)}
          snapshot={offline.snapshot()}
          onUpdate={() => {
            void offline.requestUpdate();
          }}
        />
      )}
    </main>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Synthetic root missing');
createRoot(container).render(<App />);
if (offline) void offline.start();

// Fixed synthetic proof surface; never compiled into the ordinary product.
Object.defineProperty(window, 'phase3cProof', {
  value: {
    state: () => runtime.session().state(),
    presentation: () => publicPresentation,
    offline: () => offline?.snapshot() ?? null,
    fault: (value: Parameters<typeof runtime.fault>[0]) => runtime.fault(value),
    holdWrites: (value: boolean) => runtime.holdWrites(value),
    held: runtime.held,
    refresh: runtime.notify,
  },
  writable: false,
});
