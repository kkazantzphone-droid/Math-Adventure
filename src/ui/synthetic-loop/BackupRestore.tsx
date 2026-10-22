import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  readSyntheticLoopBackup,
  summarizeSyntheticLoopProfile,
  SYNTHETIC_BACKUP_LIMITS,
  SYNTHETIC_LOOP_CATALOG,
} from '../../application/synthetic-loop';
import type {
  LoopFamilyId,
  SyntheticBackupErrorCode,
  SyntheticBackupFile,
  SyntheticLoopRecord,
  ValidatedSyntheticBackup,
} from '../../application/synthetic-loop';
import { SYNTHETIC_PROFILE_IDS } from '../../domain/adaptation/types';
import type { SyntheticProfileId } from '../../domain/adaptation/types';
import { backupCopy } from '../../presentation/localisation/backup-copy';
import type { BackupCopy } from '../../presentation/localisation/backup-copy';
import { languageNames } from '../../presentation/localisation/language-controls-copy';
import {
  resolvePrototypeLocale,
  type Locale,
} from '../../presentation/localisation/locales';
import './backup-restore.css';

export const SYNTHETIC_BACKUP_FILE_NAME =
  'math-adventure-synthetic-backup.json';

export type BackupPreparation =
  | { readonly kind: 'ready'; readonly file: SyntheticBackupFile }
  | { readonly kind: 'nothing-saved' }
  | { readonly kind: 'failed' };
export type DestinationCheck =
  | {
      readonly kind: 'available';
      readonly epoch: number;
      readonly fresh: boolean;
    }
  | {
      readonly kind: 'occupied';
      readonly profiles: readonly SyntheticProfileId[];
    }
  | { readonly kind: 'unavailable' };
export type RestoreFailure =
  'occupied' | 'changed' | 'quota' | 'unavailable' | 'blocked';
export type RestoreOutcome =
  | { readonly kind: 'restored' }
  | { readonly kind: 'not-restored'; readonly reason: RestoreFailure }
  | { readonly kind: 'uncertain' };

/** Composition supplies storage operations; this view never writes itself. */
export interface BackupRestoreActions {
  prepareBackup(): Promise<BackupPreparation>;
  inspectDestination(): Promise<DestinationCheck>;
  restore(
    backup: ValidatedSyntheticBackup,
    epoch: number,
  ): Promise<RestoreOutcome>;
  checkRestore(): Promise<RestoreOutcome>;
}

type Refusal =
  Exclude<SyntheticBackupErrorCode, 'nothing_saved'> | 'unreadable';
type BackupState =
  | { readonly step: 'idle' | 'preparing' | 'nothing' | 'failed' }
  | {
      readonly step: 'ready';
      readonly url: string;
      readonly file: SyntheticBackupFile;
      readonly requested: boolean;
    };
type RestoreState =
  | { readonly step: 'idle' | 'reading' | 'cancelled' }
  | { readonly step: 'refused'; readonly code: Refusal }
  | {
      readonly step: 'preview';
      readonly backup: ValidatedSyntheticBackup;
      readonly destination: DestinationCheck | null;
    }
  | {
      readonly step: 'restoring' | 'restored' | 'uncertain';
      readonly backup: ValidatedSyntheticBackup;
    }
  | {
      readonly step: 'not-restored';
      readonly backup: ValidatedSyntheticBackup;
      readonly reason: RestoreFailure;
    };

function badgeName(copy: BackupCopy, profile: SyntheticProfileId): string {
  return profile === SYNTHETIC_PROFILE_IDS[0]
    ? copy.badges.star
    : copy.badges.triangle;
}

