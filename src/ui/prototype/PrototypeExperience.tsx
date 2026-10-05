import { useEffect, useReducer, useRef } from 'react';
import type { Ref } from 'react';
import { prototypeCopy } from './copy';
import type { PrototypeCopy } from './copy';
import {
  prototypeArrayCells,
  prototypeDotGroups,
  prototypeRepresentations,
  prototypeScenarios,
} from './fixtures';
import type { PrototypeRepresentation, PrototypeShape } from './fixtures';
import { initialPrototypeState, prototypeReducer } from './model';
import type { PrototypeAction, PrototypeBadge, PrototypeState } from './model';
import type { PrototypeLanguage } from './options';
import './prototype.css';

function BadgeArt({ badge }: { readonly badge: PrototypeBadge }) {
  return (
    <svg
      className="badge-art"
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="badge-halo" cx="60" cy="60" r="53" />
      {badge === 'star' ? (
        <path d="m60 23 11 24 26 4-19 19 5 27-23-13-23 13 5-27-19-19 26-4Z" />
      ) : (
        <path d="m60 28 36 62H24Z" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function ShapeArt({ shape }: { readonly shape: PrototypeShape }) {
  return (
    <svg
      className="shape-art"
      viewBox="0 0 120 120"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {shape === 'triangle' && <path d="M60 20 100 100H20Z" />}
      {shape === 'square' && <rect x="28" y="28" width="64" height="64" />}
      {shape === 'rectangle' && <rect x="12" y="40" width="96" height="40" />}
    </svg>
  );
}

/** One fixed array per screen. Selection brings the same concrete anchor beside its symbol. */
function ArrayAnchor({
  representation,
  copy,
}: {
  readonly representation: PrototypeRepresentation | null;
  readonly copy: PrototypeCopy;
}) {
  return (
    <span
      className="array-anchor"
      data-representation={representation ?? undefined}
      aria-hidden={representation === 'root' ? true : undefined}
    >
      <span className="array-label">
        {representation === 'root' ? copy.rootArrayLabel : copy.arrayLabel}
      </span>
      {representation === 'root' ? (
        <span
          className="root-side-guide"
          data-primary-side="top"
          aria-hidden="true"
        >
          <span className="root-side-value">4</span>
        </span>
      ) : (
        <span className="array-axis" aria-hidden="true">
          {representation === null ? '' : '4'}
        </span>
      )}
      <span
        className="square-array"
        role={representation === 'root' ? undefined : 'img'}
        aria-label={
          representation === 'root' ? undefined : copy.arrayDescription
        }
      >
        {prototypeArrayCells.map((cell, index) => (
          <span
            className="array-cell"
            key={cell}
            data-row={Math.floor(index / 4)}
            data-column={index % 4}
            data-highlighted={
              representation === 'root' ? index < 4 : representation !== null
            }
          />
        ))}
      </span>
      {representation !== 'root' && (
        <span className="array-side" aria-hidden="true">
          {representation === null ? '' : '4'}
        </span>
      )}
    </span>
  );
}

function Icon({ kind }: { readonly kind: 'back' | 'home' | 'hint' | 'arrow' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'back' && <path d="m12 5-7 7 7 7M5 12h15" />}
      {kind === 'home' && <path d="m3 11 9-8 9 8M6 9v12h12V9M10 21v-7h4v7" />}
      {kind === 'hint' && (
        <>
          <path d="M9 18h6m-5 3h4M8 13a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z" />
          <path d="M12 1v1M2 8h1m18 0h1" />
        </>
      )}
      {kind === 'arrow' && <path d="M4 12h16m-7-7 7 7-7 7" />}
    </svg>
  );
}

/** Owner-selected Space motif remains decorative and supplies no activity content. */
function ThemeDecoration() {
  return (
    <div className="theme-decoration" data-decoration="true" aria-hidden="true">
      <svg
        className="decoration-space"
        viewBox="0 0 1000 600"
        focusable="false"
      >
        <g fill="none" stroke="currentColor">
          <ellipse
            cx="850"
            cy="140"
            rx="120"
            ry="35"
            transform="rotate(-25 850 140)"
          />
          <circle cx="850" cy="140" r="62" />
          <path d="m80 170 65-50 50 90 50-15" />
        </g>
        <g fill="currentColor">
          <circle cx="80" cy="170" r="3" />
          <circle cx="145" cy="120" r="4" />
          <circle cx="195" cy="210" r="3" />
          <circle cx="245" cy="195" r="3" />
          <path d="m750 60 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm180 235 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
        </g>
      </svg>
    </div>
  );
}

interface PrototypeScreenProps {
  readonly state: PrototypeState;
  readonly language: PrototypeLanguage;
  readonly onAction: (action: PrototypeAction) => void;
  readonly headingRef?: Ref<HTMLHeadingElement>;
}

/** Scripted confirmation-UAT view. Space is the single visual baseline. */
export function PrototypeScreen({
  state,
  language,
  onAction,
  headingRef,
}: PrototypeScreenProps) {
  const copy = prototypeCopy[language];
  const heading =
    state.screen === 'badges'
      ? copy.badgesHeading
      : state.screen === 'home'
        ? copy.homeHeading
        : state.screen === 'success'
          ? copy.success
          : state.screen === 'explore'
            ? copy.explore
            : state.activity === 'number'
              ? copy.numberHeading
              : copy.shapePrompt;
  const intro =
    state.screen === 'badges'
      ? copy.badgesIntro
      : state.screen === 'home'
        ? copy.homeIntro
        : state.screen === 'explore'
          ? copy.exploreIntro
          : null;

  return (
    <main className="prototype" data-theme="space" lang={copy.locale}>
      <ThemeDecoration />
      <div className="prototype-shell">
        <header className="prototype-header">
          <div className="wordmark">
            <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
              <path
                d="M3 25V7l13 13L29 7v18"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinejoin="round"
              />
            </svg>
            <span lang="en-GB">Math Adventure</span>
          </div>
          <div className="header-actions">
            {state.screen !== 'badges' && (
              <>
                <span
                  className="selected-badge"
                  role="img"
                  aria-label={`${copy.selectedBadge}: ${state.badge === 'star' ? copy.star : copy.triangle}`}
                >
                  <BadgeArt badge={state.badge} />
                </span>
                <button
                  className="nav-button"
                  type="button"
                  onClick={() => onAction({ type: 'back' })}
                >
                  <Icon kind="back" />
                  {copy.back}
                </button>
                {state.screen !== 'home' && (
                  <button
                    className="nav-button"
                    type="button"
                    onClick={() => onAction({ type: 'home' })}
                  >
                    <Icon kind="home" />
                    {copy.home}
                  </button>
                )}
              </>
            )}
          </div>
        </header>
        <div className="prototype-content">
          <h1 className="screen-heading" ref={headingRef} tabIndex={-1}>
            {heading}
          </h1>
          {intro !== null && <p className="screen-intro">{intro}</p>}

          {state.screen === 'badges' && (
            <div className="badge-choices">
              {(['star', 'triangle'] as const).map((badge) => (
                <button
                  className="badge-button"
                  key={badge}
                  type="button"
                  onClick={() => onAction({ type: 'selectBadge', badge })}
                >
                  <BadgeArt badge={badge} />
                  <span className="badge-label">
                    {badge === 'star' ? copy.star : copy.triangle}
                  </span>
                  <span className="card-arrow">
                    <Icon kind="arrow" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {state.screen === 'home' && (
            <div className="activity-cards">
              <button
                className="activity-card"
                type="button"
                onClick={() =>
                  onAction({ type: 'openActivity', activity: 'number' })
                }
              >
                <span className="card-illustration" aria-hidden="true">
                  <span className="number-tile">3</span>
                  <span className="number-tile">+</span>
                  <span className="number-tile">2</span>
                </span>
                <span className="card-label">{copy.play}</span>
                <span className="card-arrow">
                  <Icon kind="arrow" />
                </span>
              </button>
              <button
                className="activity-card"
                type="button"
                onClick={() =>
                  onAction({ type: 'openActivity', activity: 'shape' })
                }
              >
                <span className="card-illustration">
                  <ShapeArt shape="triangle" />
                  <ShapeArt shape="square" />
                </span>
                <span className="card-label">{copy.shapes}</span>
                <span className="card-arrow">
                  <Icon kind="arrow" />
                </span>
              </button>
              <button
                className="activity-card"
                type="button"
                onClick={() => onAction({ type: 'openExplore' })}
              >
                <span className="card-illustration" aria-hidden="true">
                  <span className="explore-tile">4²</span>
                  <span className="explore-orbit">✦</span>
                </span>
                <span className="card-label">{copy.explore}</span>
                <span className="card-arrow">
                  <Icon kind="arrow" />
                </span>
              </button>
            </div>
          )}

          {state.screen === 'activity' && (
            <section
              className={`task-panel task-panel-${state.activity}`}
              aria-label={heading}
            >
              {state.activity === 'number' ? (
                <p className="math-prompt" aria-label={copy.numberPrompt}>
                  <span aria-hidden="true">
                    {prototypeScenarios.number.display}
                  </span>
                </p>
              ) : (
                <div className="shape-reference">
                  <span className="shape-reference-label">
                    {copy.shapeReference}
                  </span>
                  <div
                    className="shape-target"
                    role="img"
                    aria-label={copy.targetDescription}
                  >
                    <ShapeArt shape="square" />
                  </div>
                </div>
              )}
              <button
                className="hint-button"
                type="button"
                aria-expanded={state.hintVisible}
                aria-controls="prototype-hint"
                onClick={() => onAction({ type: 'showHint' })}
              >
                <Icon kind="hint" />
                {copy.showMe}
              </button>
              <div
                className="hint"
                id="prototype-hint"
                hidden={!state.hintVisible}
              >
                <p>
                  {state.activity === 'number'
                    ? copy.numberHint
                    : copy.shapeHint}
                </p>
                {state.activity === 'number' ? (
                  <div className="dot-equation" aria-hidden="true">
                    {prototypeDotGroups.map((group, index) => (
                      <span className="dot-group-wrap" key={group[0]}>
                        {index === 1 && (
                          <span className="dot-plus" aria-hidden="true">
                            +
                          </span>
                        )}
                        <span className="dot-group" aria-hidden="true">
                          {group.map((dot) => (
                            <span className="dot" key={dot} />
                          ))}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="hint-shape" aria-hidden="true">
                    <ShapeArt shape="square" />
                  </div>
                )}
              </div>
              <div className="answer-choices">
                {prototypeScenarios[state.activity].choices.map(
                  (choice, index) => (
                    <button
                      className="answer-button"
                      key={choice.id}
                      type="button"
                      aria-label={
                        state.activity === 'shape'
                          ? copy.shapeChoices[index]
                          : undefined
                      }
                      aria-pressed={state.selectedChoice === choice.id}
                      onClick={() =>
                        onAction({ type: 'choose', choiceId: choice.id })
                      }
                    >
                      {choice.shape === undefined ? (
                        choice.display
                      ) : (
                        <ShapeArt shape={choice.shape} />
                      )}
                    </button>
                  ),
                )}
              </div>
              <div
                className="feedback"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {state.feedback === 'retry' && (
                  <>
                    <span className="feedback-symbol" aria-hidden="true">
                      ↻
                    </span>
                    <span>{copy.retry}</span>
                  </>
                )}
              </div>
            </section>
          )}

          {state.screen === 'success' && (
            <section className="success-panel" aria-label={heading}>
              <div className="celebration" aria-hidden="true">
                <span>✦</span>
                <BadgeArt badge={state.badge} />
                <span>✦</span>
              </div>
              <div className="success-result">
                {state.activity === 'number' ? (
                  <span>3 + 2 = 5</span>
                ) : (
                  <span role="img" aria-label={copy.targetDescription}>
                    <ShapeArt shape="square" />
                  </span>
                )}
              </div>
              <button
                className="primary-button"
                type="button"
                onClick={() => onAction({ type: 'continue' })}
              >
                {copy.continue}
                <Icon kind="arrow" />
              </button>
            </section>
          )}

          {state.screen === 'explore' && (
            <section className="explore-panel" aria-label={heading}>
              {state.representation === null && (
                <ArrayAnchor representation={null} copy={copy} />
              )}
              <div className="representations">
                {prototypeRepresentations.map((representation, index) => (
                  <div className="representation-step" key={representation.id}>
                    <span className="representation-arrow" aria-hidden="true">
                      ↓
                    </span>
                    <button
                      className="representation-button"
                      data-representation={
                        representation.id === 'root' ? 'root' : undefined
                      }
                      key={representation.id}
                      type="button"
                      aria-label={copy.representations[index]}
                      aria-describedby={
                        representation.id === 'root'
                          ? 'prototype-representation-root prototype-root-notation'
                          : `prototype-representation-${representation.id}`
                      }
                      aria-pressed={state.representation === representation.id}
                      onClick={() =>
                        onAction({
                          type: 'selectRepresentation',
                          representation: representation.id,
                        })
                      }
                    >
                      {representation.id !== 'root' && (
                        <span
                          className="representation-mark"
                          aria-hidden="true"
                        >
                          {representation.display}
                        </span>
                      )}
                      {state.representation === representation.id && (
                        <ArrayAnchor
                          representation={representation.id}
                          copy={copy}
                        />
                      )}
                      <span
                        className="representation-caption"
                        id={`prototype-representation-${representation.id}`}
                      >
                        {copy.representationCaptions[index]}
                      </span>
                      {representation.id === 'root' && (
                        <span
                          className="representation-mark"
                          id="prototype-root-notation"
                        >
                          <span aria-hidden="true">
                            {representation.display}
                          </span>
                          <span className="root-notation-description">
                            {copy.rootNotation}
                          </span>
                        </span>
                      )}
                      <span className="selection-marker" aria-hidden="true">
                        {state.representation === representation.id ? '◆' : '◇'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
              <p
                className="explore-guide"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {state.representation === null ||
                state.representation === 'root'
                  ? ''
                  : copy.exploreGuides[state.representation]}
              </p>
            </section>
          )}
        </div>
        <footer className="prototype-footer">{copy.prototypeNote}</footer>
      </div>
    </main>
  );
}

export function PrototypeExperience({
  language,
}: {
  readonly language: PrototypeLanguage;
}) {
  const [state, dispatch] = useReducer(prototypeReducer, initialPrototypeState);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousScreen = useRef(state.screen);
  useEffect(() => {
    // Focus the new heading only on screen navigation, never steal answer/hint focus.
    if (previousScreen.current !== state.screen) headingRef.current?.focus();
    previousScreen.current = state.screen;
  }, [state.screen]);
  return (
    <PrototypeScreen
      state={state}
      language={language}
      onAction={dispatch}
      headingRef={headingRef}
    />
  );
}
