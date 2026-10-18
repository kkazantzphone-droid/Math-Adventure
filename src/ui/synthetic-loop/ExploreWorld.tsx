import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ChapterFamilyId } from '../../application/growing-world';
import {
  INITIAL_ARRAY,
  INITIAL_SPLIT,
  arrayRelationship,
  changeArray,
  changeSplit,
  splitRelationship,
} from '../../domain/growing-world/explore';
import type {
  ArrayAction,
  ArrayWorkspace,
  SplitAction,
  SplitWorkspace,
} from '../../domain/growing-world/explore';
import type { LanguagePreferences } from '../../presentation/localisation';
import { resolvePrototypeLocale } from '../../presentation/localisation';
import {
  getGrowingWorldCopy,
  growingWorldText,
} from '../../presentation/localisation/growing-world-copy';
import './growing-world.css';

type Workshop = 'parts' | 'arrays';
interface WorkspaceSession {
  readonly workshop: Workshop;
  readonly split: SplitWorkspace;
  readonly array: ArrayWorkspace;
  readonly splitUndo: readonly SplitWorkspace[];
  readonly arrayUndo: readonly ArrayWorkspace[];
  readonly symbols: boolean;
  readonly oneSide: boolean;
}
const initialSession: WorkspaceSession = {
  workshop: 'parts',
  split: INITIAL_SPLIT,
  array: INITIAL_ARRAY,
  splitUndo: [],
  arrayUndo: [],
  symbols: false,
  oneSide: false,
};

/** Reusable picture; its coordinates express logical slots, never decide truth. */
export function WorldTiles({
  count,
  columns = 5,
  capacity,
  accentFrom,
  topOnly = false,
}: {
  readonly count: number;
  readonly columns?: number;
  readonly capacity?: number;
  readonly accentFrom?: number | undefined;
  readonly topOnly?: boolean;
}) {
  return (
    <span
      className="world-tiles"
      aria-hidden="true"
      style={{ '--world-columns': columns } as CSSProperties}
    >
      {Array.from({ length: capacity ?? count }, (_, index) => (
        <span
          key={index}
          className={`world-tile${index >= count ? ' vacant' : ''}${accentFrom !== undefined && index >= accentFrom && index < count ? ' other-part' : ''}${topOnly && index < columns ? ' top-side' : ''}`}
          data-world-tile={index < count ? 'filled' : 'empty'}
        />
      ))}
    </span>
  );
}