export function BackupProfileSummary({
  record,
  copy,
  familyLabel,
  headingLevel,
}: {
  readonly record: SyntheticLoopRecord;
  readonly copy: BackupCopy;
  readonly familyLabel: (family: LoopFamilyId) => string;
  readonly headingLevel: 'h4' | 'h5';
}) {
  const summary = summarizeSyntheticLoopProfile(record);
  const Heading = headingLevel;
  const id = `backup-profile-${headingLevel}-${summary.profileId.toLowerCase()}`;
  const languages = [
    [copy.fields.screenLanguage, summary.preferences.uiLocale],
    [copy.fields.instructionLanguage, summary.preferences.instructionLocale],
    [copy.fields.numberLanguage, summary.preferences.numberSpeechLocale],
  ] as const;
  const counts = [
    [copy.fields.finished, summary.completedCount, 'finished'],
    [copy.fields.independent, summary.independent, 'independent'],
    [copy.fields.supported, summary.supported, 'supported'],
    [copy.fields.worked, summary.worked, 'worked'],
    [copy.fields.notYet, summary.notYet, 'not-yet'],
    [copy.fields.notCounted, summary.notCounted, 'not-counted'],
    [copy.fields.help, summary.helpContexts, 'help'],
  ] as const;
  const conceptFamily = (concept: string) =>
    SYNTHETIC_LOOP_CATALOG.scopes.find((scope) => scope.conceptId === concept)
      ?.familyId;
  return (
    <article
      className="backup-profile"
      data-backup-profile={summary.profileId}
      aria-labelledby={id}
    >
      <Heading id={id}>{badgeName(copy, summary.profileId)}</Heading>
      <dl>
        <div>
          <dt>{copy.fields.world}</dt>
          <dd data-backup-world={summary.world}>
            {copy.worlds[summary.world]}
          </dd>
        </div>
        {languages.map(([label, tag]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd lang={tag}>{languageNames[tag]}</dd>
          </div>
        ))}
        <div>
          <dt>{copy.fields.mode}</dt>
          <dd>{copy.modes[summary.mode]}</dd>
        </div>
        <div>
          <dt>{copy.fields.activity}</dt>
          <dd>{familyLabel(summary.selectedFamily)}</dd>
        </div>
        <div>
          <dt>{copy.fields.session}</dt>
          <dd>
            {summary.sessionOrdinal} ·{' '}
            {summary.sessionActive ? copy.sessionOpen : copy.sessionStopped}
          </dd>
        </div>
        {counts.map(([label, value, key]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd data-backup-count={key}>{value}</dd>
          </div>
        ))}
        <div>
          <dt>{copy.fields.accomplishments}</dt>
          <dd>
            {summary.accomplishments.length === 0
              ? copy.none
              : summary.accomplishments
                  .map((item) => {
                    const family = conceptFamily(item.concept);
                    return `${family ? familyLabel(family) : item.concept}: ${copy.states[item.state]}`;
                  })
                  .join('; ')}
          </dd>
        </div>
        <div>
          <dt>{copy.fields.discoveries}</dt>
          <dd>
            {summary.discoveries.length === 0
              ? copy.none
              : summary.discoveries.map(familyLabel).join('; ')}
          </dd>
        </div>
      </dl>
    </article>
  );
}

/** Adult-only backup, preview and restore. Success text appears only after the
 * composition reports a completed transaction and its separate readback. */
