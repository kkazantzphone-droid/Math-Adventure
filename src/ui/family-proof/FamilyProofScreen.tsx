import type { ReactNode, RefObject } from 'react';
import { PROOF_FAMILY_IDS } from '../../application/family-proof';
import type {
  FamilyProof,
  ProofFamilyId,
} from '../../application/family-proof';
import {
  formatInteger,
  formatMessage,
  resolvePrototypeLocale,
} from '../../presentation/localisation';
import type {
  LanguagePreferences,
  SimpleMessageId,
} from '../../presentation/localisation';
import { PROOF_CLASS_IDS } from './answers';

type ProofPoint = NonNullable<FamilyProof['units']>[number]['start'];

export type ProofFeedback =
  'none' | 'correct' | 'retry' | 'unavailable' | 'selection';

export interface FamilyProofScreenProps {
  readonly proof: FamilyProof | null;
  readonly familyId: ProofFamilyId;
  readonly seedHex: string;
  readonly preferences: LanguagePreferences;
  readonly response: string;
  readonly selectedClasses: readonly string[];
  readonly hintVisible: boolean;
  readonly unitIndex: number;
  readonly feedback: ProofFeedback;
  readonly textScale?: 200;
  readonly speechControls?: ReactNode;
  readonly headingRef?: RefObject<HTMLHeadingElement | null>;
  readonly onFamily: (familyId: ProofFamilyId) => void;
  readonly onSeed: (seedHex: string) => void;
  readonly onReplay: () => void;
  readonly onResponse: (value: string) => void;
  readonly onClass: (classId: string, selected: boolean) => void;
  readonly onHint: () => void;
  readonly onSubmit: () => void;
  readonly onRetry: () => void;
  readonly onNextUnit: () => void;
  readonly onStartUnits: () => void;
}

function coordinates(point: ProofPoint): readonly [number, number] {
  // Numeric projection is strictly for SVG layout, never validation or measurement.
  return [
    Number(point.x.numerator) / Number(point.x.denominator),
    Number(point.y.numerator) / Number(point.y.denominator),
  ];
}

function viewport(points: readonly ProofPoint[]): string {
  const xy = points.map(coordinates);
  const xs = xy.map(([x]) => x);
  const ys = xy.map(([, y]) => y);
  const left = Math.min(...xs) - 1;
  const top = Math.min(...ys) - 1;
  return `${left} ${top} ${Math.max(...xs) - left + 1} ${Math.max(...ys) - top + 1}`;
}

function labelSize(points: readonly ProofPoint[]): number {
  const xy = points.map(coordinates);
  const xs = xy.map(([x]) => x);
  const ys = xy.map(([, y]) => y);
  return (
    Math.max(
      Math.max(...xs) - Math.min(...xs) + 2,
      Math.max(...ys) - Math.min(...ys) + 2,
    ) / 16
  );
}

function familyMessage(familyId: ProofFamilyId): SimpleMessageId {
  return familyId === 'number.addition'
    ? 'proof.number'
    : familyId === 'geometry.quadrilateral'
      ? 'proof.geometry'
      : 'proof.measurement';
}

