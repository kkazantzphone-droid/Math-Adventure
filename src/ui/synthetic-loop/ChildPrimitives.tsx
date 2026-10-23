import { useState } from 'react';
import type { ReactNode } from 'react';
import type { QuantityItem } from '../../domain/families/slice';
import type { ChildPicture } from './child-pictures';

/** One countable thing. Decorative: each token carries its own name. */
function ChildItemPicture({ picture }: { readonly picture: ChildPicture }) {
  if (picture === 'dot')
    return (
      <span className="child-dot" aria-hidden="true">
        ●
      </span>
    );
  return (
    <span className={`child-dot child-picture-${picture}`} aria-hidden="true">
      <svg
        className="child-picture"
        viewBox="0 0 24 24"
        focusable="false"
        aria-hidden="true"
      >
        {picture === 'sun' ? (
          <>
            <circle cx="12" cy="12" r="5.2" />
            <path
              className="child-picture-line"
              d="M12 1.5v3.2M12 19.3v3.2M1.5 12h3.2M19.3 12h3.2M4.6 4.6l2.2 2.2M17.2 17.2l2.2 2.2M4.6 19.4l2.2-2.2M17.2 6.8l2.2-2.2"
            />
          </>
        ) : picture === 'planet' ? (
          <>
            <circle cx="12" cy="12" r="6.4" />
            <ellipse
              className="child-picture-line"
              cx="12"
              cy="12"
              rx="11"
              ry="3.4"
              transform="rotate(-20 12 12)"
            />
          </>
        ) : picture === 'moon' ? (
          <path d="M15.2 2.4A9.8 9.8 0 1 0 21.6 17 7.8 7.8 0 0 1 15.2 2.4Z" />
        ) : (
          <>
            <path d="M12 1.6c3.2 2.6 4.6 6.2 4.6 10.2v4.6H7.4v-4.6C7.4 7.8 8.8 4.2 12 1.6Z" />
            <path d="M7.4 12.6 3.6 17v2.6h3.8ZM16.6 12.6l3.8 4.4v2.6h-3.8ZM9.9 17.6h4.2L12 22.4Z" />
            <circle className="child-picture-window" cx="12" cy="8.6" r="1.9" />
          </>
        )}
      </svg>
    </span>
  );
}

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
  takenAwayLabel = removedLabel,
  disabled,
  onSupport,
  separateRemoved = false,
  layout = 'row',
  picture = 'dot',
}: {
  readonly items: readonly QuantityItem[];
  readonly removedIds?: readonly string[];
  readonly interactive?: boolean;
  readonly scope: string;
  readonly label: string;
  readonly dotLabel: string;
  readonly emptyLabel: string;
  readonly removedLabel: string;
  /** Name of the tray of crossed-out items; defaults to the item name. */
  readonly takenAwayLabel?: string;
  readonly disabled?: boolean | undefined;
  readonly onSupport?: (() => void) | undefined;
  readonly separateRemoved?: boolean;
  readonly layout?: 'row' | 'pairs';
  readonly picture?: ChildPicture;
}) {
  const [marked, setMarked] = useState<{
    readonly scope: string;
    readonly ids: readonly string[];
  }>({ scope, ids: [] });
  const markedIds = marked.scope === scope ? marked.ids : [];
  const present = (item: QuantityItem) => {
    const removed = removedIds.includes(item.id);
    const selected = markedIds.includes(item.id);
    const drawn = (
      <>
        <ChildItemPicture picture={picture} />
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
        {drawn}
      </button>
    ) : (
      <span
        key={item.id}
        className={`child-token${removed ? ' removed' : ''}`}
        data-child-item={item.id}
        role="img"
        aria-label={removed ? removedLabel : dotLabel}
      >
        {drawn}
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
            aria-label={takenAwayLabel}
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
