import { useState } from 'react';
import type { ChapterTask } from '../../application/growing-world';
import type { StructuredAnswer } from '../../domain/puzzles/contracts';
import type { PrototypeLocale } from '../../presentation/localisation/locales';
import { answerEntryCopy } from '../../presentation/localisation/answer-entry-copy';
import { getGrowingWorldCopy } from '../../presentation/localisation/growing-world-copy';
import { ChildAnswerCard } from './ChildPrimitives';
import { chapterAnswerMaximum, chapterNumberAnswer } from './chapter-answers';
import './chapter-answer-entry.css';

/** Compact selection waits for Check; the original direct cards submit immediately. */
export function ChapterAnswerEntry({
  task,
  uiLocale,
  instructionLocale,
  disabled,
  onAnswer,
}: {
  readonly task: ChapterTask;
  readonly uiLocale: PrototypeLocale;
  readonly instructionLocale: PrototypeLocale;
  readonly disabled: boolean;
  readonly onAnswer: (answer: StructuredAnswer) => void;
}) {
  const [selected, setSelected] = useState('');
  const ui = answerEntryCopy(uiLocale);
  const copy = getGrowingWorldCopy(instructionLocale);
  const max = chapterAnswerMaximum(task);
  const choose = (value: number) => {
    const answer = chapterNumberAnswer(task, value);
    if (answer) {
      setSelected(String(value));
      onAnswer(answer);
    }
  };
  const cards = (
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
          onChoose={() => choose(value)}
        >
          <span className="child-answer-number">{value}</span>
          {task.kind === 'arrayArea' && (
            <span className="world-answer-unit">{copy.unit}</span>
          )}
        </ChildAnswerCard>
      ))}
    </div>
  );
  if (max <= 10) return cards;
  return (
    <div className="chapter-answer-entry" data-answer-entry>
      <div className="chapter-response" lang={uiLocale}>
        <label htmlFor="chapter-number-response">
          {ui.response} · {ui.choose}
        </label>
        <div className="chapter-response-controls">
          <select
            id="chapter-number-response"
            data-answer-select
            value={selected}
            disabled={disabled}
            aria-describedby={
              task.kind === 'arrayArea' ? 'chapter-response-unit' : undefined
            }
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">—</option>
            {Array.from({ length: max + 1 }, (_, value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
          {task.kind === 'arrayArea' && (
            <span id="chapter-response-unit" lang={instructionLocale}>
              {copy.unit}
            </span>
          )}
          <button
            type="button"
            data-answer-submit
            disabled={disabled || selected === ''}
            onClick={() => {
              if (selected !== '') choose(Number(selected));
            }}
          >
            {ui.check}
          </button>
        </div>
      </div>
      <details data-direct-answers>
        <summary lang={uiLocale}>{ui.direct}</summary>
        <p lang={uiLocale}>{ui.directHint}</p>
        {cards}
      </details>
    </div>
  );
}