/** Public task data only: this view never receives an answer contract or expected value. */
export function FamilyProofScreen({
  headingRef,
  ...props
}: FamilyProofScreenProps) {
  const uiLocale = resolvePrototypeLocale(
    props.preferences.uiLocale,
  ).effectiveLocale;
  const instructionLocale = resolvePrototypeLocale(
    props.preferences.instructionLocale,
  ).effectiveLocale;
  const ui = (id: SimpleMessageId) => formatMessage(uiLocale, id);
  const instruction = (id: SimpleMessageId) =>
    formatMessage(instructionLocale, id);
  const proof = props.proof;
  const task = proof?.task;
  const addition =
    task?.kind === 'evaluateExpression' && task.expression.root.kind === 'add'
      ? task.expression.root
      : null;
  const polygon =
    task?.kind === 'classifyGeometry'
      ? task.scene.objects.find(
          (object) => object.id === task.objectId && object.kind === 'polygon',
        )
      : null;
  const units = proof?.units ?? [];
  const unit = units[props.unitIndex];
  const firstUnit = units[0];
  const lastUnit = units.at(-1);
  const prompt: SimpleMessageId =
    props.familyId === 'number.addition'
      ? 'proof.additionPrompt'
      : props.familyId === 'geometry.quadrilateral'
        ? 'proof.geometryPrompt'
        : 'proof.measurementPrompt';
  const hint: SimpleMessageId =
    props.familyId === 'number.addition'
      ? 'proof.hintAddition'
      : props.familyId === 'geometry.quadrilateral'
        ? 'proof.hintGeometry'
        : 'proof.hintMeasurement';

  return (
    <main
      className="prototype family-proof"
      data-theme="space"
      data-text-scale={props.textScale}
      lang={uiLocale}
    >
      <div className="prototype-shell">
        <header className="prototype-header">
          <span className="wordmark" lang="en-GB">
            Math Adventure
          </span>
          <span>{ui('proof.heading')}</span>
        </header>
        <div className="prototype-content">
          <h1 className="screen-heading" tabIndex={-1} ref={headingRef}>
            {ui('proof.heading')}
          </h1>
          <p className="screen-intro">{ui('proof.intro')}</p>
          <form
            className="proof-settings"
            onSubmit={(event) => {
              event.preventDefault();
              props.onReplay();
            }}
          >
            <label htmlFor="proof-family">{ui('proof.familyLabel')}</label>
            <select
              id="proof-family"
              value={props.familyId}
              onChange={(event) => {
                const familyId = PROOF_FAMILY_IDS.find(
                  (id) => id === event.currentTarget.value,
                );
                if (familyId !== undefined) props.onFamily(familyId);
              }}
            >
              {PROOF_FAMILY_IDS.map((id) => (
                <option key={id} value={id}>
                  {ui(familyMessage(id))}
                </option>
              ))}
            </select>
            <label htmlFor="proof-seed">{ui('proof.seed')}</label>
            <input
              id="proof-seed"
              type="text"
              value={props.seedHex}
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => props.onSeed(event.currentTarget.value)}
            />
            <button className="nav-button" type="submit">
              {ui('proof.replay')}
            </button>
          </form>
          {props.speechControls}
          {proof === null ? (
            <p lang={instructionLocale}>{instruction('proof.unavailable')}</p>
          ) : (
            <section
              className="task-panel proof-task"
              lang={instructionLocale}
              aria-labelledby="proof-task-heading"
            >
              <h2 id="proof-task-heading">{instruction(prompt)}</h2>
              {addition !== null &&
                addition.left.kind === 'literal' &&
                addition.right.kind === 'literal' && (
                  <p className="proof-expression">
                    <span>{addition.left.value.numerator}</span>
                    <span>{instruction('proof.plus')}</span>
                    <span>{addition.right.value.numerator}</span>
                    <span aria-hidden="true">= ?</span>
                  </p>
                )}
              {polygon?.kind === 'polygon' && proof.geometry !== undefined && (
                <div className="proof-geometry">
                  <svg
                    className="proof-scene"
                    viewBox={viewport(polygon.vertices)}
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label={instruction('proof.outline')}
                    focusable="false"
                  >
                    <polygon
                      points={polygon.vertices
                        .map((point) => coordinates(point).join(','))
                        .join(' ')}
                    />
                    {polygon.vertices.map((point, index) => {
                      const [x, y] = coordinates(point);
                      return (
                        <text
                          x={x}
                          y={y}
                          fontSize={labelSize(polygon.vertices)}
                          key={index}
                          aria-hidden="true"
                        >
                          {String.fromCharCode(65 + index)}
                        </text>
                      );
                    })}
                  </svg>
                  <section
                    className="proof-attributes"
                    aria-labelledby="proof-attributes-heading"
                  >
                    <h3 id="proof-attributes-heading">
                      {instruction('proof.attributes')}
                    </h3>
                    {proof.geometry.sideLengthSquares.map((value, index) => (
                      <p key={`side-${index}`}>
                        {String.fromCharCode(65 + index)} →{' '}
                        {String.fromCharCode(65 + ((index + 1) % 4))}:{' '}
                        {instruction('proof.squaredSide')}{' '}
                        {formatInteger(instructionLocale, value)}
                      </p>
                    ))}
                    {proof.geometry.rightAngles.map((right, index) => (
                      <p key={`angle-${index}`}>
                        {String.fromCharCode(65 + index)}:{' '}
                        {instruction(
                          right ? 'proof.rightAngle' : 'proof.notRightAngle',
                        )}
                      </p>
                    ))}
                  </section>
                </div>
              )}
              {task?.kind === 'measureGeometry' &&
                firstUnit !== undefined &&
                lastUnit !== undefined && (
                  <div className="proof-measurement">
                    <svg
                      className="proof-scene"
                      viewBox={viewport([firstUnit.start, lastUnit.end])}
                      preserveAspectRatio="xMidYMid meet"
                      aria-hidden="true"
                      focusable="false"
                    >
                      {units.map((step, index) => {
                        const [x1, y1] = coordinates(step.start);
                        const [x2, y2] = coordinates(step.end);
                        return (
                          <g key={index}>
                            <line x1={x1} y1={y1} x2={x2} y2={y2} />
                            <circle cx={x1} cy={y1} r="0.1" />
                            <circle cx={x2} cy={y2} r="0.1" />
                          </g>
                        );
                      })}
                    </svg>
                    <div className="proof-unit-traversal">
                      <p id="proof-unit-step">
                        {props.unitIndex < 0 ? (
                          instruction('proof.beginning')
                        ) : unit === undefined ? (
                          instruction('proof.end')
                        ) : (
                          <>
                            {instruction('proof.unitStep')}:{' '}
                            {String.fromCharCode(65 + props.unitIndex)} →{' '}
                            {String.fromCharCode(66 + props.unitIndex)}
                          </>
                        )}
                      </p>
                      <button
                        className="nav-button"
                        type="button"
                        aria-describedby="proof-unit-step"
                        onClick={props.onNextUnit}
                      >
                        {ui('proof.nextUnit')}
                      </button>
                      <button
                        className="nav-button"
                        type="button"
                        onClick={props.onStartUnits}
                      >
                        {ui('proof.startAgain')}
                      </button>
                    </div>
                  </div>
                )}
              <button
                className="hint-button"
                type="button"
                lang={uiLocale}
                aria-expanded={props.hintVisible}
                aria-controls="proof-hint"
                onClick={props.onHint}
              >
                {ui('showMe')}
              </button>
              <div
                id="proof-hint"
                className="hint"
                hidden={!props.hintVisible}
                data-hint-kind={proof.hint.kind}
              >
                <p>{instruction(hint)}</p>
                {props.hintVisible &&
                  addition !== null &&
                  addition.left.kind === 'literal' &&
                  addition.right.kind === 'literal' && (
                    <div className="dot-equation" aria-hidden="true">
                      {[addition.left.value, addition.right.value].map(
                        (value, index) => (
                          <span className="dot-group-wrap" key={index}>
                            {index === 1 && <span className="dot-plus">+</span>}
                            <span className="dot-group">
                              {Array.from(
                                { length: Number(value.numerator) },
                                (_, dot) => (
                                  <span className="dot" key={dot} />
                                ),
                              )}
                            </span>
                          </span>
                        ),
                      )}
                    </div>
                  )}
              </div>
              <form
                className="proof-answer"
                onSubmit={(event) => {
                  event.preventDefault();
                  props.onSubmit();
                }}
              >
                {props.familyId === 'geometry.quadrilateral' ? (
                  <fieldset>
                    <legend>{instruction('proof.geometryPrompt')}</legend>
                    {PROOF_CLASS_IDS.map((classId, index) => (
                      <label className="proof-class-choice" key={classId}>
                        <input
                          type="checkbox"
                          value={classId}
                          checked={props.selectedClasses.includes(classId)}
                          onChange={(event) =>
                            props.onClass(classId, event.currentTarget.checked)
                          }
                        />
                        {instruction(
                          index === 0
                            ? 'proof.parallelogram'
                            : index === 1
                              ? 'proof.rectangle'
                              : 'proof.square',
                        )}
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <label
                    className="proof-number-response"
                    htmlFor="proof-response"
                  >
                    {instruction(
                      props.familyId === 'number.addition'
                        ? 'proof.numberAnswer'
                        : 'proof.lengthAnswer',
                    )}
                    <select
                      id="proof-response"
                      value={props.response}
                      required
                      onChange={(event) =>
                        props.onResponse(event.currentTarget.value)
                      }
                    >
                      <option value="">
                        {instruction('proof.chooseAnswer')}
                      </option>
                      {Array.from(
                        {
                          length: props.familyId === 'number.addition' ? 11 : 8,
                        },
                        (_, index) =>
                          props.familyId === 'number.addition'
                            ? index
                            : index + 1,
                      ).map((value) => (
                        <option key={value} value={value}>
                          {formatInteger(instructionLocale, value)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  className="primary-button"
                  type="submit"
                  lang={uiLocale}
                >
                  {ui('proof.check')}
                </button>
              </form>
              <div
                className="feedback"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {props.feedback !== 'none' &&
                  instruction(
                    props.feedback === 'correct'
                      ? 'success'
                      : props.feedback === 'retry'
                        ? 'retry'
                        : props.feedback === 'selection'
                          ? 'proof.selectClasses'
                          : 'proof.unavailable',
                  )}
              </div>
              <button
                className="nav-button"
                type="button"
                lang={uiLocale}
                onClick={props.onRetry}
              >
                {ui('retry')}
              </button>
            </section>
          )}
        </div>
        <footer className="prototype-footer">{ui('proof.intro')}</footer>
      </div>
    </main>
  );
}
