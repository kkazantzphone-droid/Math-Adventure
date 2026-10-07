import { useState } from 'react';
import type { ReactNode } from 'react';
import type { QuantityItem } from '../../domain/families/slice';

export function ChildSideLabel({
  side,
  label,
}: {
  readonly side: 'left' | 'right';
  readonly label: string;
}) {
  return (
    <>
      <span aria-hidden="true">{side === 'left' ? '←' : '→'}</span>
      <span className="visually-hidden">{label}</span>
    </>
  );
}

export function ChildAnswerCard({
  value,
  children,
  disabled,
  onChoose,
  label,
  describedBy,
}: {
  readonly value: string;
  readonly children: ReactNode;
  readonly disabled?: boolean | undefined;
  readonly onChoose: () => void;
  readonly label?: string | undefined;
  readonly describedBy?: string | undefined;
}) {
  return (
    <button
      type="button"
      className="child-answer-card"
      data-child-answer={value}
      disabled={disabled}
      onClick={onChoose}
      aria-label={label}
      aria-describedby={describedBy}
    >
      {children}
    </button>
  );
}

/** Marking one public item is a control alternative, never a correctness oracle. */
export function ChildTokens({
  items,
  removedIds = [],
  interactive = false,
  scope,
  label,
  dotLabel,
  emptyLabel,
  removedLabel,
  disabled,
  onSupport,
  separateRemoved = false,
  layout = 'row',
}: {
  readonly items: readonly QuantityItem[];
  readonly removedIds?: readonly string[];
  readonly interactive?: boolean;
  readonly scope: string;
  readonly label: string;
  readonly dotLabel: string;
  readonly emptyLabel: string;
  readonly removedLabel: string;
  readonly disabled?: boolean | undefined;
  readonly onSupport?: (() => void) | undefined;
  readonly separateRemoved?: boolean;
  readonly layout?: 'row' | 'pairs';
}) {
  const [marked, setMarked] = useState<{
    readonly scope: string;
    readonly ids: readonly string[];
  }>({ scope, ids: [] });
  const markedIds = marked.scope === scope ? marked.ids : [];
  const present = (item: QuantityItem) => {
    const removed = removedIds.includes(item.id);
    const selected = markedIds.includes(item.id);
    const picture = (
      <>
        <span className="child-dot" aria-hidden="true">
          ●
        </span>
        {(removed || selected) && (
          <span className="child-dot-mark" aria-hidden="true">
            {removed ? '×' : '✓'}
          </span>
        )}
      </>
    );
    return interactive && !removed ? (
      <button
        key={item.id}
        type="button"
        className="child-token"
        data-child-item={item.id}
        aria-label={dotLabel}
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => {
          setMarked({
            scope,
            ids: selected
              ? markedIds.filter((id) => id !== item.id)
              : [...markedIds, item.id],
          });
          onSupport?.();
        }}
      >
        {picture}
      </button>
    ) : (
      <span
        key={item.id}
        className={`child-token${removed ? ' removed' : ''}`}
        data-child-item={item.id}
        role="img"
        aria-label={removed ? removedLabel : dotLabel}
      >
        {picture}
      </span>
    );
  };
  const remaining = items.filter((item) => !removedIds.includes(item.id));
  return (
    <div
      role="group"
      aria-label={label}
      className="child-token-tray"
      data-child-quantity
      data-layout={layout}
    >
      {separateRemoved ? (
        <>
          <div className="child-remaining">
            {remaining.length === 0 ? (
              <span>{emptyLabel}</span>
            ) : (
              remaining.map(present)
            )}
          </div>
          <div
            className="child-taken-away"
            role="group"
            aria-label={removedLabel}
          >
            {items.filter((item) => removedIds.includes(item.id)).map(present)}
          </div>
        </>
      ) : items.length === 0 ? (
        <span>{emptyLabel}</span>
      ) : (
        items.map(present)
      )}
    </div>
  );
}

export function ChildShapePicture({
  kind,
  scaffolded = false,
}: {
  readonly kind: 'square' | 'rectangle' | 'parallelogram';
  readonly scaffolded?: boolean;
}) {
  const points =
    kind === 'square'
      ? '25,10 75,10 75,60 25,60'
      : kind === 'rectangle'
        ? '10,15 90,15 90,55 10,55'
        : '10,55 65,55 90,15 35,15';
  return (
    <svg
      viewBox="0 0 100 70"
      className="child-shape-card-picture"
      aria-hidden="true"
      focusable="false"
    >
      <polygon points={points} />
      {scaffolded &&
        points.split(' ').map((point, index) => {
          const [x, y] = point.split(',').map(Number);
          return <circle key={index} cx={x} cy={y} r="4" />;
        })}
    </svg>
  );
}