/** Local, reversible discovery only. This component has no assessment API. */
export function ExploreWorld({
  preferences,
  contextKey,
  disabled = false,
  onPractice,
}: {
  readonly preferences: LanguagePreferences;
  readonly contextKey: string;
  readonly disabled?: boolean;
  readonly onPractice: (familyId: ChapterFamilyId) => void;
}) {
  const [sessions, setSessions] = useState<
    Readonly<Record<string, WorkspaceSession>>
  >({});
  const current = sessions[contextKey] ?? initialSession;
  const update = (next: WorkspaceSession) => {
    if (!disabled)
      setSessions((previous) => ({ ...previous, [contextKey]: next }));
  };
  const uiLocale = resolvePrototypeLocale(preferences.uiLocale).effectiveLocale;
  const instructionLocale = resolvePrototypeLocale(
    preferences.instructionLocale,
  ).effectiveLocale;
  const ui = getGrowingWorldCopy(uiLocale);
  const copy = getGrowingWorldCopy(instructionLocale);
  const prefix = useId();
  const split = splitRelationship(current.split);
  const array = arrayRelationship(current.array);
  if (!split.ok || !array.ok) return <p role="status">{ui.unavailable}</p>;
  const part = split.value;
  const tiles = array.value;
  const changeParts = (action: SplitAction) => {
    const next = changeSplit(current.split, action);
    if (next.ok)
      update({
        ...current,
        split: next.value,
        splitUndo: [...current.splitUndo.slice(-31), current.split],
      });
  };
  const changeTiles = (action: ArrayAction) => {
    const next = changeArray(current.array, action);
    if (next.ok)
      update({
        ...current,
        array: next.value,
        arrayUndo: [...current.arrayUndo.slice(-31), current.array],
      });
  };
  const numberDescription = growingWorldText(copy.splitDescription, {
    left: part.left,
    right: part.right,
    total: part.total,
  });
  const tileDescription = growingWorldText(copy.arrayDescription, {
    rows: tiles.rows,
    columns: tiles.columns,
    total: tiles.total,
  });
  return (
    <section
      className="growing-world explore-world"
      lang={instructionLocale}
      data-explore-world
      aria-labelledby={`${prefix}-heading`}
    >
      <h2 id={`${prefix}-heading`} tabIndex={-1}>
        {copy.exploreTitle}
      </h2>
      <p>{copy.exploreIntro}</p>
      <p className="world-unassessed" data-world-unassessed>
        {copy.unassessed}
      </p>
      <div
        className="world-workshop-choice"
        role="group"
        aria-label={ui.exploreTitle}
        lang={uiLocale}
      >
        {(['parts', 'arrays'] as const).map((workshop) => (
          <button
            key={workshop}
            type="button"
            data-world-workshop={workshop}
            aria-pressed={current.workshop === workshop}
            disabled={disabled}
            onClick={() => update({ ...current, workshop })}
          >
            <span aria-hidden="true">
              {workshop === 'parts' ? '● + ●' : '▦'}
            </span>{' '}
            {workshop === 'parts' ? ui.partsWorkshop : ui.arrayWorkshop}
          </button>
        ))}
      </div>
      {current.workshop === 'parts' ? (
        <div data-world-parts>
          <h3>{copy.partsWorkshop}</h3>
          <div
            className="world-part-pictures"
            role="img"
            aria-label={numberDescription}
          >
            <div className="world-part">
              <h4>
                {copy.left} <strong>{part.left}</strong>
              </h4>
              <WorldTiles
                count={part.left}
                capacity={Math.max(10, part.left)}
              />
            </div>
            <span className="world-operation" aria-hidden="true">
              +
            </span>
            <div className="world-part">
              <h4>
                {copy.right} <strong>{part.right}</strong>
              </h4>
              <WorldTiles
                count={part.right}
                capacity={Math.max(10, part.right)}
                accentFrom={0}
              />
            </div>
          </div>
          <p className="world-total" aria-hidden="true">
            {copy.total}: <strong>{part.total}</strong>
          </p>
          <p
            className="world-relationship"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-world-relationship
          >
            {numberDescription}
          </p>
          <p>{copy.preservedTotal}</p>
          <div className="world-controls" lang={uiLocale}>
            <button
              type="button"
              data-world-action="moveLeft"
              disabled={disabled || part.right === 0}
              onClick={() => changeParts('moveLeft')}
            >
              <span aria-hidden="true">← </span>
              {ui.moveLeft}
            </button>
            <button
              type="button"
              data-world-action="moveRight"
              disabled={disabled || part.left === 0}
              onClick={() => changeParts('moveRight')}
            >
              <span aria-hidden="true">→ </span>
              {ui.moveRight}
            </button>
            <button
              type="button"
              data-world-action="add"
              disabled={disabled || part.total === 20}
              onClick={() => changeParts('add')}
            >
              <span aria-hidden="true">+ </span>
              {ui.add}
            </button>
            <button
              type="button"
              data-world-action="remove"
              disabled={disabled || part.total === 0}
              onClick={() => changeParts('remove')}
            >
              <span aria-hidden="true">− </span>
              {ui.remove}
            </button>
          </div>
          {current.symbols && (
            <div className="world-symbols" data-world-symbols>
              <p>
                {part.left} + {part.right} = {part.total}
              </p>
              <p>
                {part.total} − {part.left} = {part.right}
              </p>
              <p>
                {part.tenAndRest[0]} + {part.tenAndRest[1]} = {part.total}
              </p>
              <p className="world-caption">{copy.tenAndRest}</p>
            </div>
          )}
        </div>
      ) : (
        <div data-world-arrays>
          <h3>{copy.arrayWorkshop}</h3>
          <div
            className="world-array-picture"
            role="img"
            aria-label={tileDescription}
          >
            <div
              className="world-top-bracket"
              style={{ inlineSize: `min(100%, ${tiles.columns * 2.5}rem)` }}
              aria-hidden="true"
            >
              {tiles.columns}
            </div>
            <WorldTiles
              count={tiles.total}
              columns={tiles.columns}
              topOnly={current.oneSide && tiles.isSquare}
            />
            <p aria-hidden="true">
              {copy.rows}: {tiles.rows} · {copy.columns}: {tiles.columns}
            </p>
          </div>
          <p
            className="world-relationship"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-world-relationship
          >
            {tileDescription}
          </p>
          <p>{tiles.isSquare ? copy.square : copy.rectangle}</p>
          <p>{copy.equalUnits}</p>
          <div className="world-controls" lang={uiLocale}>
            {(
              [
                'addRow',
                'removeRow',
                'addColumn',
                'removeColumn',
                'turn',
                'square',
              ] as const
            ).map((action) => (
              <button
                key={action}
                type="button"
                data-world-action={action}
                disabled={
                  disabled ||
                  !changeArray(current.array, action).ok ||
                  (action === 'square' && tiles.isSquare)
                }
                onClick={() => changeTiles(action)}
              >
                {action === 'square' ? ui.makeSquare : ui[action]}
              </button>
            ))}
          </div>
          <p>{copy.sameTotal}</p>
          {tiles.isSquare && (
            <button
              type="button"
              lang={uiLocale}
              data-world-action="oneSide"
              aria-pressed={current.oneSide}
              disabled={disabled}
              onClick={() => update({ ...current, oneSide: !current.oneSide })}
            >
              {current.oneSide ? ui.seeWhole : ui.seeSide}
            </button>
          )}
          {current.symbols && (
            <div className="world-symbols" data-world-symbols>
              <p>
                {tiles.repeatedAddends.join(' + ')} = {tiles.total}
              </p>
              <p>
                {tiles.rows} × {tiles.columns} = {tiles.total}
              </p>
              {tiles.isSquare && (
                <>
                  <p>
                    {tiles.columns}² = {tiles.total}
                  </p>
                  <p className="world-caption">
                    {growingWorldText(copy.squareSideDescription, {
                      total: tiles.total,
                      side: tiles.columns,
                    })}
                  </p>
                  <p className="world-principal-root">
                    √{tiles.total} = {tiles.columns}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
      <div className="world-controls world-secondary-controls" lang={uiLocale}>
        <button
          type="button"
          data-world-action="undo"
          disabled={
            disabled ||
            (current.workshop === 'parts'
              ? current.splitUndo.length === 0
              : current.arrayUndo.length === 0)
          }
          onClick={() => {
            if (current.workshop === 'parts') {
              const previous = current.splitUndo.at(-1);
              if (previous)
                update({
                  ...current,
                  split: previous,
                  splitUndo: current.splitUndo.slice(0, -1),
                });
            } else {
              const previous = current.arrayUndo.at(-1);
              if (previous)
                update({
                  ...current,
                  array: previous,
                  arrayUndo: current.arrayUndo.slice(0, -1),
                });
            }
          }}
        >
          {ui.undo}
        </button>
        <button
          type="button"
          data-world-action="reset"
          disabled={disabled}
          onClick={() =>
            update(
              current.workshop === 'parts'
                ? {
                    ...current,
                    split: INITIAL_SPLIT,
                    splitUndo: [...current.splitUndo.slice(-31), current.split],
                  }
                : {
                    ...current,
                    array: INITIAL_ARRAY,
                    arrayUndo: [...current.arrayUndo.slice(-31), current.array],
                  },
            )
          }
        >
          {ui.reset}
        </button>
        <button
          type="button"
          data-world-action="symbols"
          aria-pressed={current.symbols}
          disabled={disabled}
          onClick={() => update({ ...current, symbols: !current.symbols })}
        >
          {current.symbols ? ui.hideSymbols : ui.symbols}
        </button>
      </div>
      <p className="world-boundary">{copy.boundary}</p>
      <div className="world-separate-practice" lang={uiLocale}>
        <h3>{ui.practiceSeparate}</h3>
        <p>{ui.reasons.connection}</p>
        <button
          type="button"
          data-world-practice={
            current.workshop === 'parts' ? 'number.make-ten' : 'groups.equal'
          }
          disabled={disabled}
          onClick={() =>
            onPractice(
              current.workshop === 'parts' ? 'number.make-ten' : 'groups.equal',
            )
          }
        >
          {current.workshop === 'parts'
            ? ui.familyLabels['number.make-ten']
            : ui.familyLabels['groups.equal']}
        </button>
      </div>
    </section>
  );
}
