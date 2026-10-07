import type { Locale } from '../../presentation/localisation/locales';
import type { OfflineSnapshot } from '../../presentation/offline/controller';
import { offlineCopy } from '../../presentation/offline/copy';
import './offline.css';
import { useEffect, useRef } from 'react';

/** Deliberate adult controls; shell readiness is independent of optional speech. */
export function OfflineControls({
  locale,
  snapshot,
  onUpdate,
  copyOverride,
}: {
  readonly locale: Locale;
  readonly snapshot: OfflineSnapshot;
  readonly onUpdate: () => void;
  readonly copyOverride?: ReturnType<typeof offlineCopy>;
}) {
  const copy = copyOverride ?? offlineCopy(locale);
  const updateButton = useRef<HTMLButtonElement>(null);
  const initiatedHere = useRef(false);
  useEffect(() => {
    if (
      initiatedHere.current &&
      snapshot.update === 'blocked' &&
      !snapshot.frozen
    ) {
      updateButton.current?.focus();
      initiatedHere.current = false;
    }
  }, [snapshot.update, snapshot.frozen]);
  return (
    <aside
      className="offline-controls"
      lang={copy.locale}
      aria-labelledby="offline-heading"
      data-offline-state={snapshot.shell}
      data-offline-update={snapshot.update}
    >
      <h2 id="offline-heading">{copy.heading}</h2>
      <p>{copy.shell[snapshot.shell]}</p>
      <p>{copy.separate}</p>
      <p
        className="offline-update-status"
        data-frozen={snapshot.frozen}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={snapshot.frozen ? 0 : undefined}
      >
        {copy.update[snapshot.update]}
      </p>
      <details inert={snapshot.frozen}>
        <summary>{copy.adult}</summary>
        <p id="offline-update-warning">{copy.warning}</p>
        <button
          ref={updateButton}
          type="button"
          data-offline-action="update"
          aria-describedby="offline-update-warning"
          disabled={
            !snapshot.safeBoundary ||
            snapshot.frozen ||
            (snapshot.update !== 'waiting' && snapshot.update !== 'blocked')
          }
          onClick={() => {
            initiatedHere.current = true;
            onUpdate();
          }}
        >
          {copy.action}
        </button>
      </details>
    </aside>
  );
}
