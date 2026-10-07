import { useId, useState } from 'react';
import type { StructuredAnswer } from '../../domain/puzzles/contracts';
import type { LanguagePreferences } from '../../presentation/localisation';
import { resolvePrototypeLocale } from '../../presentation/localisation';
import { childCopy } from '../../presentation/localisation/child-copy';
import type { LoopFeedback, LoopPresentation } from './TaskView';
import {
  CHILD_RELATION_CHOICES,
  CHILD_SHAPE_CHOICES,
  childNumberAnswer,
} from './child-answers';
import {
  ChildAnswerCard,
  ChildShapePicture,
  ChildSideLabel,
  ChildTokens,
} from './ChildPrimitives';
import { childItems, childPoint, childViewport } from './child-layout';
import './child-task.css';

export interface ChildTaskViewProps {
  readonly task: LoopPresentation | null;
  readonly preferences: LanguagePreferences;
  readonly feedback: LoopFeedback;
  readonly hintTier: 0 | 1 | 2 | 3;
  readonly disabled?: boolean;
  readonly retryDisabled?: boolean;
  readonly contextKey?: string;
  readonly onAnswer: (answer: StructuredAnswer) => void;
  readonly onHint: () => void;
  readonly onRetry: () => void;
  readonly onAccessibleSupport?: () => void;
}

