import { useState } from 'react';
import { deriveChapterHelp } from '../../application/growing-world';
import type {
  ChapterFamilyId,
  ChapterPresentation,
  ChapterTask,
} from '../../application/growing-world';
import { identifier } from '../../domain/core/identifiers';
import type { StructuredAnswer } from '../../domain/puzzles/contracts';
import type { LanguagePreferences } from '../../presentation/localisation';
import { resolvePrototypeLocale } from '../../presentation/localisation';
import {
  getGrowingWorldCopy,
  growingWorldText,
} from '../../presentation/localisation/growing-world-copy';
import { ChildAnswerCard } from './ChildPrimitives';
import { WorldTiles } from './ExploreWorld';
import type { LoopFeedback } from './TaskView';
import './growing-world.css';

function numberAnswer(
  task: ChapterTask,
  value: number,
): StructuredAnswer | null {
  const rational = {
    schema: 'rational-v1' as const,
    numerator: String(value),
    denominator: '1',
  };
  if (task.kind !== 'arrayArea') return { kind: 'exactValue', value: rational };
  const unit = identifier('unit', task.unitId);
  return unit.ok
    ? {
        kind: 'quantity',
        quantity: {
          schema: 'quantity-v1',
          kind: 'exact',
          magnitude: rational,
          unitId: unit.value,
          dimension: 'area',
        },
      }
    : null;
}

function answerNumber(answer: StructuredAnswer | null): string | null {
  return answer?.kind === 'exactValue'
    ? answer.value.numerator
    : answer?.kind === 'quantity'
      ? answer.quantity.magnitude.numerator
      : null;
}

