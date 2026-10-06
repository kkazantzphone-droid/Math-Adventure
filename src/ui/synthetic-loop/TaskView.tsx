import { useState } from 'react';
import type { FamilyProof } from '../../application/family-proof';
import type { SliceFamilyPresentation } from '../../application/slice-family';
import type { QuantityItem } from '../../domain/families/slice';
import type { ExactPoint } from '../../domain/geometry/scene';
import {
  formatInteger,
  formatMessage,
  resolvePrototypeLocale,
} from '../../presentation/localisation';
import type {
  LanguagePreferences,
  SimpleMessageId,
} from '../../presentation/localisation';
import { formatSlice } from '../../presentation/localisation/slice-copy';
import type { SliceMessageId } from '../../presentation/localisation/slice-copy';

export type LoopPresentation = FamilyProof | SliceFamilyPresentation;
export type LoopFeedback =
  'none' | 'correct' | 'retry' | 'incorrect' | 'unavailable' | 'selection';
export interface TaskViewProps {
  readonly task: LoopPresentation | null;
  readonly preferences: LanguagePreferences;
  readonly response: string;
  readonly selectedClasses: readonly string[];
  readonly hintVisible: boolean;
  readonly feedback: LoopFeedback;
  readonly disabled?: boolean;
  readonly retryDisabled?: boolean;
  readonly contextKey?: string;
  readonly onResponse: (value: string) => void;
  readonly onClass: (classId: string, selected: boolean) => void;
  readonly onHint: () => void;
  readonly onSubmit: () => void;
  readonly onRetry: () => void;
  readonly onAccessibleSupport?: () => void;
}

type PlainSliceId = Exclude<
  SliceMessageId,
  | 'slice.profileChoice'
  | 'slice.profileSelected'
  | 'slice.missingPosition'
  | 'slice.savedActivities'
>;
const classChoices = [
  ['geometry.parallelogram', 'proof.parallelogram'],
  ['geometry.rectangle', 'proof.rectangle'],
  ['geometry.square', 'proof.square'],
] as const;
const relationChoices = [
  ['comparison.less', 'slice.comparisonLess'],
  ['comparison.equal', 'slice.comparisonEqual'],
  ['comparison.greater', 'slice.comparisonGreater'],
] as const;

function coordinates(point: ExactPoint): readonly [number, number] {
  // Layout projection only. The domain validates logical geometry independently.
  return [
    Number(point.x.numerator) / Number(point.x.denominator),
    Number(point.y.numerator) / Number(point.y.denominator),
  ];
}
function viewport(points: readonly ExactPoint[]): string {
  const xy = points.map(coordinates),
    xs = xy.map(([x]) => x),
    ys = xy.map(([, y]) => y);
  const left = Math.min(...xs) - 1,
    top = Math.min(...ys) - 1;
  return `${left} ${top} ${Math.max(...xs) - left + 1} ${Math.max(...ys) - top + 1}`;
}
function labelSize(points: readonly ExactPoint[]): number {
  const xy = points.map(coordinates);
  const xs = xy.map(([x]) => x),
    ys = xy.map(([, y]) => y);
  return (
    Math.max(
      Math.max(...xs) - Math.min(...xs) + 2,
      Math.max(...ys) - Math.min(...ys) + 2,
    ) / 16
  );
}

function QuantityGroup({
  items,
  layout = 'row',
  removedIds = [],
  interactive = false,
  label,
  itemLabel,
  removedLabel,
  emptyLabel,
  disabled,
  onSupport,
  scope,
}: {
  readonly items: readonly QuantityItem[];
  readonly layout?: 'row' | 'pairs';
  readonly removedIds?: readonly string[];
  readonly interactive?: boolean;
  readonly label: string;
  readonly itemLabel: string;
  readonly removedLabel: string;
  readonly emptyLabel: string;
  readonly disabled?: boolean | undefined;
  readonly onSupport?: (() => void) | undefined;
  readonly scope: string;
}) {
  const [counted, setCounted] = useState<{
    readonly scope: string;
    readonly ids: readonly string[];
  }>({ scope, ids: [] });
  const countedIds = counted.scope === scope ? counted.ids : [];
  return (
    <div
      className="slice-token-group"
      data-layout={layout}
      role="group"
      aria-label={label}
    >
      {items.length === 0 ? (
        <span className="slice-empty-group">{emptyLabel}</span>
      ) : (
        items.map((item) => {
          const removed = removedIds.includes(item.id);
          const content = <span aria-hidden="true">{removed ? '×' : '●'}</span>;
          return interactive ? (
            <button
              className={`slice-token${removed ? ' removed' : ''}`}
              key={item.id}
              type="button"
              disabled={disabled}
              aria-label={removed ? removedLabel : itemLabel}
              aria-pressed={countedIds.includes(item.id)}
              onClick={() => {
                setCounted({
                  scope,
                  ids: countedIds.includes(item.id)
                    ? countedIds.filter((id) => id !== item.id)
                    : [...countedIds, item.id],
                });
                onSupport?.();
              }}
            >
              {content}
            </button>
          ) : (
            <span
              className={`slice-token${removed ? ' removed' : ''}`}
              key={item.id}
              role="img"
              aria-label={removed ? removedLabel : itemLabel}
            >
              {content}
            </span>
          );
        })
      )}
    </div>
  );
}