/** A direct presentation adapter. It neither validates answers nor awards evidence. */
export function ChildTaskView(props: ChildTaskViewProps) {
  const uiLocale = resolvePrototypeLocale(
    props.preferences.uiLocale,
  ).effectiveLocale;
  const instructionLocale = resolvePrototypeLocale(
    props.preferences.instructionLocale,
  ).effectiveLocale;
  const ui = childCopy(uiLocale),
    instruction = childCopy(instructionLocale);
  const prefix = useId();
  const task = props.task?.task;
  const scope = `${props.contextKey ?? ''}:${props.task?.familyId ?? ''}:${props.task?.replay.seedHex ?? ''}`;
  const [walk, setWalk] = useState({ scope, index: -1 });
  const [guide, setGuide] = useState({ scope, stage: 3, replay: 0 });
  const walkIndex = walk.scope === scope ? walk.index : -1;
  // Replaying the pictures never reduces the maximum mathematical help used.
  const tier =
    props.hintTier === 3 && guide.scope === scope
      ? guide.stage
      : props.hintTier;
  const tokens = {
    scope: `${scope}:guide:${guide.scope === scope ? guide.replay : 0}`,
    dotLabel: instruction.dot,
    emptyLabel: instruction.empty,
    removedLabel: instruction.removed,
    disabled: props.disabled,
    onSupport: props.onAccessibleSupport,
  };
  const prompt =
    task?.kind === 'evaluateExpression'
      ? instruction.addition
      : task?.kind === 'classifyGeometry'
        ? instruction.shape
        : task?.kind === 'measureGeometry'
          ? instruction.length
          : task?.kind === 'numeralRecognition'
            ? instruction.numeral
            : task?.kind === 'countItems'
              ? instruction.counting
              : task?.kind === 'compareQuantities'
                ? instruction.comparison
                : task?.kind === 'subtractItems'
                  ? instruction.subtraction
                  : instruction.missing;
  const help =
    task?.kind === 'evaluateExpression'
      ? instruction.additionHelp
      : task?.kind === 'classifyGeometry'
        ? instruction.shapeHelp
        : task?.kind === 'measureGeometry'
          ? instruction.lengthHelp
          : task?.kind === 'numeralRecognition'
            ? instruction.numeralHelp
            : task?.kind === 'countItems'
              ? instruction.countingHelp
              : task?.kind === 'compareQuantities'
                ? instruction.comparisonHelp
                : task?.kind === 'subtractItems'
                  ? instruction.subtractionHelp
                  : instruction.missingHelp;
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
  const units =
    props.task && 'units' in props.task ? (props.task.units ?? []) : [];
  const firstUnit = units[0],
    lastUnit = units.at(-1);
  const chooseNumber = (value: string) => {
    if (!task) return;
    const answer = childNumberAnswer(task.kind, value);
    if (answer) props.onAnswer(answer);
  };
  return (
    <section
      className="child-task slice-task"
      lang={instructionLocale}
      data-child-hint-tier={props.hintTier}
      data-child-visual-tier={tier}
      data-child-kind={task?.kind}
      aria-labelledby={task ? 'slice-task-heading' : undefined}
    >
      {task && (
        <>
          <h2 id="slice-task-heading" tabIndex={-1}>
            {prompt}
          </h2>
          <div
            className={`child-illustration help-${tier}`}
            data-visual-help={tier > 0 ? task.kind : undefined}
          >
            {addition?.left.kind === 'literal' &&
              addition.right.kind === 'literal' && (
                <>
                  <p className="child-equation">
                    <span>{addition.left.value.numerator}</span>
                    <span>+</span>
                    <span>{addition.right.value.numerator}</span>
                    <span>= ?</span>
                  </p>
                  <div
                    className={`child-addition-groups${tier > 0 ? ' joined' : ''}${tier > 1 ? ' lined-up' : ''}`}
                  >
                    <ChildTokens
                      {...tokens}
                      items={childItems(
                        Number(addition.left.value.numerator),
                        'add-left',
                      )}
                      label={instruction.left}
                      interactive={tier >= 3}
                    />
                    {tier === 0 && (
                      <span className="child-plus" aria-hidden="true">
                        +
                      </span>
                    )}
                    <ChildTokens
                      {...tokens}
                      items={childItems(
                        Number(addition.right.value.numerator),
                        'add-right',
                      )}
                      label={instruction.right}
                      interactive={tier >= 3}
                    />
                  </div>
                </>
              )}
            {task.kind === 'numeralRecognition' && (
              <p className="child-numeral">{task.numeral.numerator}</p>
            )}
            {task.kind === 'countItems' && (
              <ChildTokens
                {...tokens}
                items={task.items}
                label={instruction.group}
                layout={tier === 0 ? task.layout : 'row'}
                interactive={tier >= 2}
              />
            )}
            {task.kind === 'subtractItems' && (
              <ChildTokens
                {...tokens}
                items={task.items}
                removedIds={task.removedIds}
                label={instruction.group}
                separateRemoved={tier >= 1}
                interactive={tier >= 2}
              />
            )}
            {task.kind === 'compareQuantities' &&
              (tier === 0 ? (
                <div className="child-comparison-groups">
                  <div>
                    <h3>
                      <ChildSideLabel side="left" label={instruction.left} />
                    </h3>
                    <ChildTokens
                      {...tokens}
                      items={task.left}
                      label={instruction.left}
                    />
                  </div>
                  <div>
                    <h3>
                      <ChildSideLabel side="right" label={instruction.right} />
                    </h3>
                    <ChildTokens
                      {...tokens}
                      items={task.right}
                      label={instruction.right}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className={`child-pairing help-${tier}`}
                  role="group"
                  aria-label={instruction.comparison}
                >
                  <div className="child-pair-row">
                    <span>
                      <ChildSideLabel side="left" label={instruction.left} />
                    </span>
                    <span aria-hidden="true" />
                    <span>
                      <ChildSideLabel side="right" label={instruction.right} />
                    </span>
                  </div>
                  {task.left.length === 0 && task.right.length === 0 && (
                    <p>{instruction.empty}</p>
                  )}
                  {Array.from(
                    { length: Math.max(task.left.length, task.right.length) },
                    (_, index) => (
                      <div className="child-pair-row" key={index}>
                        {task.left[index] ? (
                          <ChildTokens
                            {...tokens}
                            items={[task.left[index]]}
                            label={instruction.left}
                            interactive={tier >= 3}
                          />
                        ) : (
                          <span className="child-pair-gap" aria-hidden="true" />
                        )}
                        <span className="child-pair-link" aria-hidden="true">
                          {tier >= 2 && task.left[index] && task.right[index]
                            ? '—'
                            : ''}
                        </span>
                        {task.right[index] ? (
                          <ChildTokens
                            {...tokens}
                            items={[task.right[index]]}
                            label={instruction.right}
                            interactive={tier >= 3}
                          />
                        ) : (
                          <span className="child-pair-gap" aria-hidden="true" />
                        )}
                      </div>
                    ),
                  )}
                </div>
              ))}
            {task.kind === 'missingNumber' && (
              <>
                <p className="child-equation">
                  <span>{task.left?.numerator ?? '?'}</span>
                  <span>+</span>
                  <span>{task.right?.numerator ?? '?'}</span>
                  <span>=</span>
                  <span>{task.total?.numerator ?? '?'}</span>
                </p>
                <div className={`child-part-whole help-${tier}`}>
                  {(
                    [
                      ['left', task.left],
                      ['right', task.right],
                      ['total', task.total],
                    ] as const
                  ).map(([part, value]) => (
                    <div key={part} className="child-part-frame">
                      <h3>
                        {part === 'total'
                          ? instruction.all
                          : part === 'left'
                            ? instruction.left
                            : instruction.right}
                      </h3>
                      {value === null ? (
                        <span className="child-blank" data-unknown-part={part}>
                          ?
                        </span>
                      ) : (
                        <ChildTokens
                          {...tokens}
                          items={childItems(
                            Number(value.numerator),
                            `known-${part}`,
                          )}
                          label={
                            part === 'total'
                              ? instruction.all
                              : instruction.part
                          }
                          interactive={tier >= 3}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {polygon?.kind === 'polygon' && (
              <svg
                className="child-shape-outline"
                viewBox={childViewport(polygon.vertices)}
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={instruction.outline}
                focusable="false"
              >
                <polygon
                  points={polygon.vertices
                    .map((point) => childPoint(point).join(','))
                    .join(' ')}
                />
                {tier >= 1 &&
                  polygon.vertices.map((point, index) => {
                    const [x, y] = childPoint(point);
                    return <circle key={index} cx={x} cy={y} r="0.12" />;
                  })}
                {tier >= 2 &&
                  polygon.vertices.map((point, index) => {
                    const next =
                      polygon.vertices[(index + 1) % polygon.vertices.length];
                    if (!next) return null;
                    const [x1, y1] = childPoint(point),
                      [x2, y2] = childPoint(next);
                    return (
                      <line
                        className={`child-side-pair pair-${index % 2}`}
                        key={index}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                      />
                    );
                  })}
              </svg>
            )}
            {task.kind === 'measureGeometry' && firstUnit && lastUnit && (
              <>
                <svg
                  className="child-unit-line"
                  viewBox={childViewport([firstUnit.start, lastUnit.end])}
                  preserveAspectRatio="xMidYMid meet"
                  role="img"
                  aria-label={instruction.line}
                  focusable="false"
                >
                  {units.map((unit, index) => {
                    const [x1, y1] = childPoint(unit.start),
                      [x2, y2] = childPoint(unit.end);
                    return (
                      <g
                        key={index}
                        className={`child-unit${tier >= 1 ? ` pair-${index % 2}` : ''}${walkIndex === index ? ' walked' : ''}`}
                        data-child-unit
                      >
                        <line x1={x1} y1={y1} x2={x2} y2={y2} />
                        <circle cx={x1} cy={y1} r="0.12" />
                        <circle cx={x2} cy={y2} r="0.12" />
                        {tier >= 2 && (
                          <circle
                            className="child-unit-middle"
                            cx={(x1 + x2) / 2}
                            cy={(y1 + y2) / 2}
                            r="0.16"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
                <button
                  type="button"
                  data-unit-step
                  disabled={props.disabled}
                  className="child-walk-step"
                  aria-label={
                    walkIndex === units.length - 1
                      ? instruction.again
                      : instruction.lengthHelp[2]
                  }
                  onClick={() => {
                    setWalk({
                      scope,
                      index: walkIndex === units.length - 1 ? 0 : walkIndex + 1,
                    });
                    props.onAccessibleSupport?.();
                  }}
                >
                  <span aria-hidden="true">→</span>{' '}
                  {walkIndex === units.length - 1
                    ? instruction.again
                    : instruction.step}
                </button>
                <div
                  className="child-unit-controls"
                  role="group"
                  aria-label={instruction.line}
                >
                  {units.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      data-child-unit-control
                      aria-label={instruction.step}
                      aria-pressed={walkIndex === index}
                      disabled={props.disabled}
                      onClick={() => {
                        setWalk({ scope, index });
                        props.onAccessibleSupport?.();
                      }}
                    >
                      <span aria-hidden="true">→</span>
                    </button>
                  ))}
                </div>
                <p aria-live="polite" aria-atomic="true" data-unit-navigation>
                  <span key={walkIndex}>
                    {walkIndex < 0
                      ? instruction.start
                      : walkIndex === units.length - 1
                        ? instruction.lastStep
                        : walkIndex === 0
                          ? instruction.firstStep
                          : instruction.nextStep}
                  </span>
                </p>
                <button
                  type="button"
                  disabled={props.disabled}
                  onClick={() => {
                    setWalk({ scope, index: -1 });
                    props.onAccessibleSupport?.();
                  }}
                >
                  {instruction.again}
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            className="hint-button"
            lang={uiLocale}
            data-child-help
            disabled={props.disabled}
            aria-controls="slice-hint"
            aria-expanded={props.hintTier > 0}
            onClick={() => {
              if (props.hintTier === 3) {
                setGuide({
                  scope,
                  stage: tier === 3 ? 1 : tier + 1,
                  replay: (guide.scope === scope ? guide.replay : 0) + 1,
                });
                setWalk({ scope, index: -1 });
              }
              props.onHint();
            }}
          >
            {ui.help}
          </button>
          <div
            id="slice-hint"
            className="child-help"
            hidden={tier === 0}
            data-hint-tier={tier}
            data-child-help-result
          >
            <p>{help[Math.max(0, tier - 1)]}</p>
          </div>
          <div
            className="child-answer-cards"
            role="group"
            aria-label={instruction.answers}
          >
            {task.kind === 'classifyGeometry'
              ? CHILD_SHAPE_CHOICES.map((choice) => (
                  <ChildAnswerCard
                    key={choice.key}
                    value={choice.key}
                    disabled={props.disabled}
                    onChoose={() => props.onAnswer(choice.answer)}
                  >
                    <ChildShapePicture
                      kind={choice.key}
                      scaffolded={tier === 3}
                    />
                    <span>{instruction[choice.key]}</span>
                  </ChildAnswerCard>
                ))
              : task.kind === 'compareQuantities'
                ? CHILD_RELATION_CHOICES.map((choice) => (
                    <ChildAnswerCard
                      key={choice.key}
                      value={choice.key}
                      disabled={props.disabled}
                      onChoose={() => props.onAnswer(choice.answer)}
                    >
                      <span
                        className="child-relation-picture"
                        aria-hidden="true"
                      >
                        {choice.key === 'comparison.less'
                          ? '→'
                          : choice.key === 'comparison.greater'
                            ? '←'
                            : '='}
                      </span>
                      <span>
                        {choice.key === 'comparison.less'
                          ? instruction.fewer
                          : choice.key === 'comparison.greater'
                            ? instruction.more
                            : instruction.same}
                      </span>
                    </ChildAnswerCard>
                  ))
                : task.kind === 'numeralRecognition'
                  ? task.choices.map((choice, index) => (
                      <ChildAnswerCard
                        key={index}
                        value={choice.value.numerator}
                        disabled={props.disabled}
                        onChoose={() => chooseNumber(choice.value.numerator)}
                        label={`${instruction.group} ${index + 1}`}
                        describedBy={`${prefix}-group-${index}`}
                      >
                        <ChildTokens
                          {...tokens}
                          items={choice.items}
                          label={instruction.group}
                        />
                        <span
                          className="visually-hidden"
                          id={`${prefix}-group-${index}`}
                        >
                          {choice.items.length === 0
                            ? instruction.empty
                            : choice.items
                                .map(() => instruction.dot)
                                .join('. ')}
                        </span>
                      </ChildAnswerCard>
                    ))
                  : Array.from(
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
                        String(
                          task.kind === 'measureGeometry' ? index + 1 : index,
                        ),
                    ).map((value) => (
                      <ChildAnswerCard
                        key={value}
                        value={value}
                        disabled={props.disabled}
                        onChoose={() => chooseNumber(value)}
                      >
                        <span className="child-answer-number">{value}</span>
                      </ChildAnswerCard>
                    ))}
          </div>
        </>
      )}
      <div
        className="child-feedback"
        id="slice-feedback"
        tabIndex={-1}
        lang={uiLocale}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {props.feedback === 'correct' ? (
          <>
            <span aria-hidden="true">✓ </span>
            {ui.success}
          </>
        ) : props.feedback === 'incorrect' || props.feedback === 'retry' ? (
          <>
            <span aria-hidden="true">↻ </span>
            {ui.retry}
          </>
        ) : props.feedback === 'unavailable' || !task ? (
          ui.unavailable
        ) : props.feedback === 'selection' ? (
          ui.answers
        ) : (
          ''
        )}
      </div>
      {task &&
        (props.feedback === 'retry' || props.feedback === 'incorrect') && (
          <button
            type="button"
            lang={uiLocale}
            data-child-retry
            disabled={props.retryDisabled ?? props.disabled}
            onClick={props.onRetry}
          >
            {ui.retry}
          </button>
        )}
    </section>
  );
}