/** Public task pictures and native answer cards. Only the domain judges a reply. */
export function ChapterTaskView({
  presentation,
  preferences,
  feedback,
  hintTier,
  disabled = false,
  retryDisabled,
  contextKey = '',
  onAnswer,
  onHint,
  onRetry,
  onPractice,
}: {
  readonly presentation: ChapterPresentation;
  readonly preferences: LanguagePreferences;
  readonly feedback: LoopFeedback;
  readonly hintTier: 0 | 1 | 2 | 3;
  readonly disabled?: boolean;
  readonly retryDisabled?: boolean;
  readonly contextKey?: string;
  readonly onAnswer: (answer: StructuredAnswer) => void;
  readonly onHint: () => void;
  readonly onRetry: () => void;
  readonly onPractice?: (family: ChapterFamilyId) => void;
}) {
  const uiLocale = resolvePrototypeLocale(preferences.uiLocale).effectiveLocale;
  const instructionLocale = resolvePrototypeLocale(
    preferences.instructionLocale,
  ).effectiveLocale;
  const ui = getGrowingWorldCopy(uiLocale);
  const copy = getGrowingWorldCopy(instructionLocale);
  const { task, replay } = presentation;
  const scope = `${contextKey}:${presentation.familyId}:${replay.seedHex}`;
  const [pictures, setPictures] = useState({ scope, tier: 3 });
  const tier =
    hintTier === 3 && pictures.scope === scope ? pictures.tier : hintTier;
  const [sharing, setSharing] = useState({ scope, rounds: 0 });
  const rounds = sharing.scope === scope ? sharing.rounds : 0;
  const helped = hintTier === 3 ? deriveChapterHelp(replay, 3) : null;
  const worked = helped?.ok ? answerNumber(helped.value.workedAnswer) : null;
  const max =
    task.kind === 'makeTen' || task.kind === 'missingGroup'
      ? 10
      : task.kind === 'missingPart'
        ? 20
        : task.kind === 'squareSide'
          ? 6
          : 25;
  const squareSide =
    task.kind === 'squareSide'
      ? (Array.from({ length: 6 }, (_, index) => index + 1).find(
          (side) => side * side === task.total,
        ) ?? null)
      : null;
  const groups =
    task.kind === 'equalGroups' || task.kind === 'missingGroup'
      ? task.groups
      : 0;
  const rows =
    task.kind === 'equalGroups'
      ? task.groups
      : task.kind === 'arrayArea'
        ? task.rows
        : task.kind === 'squareSide'
          ? (squareSide ?? 1)
          : 1;
  const columns =
    task.kind === 'equalGroups'
      ? task.each
      : task.kind === 'arrayArea'
        ? task.columns
        : task.kind === 'squareSide'
          ? (squareSide ?? 1)
          : 1;
  const groupSize = task.kind === 'missingGroup' ? task.total / task.groups : 0;
  const description =
    task.kind === 'makeTen'
      ? growingWorldText(copy.tenDescription, {
          first: task.first,
          second: task.second,
        })
      : task.kind === 'missingPart'
        ? growingWorldText(copy.missingDescription, {
            total: task.total,
            known: task.known,
          })
        : task.kind === 'equalGroups'
          ? growingWorldText(copy.groupsDescription, {
              groups: task.groups,
              each: task.each,
            })
          : task.kind === 'missingGroup'
            ? growingWorldText(copy.sharingDescription, {
                total: task.total,
                groups: task.groups,
              })
            : task.kind === 'squareSide'
              ? growingWorldText(
                  task.representation === 'relational' && tier < 2
                    ? copy.squareAreaDescription
                    : copy.squareDescription,
                  { total: task.total },
                )
              : task.kind === 'arrayArea'
                ? growingWorldText(copy.groupsDescription, {
                    groups: task.rows,
                    each: task.columns,
                  })
                : copy.rectangle;
  return (
    <section
      className="growing-world chapter-task child-task"
      lang={instructionLocale}
      data-child-kind={task.kind}
      data-chapter-family={presentation.familyId}
      data-chapter-representation={task.representation}
      data-child-hint-tier={hintTier}
      data-child-visual-tier={tier}
      aria-labelledby="slice-task-heading"
    >
      <h2 id="slice-task-heading" tabIndex={-1}>
        {copy.prompts[task.kind]}
      </h2>
      <div
        className={`world-task-picture world-help-${tier}`}
        data-world-task-picture
      >
        {task.kind === 'makeTen' && (
          <>
            <p>{description}</p>
            {task.representation === 'relational' && (
              <div className="world-part-bar" aria-hidden="true">
                <span style={{ flexGrow: task.first }}>{task.first}</span>
                <span
                  className="world-unknown"
                  style={{ flexGrow: 10 - task.first }}
                >
                  ?
                </span>
                <strong>10</strong>
              </div>
            )}
            <div className="world-ten-groups" aria-hidden="true">
              <div className="world-ten-frame">
                <span>
                  {copy.left}: {task.first}
                  {tier >= 2 ? ' → 10' : ''}
                </span>
                <WorldTiles
                  count={tier >= 2 ? 10 : task.first}
                  capacity={10}
                  accentFrom={tier >= 2 ? task.first : undefined}
                />
              </div>
              <span className="world-operation">←</span>
              <div>
                <span>
                  {copy.right}: {task.second}
                  {tier >= 2 ? ` → ${task.second - (10 - task.first)}` : ''}
                </span>
                <WorldTiles
                  count={
                    tier >= 2 ? task.second - (10 - task.first) : task.second
                  }
                  capacity={task.second}
                  accentFrom={0}
                />
              </div>
            </div>
            <p className="world-task-equation">
              {task.first} + {tier >= 3 && worked !== null ? worked : '?'} = 10
            </p>
          </>
        )}
        {task.kind === 'missingPart' && (
          <>
            <p>{description}</p>
            {task.representation === 'relational' ? (
              <div className="world-part-bar" aria-hidden="true">
                <span style={{ flexGrow: task.known }}>{task.known}</span>
                <span
                  className="world-unknown"
                  style={{ flexGrow: task.total - task.known }}
                >
                  ?
                </span>
                <strong>{task.total}</strong>
              </div>
            ) : (
              <div
                className="world-part-pictures"
                role="img"
                aria-label={description}
              >
                <div className="world-part">
                  <h3>
                    {copy.total}: {task.total}
                  </h3>
                  <WorldTiles
                    count={task.total}
                    accentFrom={tier >= 1 ? task.known : undefined}
                  />
                </div>
                <div className="world-part">
                  <h3>
                    {task.unknownPosition === 'first' ? copy.right : copy.left}:{' '}
                    {task.known}
                  </h3>
                  <WorldTiles count={task.known} />
                </div>
              </div>
            )}
            {tier >= 2 && (
              <div className="world-part-pictures" aria-hidden="true">
                <div className="world-part">
                  <WorldTiles count={task.known} />
                </div>
                <span className="world-operation">+</span>
                <div className="world-part">
                  <WorldTiles count={task.total - task.known} accentFrom={0} />
                </div>
              </div>
            )}
            <p className="world-task-equation">
              {task.unknownPosition === 'first'
                ? tier >= 3 && worked !== null
                  ? worked
                  : '?'
                : task.known}{' '}
              +{' '}
              {task.unknownPosition === 'second'
                ? tier >= 3 && worked !== null
                  ? worked
                  : '?'
                : task.known}{' '}
              = {task.total}
            </p>
          </>
        )}
        {task.kind === 'equalGroups' && (
          <>
            <p>{description}</p>
            {task.representation === 'concrete' && tier < 2 ? (
              <div
                className="world-equal-groups"
                role="img"
                aria-label={description}
              >
                {Array.from({ length: groups }, (_, index) => (
                  <div className="world-one-group" key={index}>
                    <span aria-hidden="true">
                      {copy.group} {index + 1}
                    </span>
                    <WorldTiles count={task.each} columns={task.each} />
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="world-array-picture"
                role="img"
                aria-label={description}
              >
                <WorldTiles count={rows * columns} columns={columns} />
              </div>
            )}
            <p className="world-task-equation">
              {task.representation === 'concrete' && tier < 2
                ? `${task.groups} × ${task.each}`
                : Array.from({ length: groups }, () => task.each).join(
                    ' + ',
                  )}{' '}
              = {tier >= 3 && worked !== null ? worked : '?'}
            </p>
          </>
        )}
        {task.kind === 'missingGroup' && (
          <>
            <p>{description}</p>
            <div
              className="world-sharing-total"
              role="img"
              aria-label={`${copy.total}: ${task.total}`}
            >
              <WorldTiles
                count={Math.max(
                  0,
                  task.total -
                    (tier >= 3
                      ? task.total
                      : tier >= 2
                        ? rounds * task.groups
                        : 0),
                )}
              />
              <span aria-hidden="true">
                {copy.total}: {task.total}
              </span>
            </div>
            <div
              className={`world-equal-groups${task.representation === 'relational' ? ' world-group-bar' : ''}`}
            >
              {Array.from({ length: task.groups }, (_, index) => (
                <div className="world-one-group" key={index}>
                  <h3>
                    {copy.group} {index + 1}
                  </h3>
                  {tier >= 3 || rounds > 0 ? (
                    <>
                      <WorldTiles
                        count={tier >= 3 ? groupSize : rounds}
                        columns={Math.max(1, groupSize)}
                      />
                      <span className="world-unknown" aria-hidden="true">
                        {tier >= 3 && worked !== null ? worked : '?'}
                      </span>
                    </>
                  ) : (
                    <span className="world-unknown">?</span>
                  )}
                </div>
              ))}
            </div>
            {tier >= 2 && tier < 3 && (
              <button
                type="button"
                lang={uiLocale}
                data-world-share
                disabled={disabled || rounds >= groupSize}
                onClick={() =>
                  setSharing({ scope, rounds: Math.min(groupSize, rounds + 1) })
                }
              >
                {ui.help.missingGroup[1]}
              </button>
            )}
            <p className="world-task-equation">
              {task.groups} × {tier >= 3 && worked !== null ? worked : '?'} ={' '}
              {task.total}
            </p>
          </>
        )}
        {task.kind === 'arrayArea' && (
          <>
            <p>{copy.equalUnits}</p>
            {task.representation === 'concrete' ? (
              <div
                className="world-array-picture"
                role="img"
                aria-label={description}
              >
                <WorldTiles count={rows * columns} columns={columns} />
                <p>
                  {copy.rows}: {rows} · {copy.columns}: {columns}
                </p>
              </div>
            ) : (
              <div
                className="world-unit-rows"
                role="img"
                aria-label={description}
              >
                {Array.from({ length: rows }, (_, row) => (
                  <div key={row}>
                    <span aria-hidden="true">{row + 1}</span>
                    <WorldTiles count={columns} columns={columns} />
                  </div>
                ))}
              </div>
            )}
            {tier >= 1 && <p>{copy.oneSquareUnit}</p>}
            {tier >= 2 && (
              <p className="world-task-equation">
                {Array.from({ length: rows }, () => columns).join(' + ')} ={' '}
                {tier >= 3 && worked !== null ? worked : '?'}
              </p>
            )}
            <p className="world-task-equation">
              {rows} × {columns} ={' '}
              {tier >= 3 && worked !== null ? `${worked} ${copy.unit}` : '?'}
            </p>
          </>
        )}
        {task.kind === 'squareSide' && squareSide !== null && (
          <>
            <p>{description}</p>
            {task.representation === 'relational' && tier < 2 ? (
              <div
                className="world-square-area-picture"
                role="img"
                aria-label={description}
              >
                <div className="world-top-bracket" aria-hidden="true">
                  ?
                </div>
                <div className="world-square-area" aria-hidden="true">
                  <strong>{task.total}</strong>
                  <span>{copy.unit}</span>
                </div>
              </div>
            ) : (
              <div
                className="world-array-picture"
                role="img"
                aria-label={description}
              >
                {tier >= 1 && (
                  <div
                    className="world-top-bracket"
                    style={{ inlineSize: `min(100%, ${squareSide * 2.5}rem)` }}
                    aria-hidden="true"
                  >
                    {tier >= 3 && worked !== null ? worked : '?'}
                  </div>
                )}
                <WorldTiles
                  count={task.total}
                  columns={squareSide}
                  topOnly={tier >= 2}
                />
              </div>
            )}
            {task.representation === 'relational' && (
              <p className="world-task-equation">? × ? = {task.total}</p>
            )}
            {tier >= 3 && worked !== null && (
              <>
                <p>
                  {growingWorldText(copy.squareSideDescription, {
                    total: task.total,
                    side: Number(worked),
                  })}
                </p>
                <p className="world-task-equation">
                  {worked}² = {task.total}
                </p>
                <p className="world-principal-root">
                  √{task.total} = {worked}
                </p>
              </>
            )}
          </>
        )}
      </div>
      <button
        type="button"
        className="hint-button"
        data-child-help
        disabled={disabled}
        lang={uiLocale}
        aria-controls="world-task-help"
        aria-expanded={hintTier > 0}
        onClick={() => {
          if (hintTier === 3) {
            setPictures({ scope, tier: tier === 3 ? 1 : tier + 1 });
            setSharing({ scope, rounds: 0 });
          }
          onHint();
        }}
      >
        {hintTier === 3 ? ui.again : ui.helpButton}
      </button>
      {tier > 0 && (
        <div
          id="world-task-help"
          className="world-task-help"
          data-child-help-result
          data-hint-tier={tier}
        >
          <p>{copy.help[task.kind][tier - 1]}</p>
          {tier === 3 && worked !== null && (
            <p className="world-worked" data-world-worked>
              {copy.worked}:{' '}
              <strong>
                {worked}
                {task.kind === 'arrayArea' ? ` ${copy.unit}` : ''}
              </strong>
            </p>
          )}
        </div>
      )}
      <div
        className="world-answer-cards child-answer-cards"
        role="group"
        aria-label={copy.answers}
      >
        {Array.from({ length: max + 1 }, (_, value) => (
          <ChildAnswerCard
            key={value}
            value={String(value)}
            disabled={disabled}
            onChoose={() => {
              const answer = numberAnswer(task, value);
              if (answer) onAnswer(answer);
            }}
          >
            <span className="child-answer-number">{value}</span>
            {task.kind === 'arrayArea' && (
              <span className="world-answer-unit">{copy.unit}</span>
            )}
          </ChildAnswerCard>
        ))}
      </div>
      <div
        className="child-feedback"
        id="slice-feedback"
        tabIndex={-1}
        lang={uiLocale}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {feedback === 'correct'
          ? ui.success
          : feedback === 'incorrect' || feedback === 'retry'
            ? ui.retry
            : feedback === 'unavailable'
              ? ui.unavailable
              : ''}
      </div>
      {(feedback === 'incorrect' || feedback === 'retry') && (
        <button
          type="button"
          lang={uiLocale}
          data-child-retry
          disabled={retryDisabled ?? disabled}
          onClick={onRetry}
        >
          {ui.retry}
        </button>
      )}
      {onPractice && (feedback === 'correct' || hintTier === 3) && (
        <div className="world-connections" lang={uiLocale}>
          <h3>{ui.connection}</h3>
          <p>
            {task.kind === 'makeTen' || task.kind === 'missingPart'
              ? ui.preservedTotal
              : ui.equalUnits}
          </p>
          <div className="world-controls">
            {task.connections.map((family) => (
              <button
                key={family}
                type="button"
                data-world-connection={family}
                disabled={retryDisabled ?? false}
                onClick={() => onPractice(family)}
              >
                {ui.familyLabels[family]}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