/** Receives public tasks only; correctness and save acknowledgement belong outside. */
export function TaskView(props: TaskViewProps) {
  const uiLocale = resolvePrototypeLocale(
    props.preferences.uiLocale,
  ).effectiveLocale;
  const instructionLocale = resolvePrototypeLocale(
    props.preferences.instructionLocale,
  ).effectiveLocale;
  const ui = (key: SimpleMessageId) => formatMessage(uiLocale, key);
  const instruction = (key: SimpleMessageId) =>
    formatMessage(instructionLocale, key);
  const sliceUi = (key: PlainSliceId) => formatSlice(uiLocale, key);
  const sliceInstruction = (key: PlainSliceId) =>
    formatSlice(instructionLocale, key);
  const presentation = props.task,
    task = presentation?.task;
  const replayKey = presentation
    ? `${props.contextKey ?? ''}:${presentation.familyId}:${presentation.replay.seedHex}`
    : '';
  const [unitCursor, setUnitCursor] = useState({ replayKey, index: -1 });
  const unitIndex = unitCursor.replayKey === replayKey ? unitCursor.index : -1;
  const proof = presentation && 'units' in presentation ? presentation : null;
  const geometryProof =
    presentation && 'geometry' in presentation ? presentation : null;
  const units = proof?.units ?? [],
    firstUnit = units[0],
    lastUnit = units.at(-1),
    currentUnit = units[unitIndex];
  const polygon =
    task?.kind === 'classifyGeometry'
      ? task.scene.objects.find(
          (object) => object.id === task.objectId && object.kind === 'polygon',
        )
      : null;
  const addition =
    task?.kind === 'evaluateExpression' && task.expression.root.kind === 'add'
      ? task.expression.root
      : null;
  const group = {
    label: sliceInstruction('slice.quantityItems'),
    itemLabel: sliceInstruction('slice.item'),
    removedLabel: sliceInstruction('slice.removedItem'),
    emptyLabel: sliceInstruction('slice.emptyGroup'),
    disabled: props.disabled,
    onSupport: props.onAccessibleSupport,
    scope: replayKey,
  };
  const newPrompt: PlainSliceId =
    task?.kind === 'numeralRecognition'
      ? 'slice.numeralPrompt'
      : task?.kind === 'countItems'
        ? 'slice.countPrompt'
        : task?.kind === 'compareQuantities'
          ? 'slice.comparePrompt'
          : task?.kind === 'subtractItems'
            ? 'slice.subtractPrompt'
            : 'slice.missingNumberPrompt';
  const newHint: PlainSliceId =
    task?.kind === 'numeralRecognition'
      ? 'slice.numeralHint'
      : task?.kind === 'countItems'
        ? 'slice.countHint'
        : task?.kind === 'compareQuantities'
          ? 'slice.compareHint'
          : task?.kind === 'subtractItems'
            ? 'slice.subtractHint'
            : 'slice.missingNumberHint';
  const oldPrompt: SimpleMessageId =
    task?.kind === 'classifyGeometry'
      ? 'proof.geometryPrompt'
      : task?.kind === 'measureGeometry'
        ? 'proof.measurementPrompt'
        : 'proof.additionPrompt';
  const oldHint: SimpleMessageId =
    task?.kind === 'classifyGeometry'
      ? 'proof.hintGeometry'
      : task?.kind === 'measureGeometry'
        ? 'proof.hintMeasurement'
        : 'proof.hintAddition';
  const newFamily =
    presentation?.familyId !== 'number.addition' &&
    presentation?.familyId !== 'geometry.quadrilateral' &&
    presentation?.familyId !== 'measurement.unit-length';
  return (
    <section
      className="slice-task"
      lang={instructionLocale}
      aria-labelledby={task ? 'slice-task-heading' : undefined}
    >
      {task && (
        <>
          <h2 id="slice-task-heading" tabIndex={-1}>
            {newFamily ? sliceInstruction(newPrompt) : instruction(oldPrompt)}
          </h2>
          {addition?.left.kind === 'literal' &&
            addition.right.kind === 'literal' && (
              <div>
                <p className="slice-equation">
                  <span>{addition.left.value.numerator}</span>
                  <span>{instruction('proof.plus')}</span>
                  <span>{addition.right.value.numerator}</span>
                  <span aria-hidden="true">= ?</span>
                </p>
                <div className="slice-quantity-pair">
                  {[addition.left.value, addition.right.value].map(
                    (operand, index) => (
                      <QuantityGroup
                        {...group}
                        key={index}
                        label={sliceInstruction(
                          index === 0
                            ? 'slice.firstGroup'
                            : 'slice.secondGroup',
                        )}
                        items={Array.from(
                          { length: Number(operand.numerator) },
                          (_, item) => ({
                            id: `add-${index}-${item}`,
                            column: item,
                            row: 0,
                          }),
                        )}
                        interactive
                      />
                    ),
                  )}
                </div>
              </div>
            )}
          {task.kind === 'numeralRecognition' && (
            <p className="slice-numeral">{task.numeral.numerator}</p>
          )}
          {task.kind === 'countItems' && (
            <QuantityGroup
              {...group}
              items={task.items}
              layout={task.layout}
              interactive
            />
          )}
          {task.kind === 'compareQuantities' && (
            <div className="slice-quantity-pair">
              <div>
                <h3>{sliceInstruction('slice.firstGroup')}</h3>
                <QuantityGroup
                  {...group}
                  label={sliceInstruction('slice.firstGroup')}
                  items={task.left}
                  interactive
                />
              </div>
              <div>
                <h3>{sliceInstruction('slice.secondGroup')}</h3>
                <QuantityGroup
                  {...group}
                  label={sliceInstruction('slice.secondGroup')}
                  items={task.right}
                  interactive
                />
              </div>
            </div>
          )}
          {task.kind === 'subtractItems' && (
            <QuantityGroup
              {...group}
              items={task.items}
              removedIds={task.removedIds}
              interactive
            />
          )}
          {task.kind === 'missingNumber' && (
            <>
              <p>
                {formatSlice(instructionLocale, 'slice.missingPosition', {
                  position: task.unknownPosition,
                })}
              </p>
              <p className="slice-equation">
                <span>{task.left?.numerator ?? '?'}</span>
                <span>{instruction('proof.plus')}</span>
                <span>{task.right?.numerator ?? '?'}</span>
                <span>=</span>
                <span>{task.total?.numerator ?? '?'}</span>
              </p>
            </>
          )}
          {polygon?.kind === 'polygon' && geometryProof?.geometry && (
            <div className="slice-geometry">
              <svg
                className="slice-scene"
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
                      key={index}
                      x={x}
                      y={y}
                      fontSize={labelSize(polygon.vertices)}
                      aria-hidden="true"
                    >
                      {String.fromCharCode(65 + index)}
                    </text>
                  );
                })}
              </svg>
              <section
                className="slice-attributes"
                aria-labelledby="slice-attributes-heading"
              >
                <h3 id="slice-attributes-heading">
                  {instruction('proof.attributes')}
                </h3>
                {geometryProof.geometry.sideLengthSquares.map(
                  (length, index) => (
                    <p key={`side-${index}`}>
                      {String.fromCharCode(65 + index)} →{' '}
                      {String.fromCharCode(65 + ((index + 1) % 4))}:{' '}
                      {instruction('proof.squaredSide')}{' '}
                      {formatInteger(instructionLocale, length)}
                    </p>
                  ),
                )}
                {geometryProof.geometry.rightAngles.map((right, index) => (
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
          {task.kind === 'measureGeometry' && firstUnit && lastUnit && (
            <div className="slice-measurement">
              <svg
                className="slice-scene"
                viewBox={viewport([firstUnit.start, lastUnit.end])}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
                focusable="false"
              >
                {units.map((unit, index) => {
                  const [x1, y1] = coordinates(unit.start),
                    [x2, y2] = coordinates(unit.end);
                  return (
                    <g key={index}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} />
                      <circle cx={x1} cy={y1} r="0.1" />
                      <circle cx={x2} cy={y2} r="0.1" />
                    </g>
                  );
                })}
              </svg>
              <p aria-live="polite" aria-atomic="true">
                {unitIndex < 0
                  ? instruction('proof.beginning')
                  : currentUnit
                    ? `${instruction('proof.unitStep')}: ${String.fromCharCode(65 + unitIndex)} → ${String.fromCharCode(66 + unitIndex)}`
                    : instruction('proof.end')}
              </p>
              <div className="slice-actions" lang={uiLocale}>
                <button
                  type="button"
                  disabled={props.disabled}
                  onClick={() => {
                    setUnitCursor({
                      replayKey,
                      index: Math.min(unitIndex + 1, units.length),
                    });
                    props.onAccessibleSupport?.();
                  }}
                >
                  {ui('proof.nextUnit')}
                </button>
                <button
                  type="button"
                  disabled={props.disabled}
                  onClick={() => setUnitCursor({ replayKey, index: -1 })}
                >
                  {ui('proof.startAgain')}
                </button>
              </div>
            </div>
          )}
          <button
            className="hint-button"
            lang={uiLocale}
            type="button"
            disabled={props.disabled}
            aria-expanded={props.hintVisible}
            aria-controls="slice-hint"
            onClick={props.onHint}
          >
            {ui('showMe')}
          </button>
          <div
            id="slice-hint"
            className="slice-hint"
            hidden={!props.hintVisible}
          >
            <p>
              {newFamily ? sliceInstruction(newHint) : instruction(oldHint)}
            </p>
            {props.hintVisible &&
              addition?.left.kind === 'literal' &&
              addition.right.kind === 'literal' && (
                <div className="slice-quantity-pair" aria-hidden="true">
                  {[addition.left.value, addition.right.value].map(
                    (operand, index) => (
                      <div key={index}>
                        {Array.from(
                          { length: Number(operand.numerator) },
                          (_, item) => (
                            <span className="slice-token" key={item}>
                              ●
                            </span>
                          ),
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}
          </div>
          <form
            className="slice-answer"
            onSubmit={(event) => {
              event.preventDefault();
              props.onSubmit();
            }}
          >
            {task.kind === 'classifyGeometry' ? (
              <fieldset disabled={props.disabled}>
                <legend>{instruction('proof.geometryPrompt')}</legend>
                {classChoices.map(([classId, label]) => (
                  <label className="slice-class-choice" key={classId}>
                    <input
                      type="checkbox"
                      checked={props.selectedClasses.includes(classId)}
                      value={classId}
                      onChange={(event) =>
                        props.onClass(classId, event.currentTarget.checked)
                      }
                    />
                    {instruction(label)}
                  </label>
                ))}
              </fieldset>
            ) : task.kind === 'compareQuantities' ? (
              <fieldset disabled={props.disabled}>
                <legend>{sliceInstruction('slice.answerLabel')}</legend>
                {relationChoices.map(([relation, label]) => (
                  <label className="slice-class-choice" key={relation}>
                    <input
                      type="radio"
                      name="slice-relation"
                      value={relation}
                      checked={props.response === relation}
                      onChange={() => props.onResponse(relation)}
                    />
                    {sliceInstruction(label)}
                  </label>
                ))}
              </fieldset>
            ) : task.kind === 'numeralRecognition' ? (
              <fieldset disabled={props.disabled}>
                <legend>{sliceInstruction('slice.answerLabel')}</legend>
                <div className="slice-numeral-choices">
                  {task.choices.map((choice, index) => (
                    <button
                      className="slice-quantity-choice"
                      type="button"
                      key={choice.value.numerator}
                      aria-pressed={props.response === choice.value.numerator}
                      onClick={() => props.onResponse(choice.value.numerator)}
                    >
                      <span>
                        {sliceInstruction('slice.groupChoice')}{' '}
                        {String.fromCharCode(65 + index)}
                      </span>
                      <QuantityGroup {...group} items={choice.items} />
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : (
              <label className="slice-number-choice" htmlFor="slice-response">
                {task.kind === 'measureGeometry'
                  ? instruction('proof.lengthAnswer')
                  : sliceInstruction('slice.answerLabel')}
                <select
                  id="slice-response"
                  disabled={props.disabled}
                  value={props.response}
                  required
                  onChange={(event) =>
                    props.onResponse(event.currentTarget.value)
                  }
                >
                  <option value="">
                    {sliceInstruction('slice.answerLabel')}
                  </option>
                  {Array.from(
                    {
                      length:
                        task.kind === 'measureGeometry'
                          ? 8
                          : task.kind === 'evaluateExpression' ||
                              task.kind === 'missingNumber'
                            ? 11
                            : 6,
                    },
                    (_, index) =>
                      task.kind === 'measureGeometry' ? index + 1 : index,
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
              lang={uiLocale}
              type="submit"
              disabled={props.disabled}
            >
              {ui('proof.check')}
            </button>
          </form>
        </>
      )}
      <div
        className="slice-feedback"
        id="slice-feedback"
        lang={uiLocale}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {!task
          ? sliceUi('slice.noTask')
          : props.feedback === 'none'
            ? ''
            : props.feedback === 'correct'
              ? ui('success')
              : props.feedback === 'retry' || props.feedback === 'incorrect'
                ? ui('retry')
                : props.feedback === 'selection'
                  ? sliceUi('slice.answerLabel')
                  : ui('proof.unavailable')}
      </div>
      {task && (
        <button
          type="button"
          lang={uiLocale}
          disabled={props.retryDisabled ?? props.disabled}
          onClick={props.onRetry}
        >
          {ui('retry')}
        </button>
      )}
    </section>
  );
}