export function BackupRestore({
  locale,
  disabled,
  badgeOpen,
  actions,
  familyLabel,
  onRestored,
}: {
  readonly locale: Locale;
  readonly disabled: boolean;
  readonly badgeOpen: boolean;
  readonly actions: BackupRestoreActions;
  readonly familyLabel: (family: LoopFamilyId) => string;
  readonly onRestored: () => void;
}) {
  const effective = resolvePrototypeLocale(locale).effectiveLocale;
  const copy = backupCopy(effective);
  const [backup, setBackup] = useState<BackupState>({ step: 'idle' });
  const [restore, setRestore] = useState<RestoreState>({ step: 'idle' });
  const backupToken = useRef(0);
  const restoreToken = useRef(0);
  const objectURL = useRef<string | null>(null);
  const focusTarget = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (objectURL.current) URL.revokeObjectURL(objectURL.current);
    },
    [],
  );
  useLayoutEffect(() => {
    const selector = focusTarget.current;
    if (!selector) return;
    focusTarget.current = null;
    document.querySelector<HTMLElement>(selector)?.focus();
  }, [backup, restore]);

  async function prepare() {
    const token = ++backupToken.current;
    if (objectURL.current) URL.revokeObjectURL(objectURL.current);
    objectURL.current = null;
    setBackup({ step: 'preparing' });
    const result = await actions.prepareBackup();
    if (token !== backupToken.current) return;
    if (result.kind !== 'ready') {
      setBackup({
        step: result.kind === 'nothing-saved' ? 'nothing' : 'failed',
      });
      return;
    }
    const url = URL.createObjectURL(
      new Blob([result.file.text], { type: 'application/json' }),
    );
    objectURL.current = url;
    focusTarget.current = '[data-backup-save]';
    setBackup({ step: 'ready', url, file: result.file, requested: false });
  }

  async function inspect(selected: ValidatedSyntheticBackup, token: number) {
    setRestore({ step: 'preview', backup: selected, destination: null });
    const destination = await actions.inspectDestination();
    if (token !== restoreToken.current) return;
    focusTarget.current = '#restore-preview-heading';
    setRestore({ step: 'preview', backup: selected, destination });
  }

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const token = ++restoreToken.current;
    setRestore({ step: 'reading' });
    let text: string | null = null;
    let refusal: Refusal | null = null;
    // Size is checked before reading; the validator bounds the text again.
    if (file.size > SYNTHETIC_BACKUP_LIMITS.bytes) refusal = 'too_large';
    else
      try {
        text = await file.text();
      } catch {
        refusal = 'unreadable';
      }
    input.value = '';
    if (token !== restoreToken.current) return;
    const checked = text === null ? null : readSyntheticLoopBackup(text);
    if (checked && !checked.ok && checked.error.code !== 'nothing_saved')
      refusal = checked.error.code;
    if (refusal || !checked?.ok) {
      setRestore({ step: 'refused', code: refusal ?? 'invalid_contents' });
      return;
    }
    await inspect(checked.value, token);
  }

  function apply(selected: ValidatedSyntheticBackup, outcome: RestoreOutcome) {
    focusTarget.current = '[data-restore-state]';
    if (outcome.kind === 'restored') {
      setRestore({ step: 'restored', backup: selected });
      onRestored();
    } else if (outcome.kind === 'uncertain')
      setRestore({ step: 'uncertain', backup: selected });
    else
      setRestore({
        step: 'not-restored',
        backup: selected,
        reason: outcome.reason,
      });
  }

  async function confirm() {
    if (restore.step !== 'preview' || restore.destination?.kind !== 'available')
      return;
    const token = ++restoreToken.current;
    const selected = restore.backup;
    setRestore({ step: 'restoring', backup: selected });
    const outcome = await actions.restore(selected, restore.destination.epoch);
    if (token === restoreToken.current) apply(selected, outcome);
  }

  async function check(selected: ValidatedSyntheticBackup) {
    const token = ++restoreToken.current;
    setRestore({ step: 'restoring', backup: selected });
    const outcome = await actions.checkRestore();
    if (token === restoreToken.current) apply(selected, outcome);
  }

  function cancel() {
    restoreToken.current += 1;
    focusTarget.current = '[data-restore-file]';
    setRestore({ step: 'cancelled' });
  }

  const backupStatus =
    backup.step === 'preparing'
      ? copy.preparing
      : backup.step === 'nothing'
        ? copy.nothingSaved
        : backup.step === 'failed'
          ? copy.backupFailed
          : backup.step === 'ready'
            ? backup.requested
              ? copy.saveRequested
              : copy.ready
            : '';
  const restoreStatus =
    restore.step === 'reading'
      ? copy.checkingFile
      : restore.step === 'refused'
        ? copy.refused[restore.code]
        : restore.step === 'cancelled'
          ? copy.cancelled
          : restore.step === 'restoring'
            ? copy.restoring
            : restore.step === 'restored'
              ? copy.restored
              : restore.step === 'uncertain'
                ? copy.uncertain
                : restore.step === 'not-restored'
                  ? copy.notRestored[restore.reason]
                  : restore.step === 'preview' && !restore.destination
                    ? copy.destination.checking
                    : '';
  const busyRestore =
    restore.step === 'reading' || restore.step === 'restoring';
  const backupState =
    backup.step === 'ready' && backup.requested ? 'requested' : backup.step;

  return (
    <section
      className="slice-panel backup-restore"
      data-backup-restore
      lang={effective}
      aria-labelledby="backup-restore-heading"
    >
      <h2 id="backup-restore-heading">{copy.heading}</h2>
      <p>{copy.intro}</p>
      <section aria-labelledby="backup-kinds-heading">
        <h3 id="backup-kinds-heading">{copy.kindsHeading}</h3>
        <ul>
          {copy.kinds.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="backup-make-heading">
        <h3 id="backup-make-heading">{copy.backupHeading}</h3>
        <h4>{copy.containsHeading}</h4>
        <ul data-backup-contains>
          {copy.contains.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h4>{copy.excludesHeading}</h4>
        <ul data-backup-excludes>
          {copy.excludes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{copy.privacy}</p>
        <p>{copy.checksum}</p>
        <div className="slice-actions">
          <button
            type="button"
            data-backup-action="prepare"
            disabled={disabled || backup.step === 'preparing'}
            onClick={() => void prepare()}
          >
            {copy.prepare}
          </button>
        </div>
        <p
          className="backup-status"
          role="status"
          tabIndex={-1}
          data-backup-state={backupState}
        >
          {backupStatus}
        </p>
        {backup.step === 'ready' && (
          <>
            {backup.file.backup.profiles.map((record) => (
              <BackupProfileSummary
                key={record.profileId}
                record={record}
                copy={copy}
                familyLabel={familyLabel}
                headingLevel="h4"
              />
            ))}
            {backup.file.excludedPending > 0 && (
              <p data-backup-pending-excluded={backup.file.excludedPending}>
                {copy.pendingExcluded}
              </p>
            )}
            <p className="slice-actions">
              <a
                className="backup-save-link"
                href={backup.url}
                download={SYNTHETIC_BACKUP_FILE_NAME}
                data-backup-save
                onClick={() =>
                  setBackup((current) =>
                    current.step === 'ready'
                      ? { ...current, requested: true }
                      : current,
                  )
                }
              >
                {copy.saveFile}
              </a>
            </p>
            <p>
              {copy.fileName}: <code>{SYNTHETIC_BACKUP_FILE_NAME}</code>
            </p>
          </>
        )}
      </section>
      <section aria-labelledby="restore-heading">
        <h3 id="restore-heading">{copy.restoreHeading}</h3>
        <p>{copy.restoreIntro}</p>
        <label className="backup-file-choice">
          <span>{copy.chooseFile}</span>
          <input
            type="file"
            accept=".json,application/json"
            data-restore-file
            disabled={disabled || busyRestore}
            onChange={(event) => void choose(event)}
          />
        </label>
        <p
          className="backup-status"
          role="status"
          tabIndex={-1}
          data-restore-state={restore.step}
          data-restore-refusal={
            restore.step === 'refused' ? restore.code : undefined
          }
          data-restore-reason={
            restore.step === 'not-restored' ? restore.reason : undefined
          }
        >
          {restoreStatus}
        </p>
        {restore.step === 'preview' && (
          <div className="backup-preview" data-restore-preview>
            <h4 id="restore-preview-heading" tabIndex={-1}>
              {copy.previewHeading}
            </h4>
            <p>{copy.previewIntro}</p>
            {restore.backup.profiles.map((record) => (
              <BackupProfileSummary
                key={record.profileId}
                record={record}
                copy={copy}
                familyLabel={familyLabel}
                headingLevel="h5"
              />
            ))}
            {restore.destination && (
              <p data-restore-destination={restore.destination.kind}>
                {copy.destination[restore.destination.kind]}
              </p>
            )}
            {restore.destination?.kind === 'available' && badgeOpen && (
              <p>{copy.closesBadge}</p>
            )}
            <div className="slice-actions">
              {restore.destination?.kind === 'available' && (
                <button
                  type="button"
                  data-restore-action="confirm"
                  disabled={disabled}
                  onClick={() => void confirm()}
                >
                  {copy.restore}
                </button>
              )}
              {restore.destination?.kind === 'unavailable' && (
                <button
                  type="button"
                  data-restore-action="recheck"
                  disabled={disabled}
                  onClick={() =>
                    void inspect(restore.backup, ++restoreToken.current)
                  }
                >
                  {copy.checkBrowser}
                </button>
              )}
              <button
                type="button"
                data-restore-action="cancel"
                onClick={cancel}
              >
                {copy.cancel}
              </button>
            </div>
          </div>
        )}
        {restore.step === 'not-restored' && (
          <div className="slice-actions">
            <button
              type="button"
              data-restore-action="recheck"
              disabled={disabled}
              onClick={() =>
                void inspect(restore.backup, ++restoreToken.current)
              }
            >
              {copy.checkBrowser}
            </button>
            <button type="button" data-restore-action="cancel" onClick={cancel}>
              {copy.cancel}
            </button>
          </div>
        )}
        {restore.step === 'uncertain' && (
          <div className="slice-actions">
            <button
              type="button"
              data-restore-action="check"
              disabled={disabled}
              onClick={() => void check(restore.backup)}
            >
              {copy.checkAgain}
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
