import type {
  LoopFamilyId,
  LoopPreferences,
  SyntheticLoopRecord,
} from '../../application/synthetic-loop';
import { SYNTHETIC_LOOP_EVENT_LIMIT } from '../../application/synthetic-loop/types';
import { growingJourneyForRecord } from '../../application/synthetic-loop/record';
import { CHAPTER_FAMILY_IDS } from '../../domain/growing-world/content';
import { PROOF_FAMILY_IDS } from '../../domain/families/proofs';
import { SLICE_FAMILY_IDS } from '../../domain/families/slice';
import { getGrowingWorldCopy } from '../../presentation/localisation/growing-world-copy';
import { resolvePrototypeLocale } from '../../presentation/localisation/locales';
import type { Locale } from '../../presentation/localisation/locales';
import './growth-journey.css';

/** Plain-language context stays in the deliberate adult view, above diagnostics. */
export function GrowingWorldAdultExplanation({
  locale,
}: {
  readonly locale: Locale;
}) {
  const effective = resolvePrototypeLocale(locale).effectiveLocale;
  const copy = getGrowingWorldCopy(effective);
  return (
    <section
      className="slice-panel growth-adult-explanation"
      data-adult-experience
      lang={effective}
      aria-labelledby="adult-experience-heading"
    >
      <h2 id="adult-experience-heading" tabIndex={-1}>
        {copy.adultHeading}
      </h2>
      <p>{copy.adultSaving}</p>
      <p>{copy.adultEvidence}</p>
      <p>{copy.adultExploration}</p>
      <p>{copy.adultLimits}</p>
    </section>
  );
}

/** Invitations describe bounded evidence. Every path remains an explicit choice. */
export function GrowthJourney({
  record,
  preferences,
  open,
  disabled,
  onOpen,
  onChoose,
  familyLabel,
  onMode,
  onExplore,
}: {
  readonly record: SyntheticLoopRecord;
  readonly preferences: LoopPreferences;
  readonly open: boolean;
  readonly disabled: boolean;
  readonly onOpen: () => void;
  readonly onChoose: (family: LoopFamilyId) => void;
  readonly familyLabel: (family: LoopFamilyId) => string;
  readonly onMode: () => void;
  readonly onExplore?: () => void;
}) {
  const locale = resolvePrototypeLocale(preferences.uiLocale).effectiveLocale;
  const copy = getGrowingWorldCopy(locale);
  const result = growingJourneyForRecord(record);
  if (!result.ok) return null;
  const journey = result.value;
  const remainsToTry = (family: LoopFamilyId) =>
    !journey.readiness.some(
      (item) => item.familyId === family && item.readyForInvitation,
    );
  const invitation =
    journey.invitations.find((item) => item.reason === 'support') ??
    journey.invitations.find(
      (item) =>
        item.reason === 'connectedReadiness' && remainsToTry(item.familyId),
    ) ??
    journey.invitations.find((item) => remainsToTry(item.familyId));
  return (
    <section className="growth-journey" data-growing-journey lang={locale}>
      <h2 id="growth-journey-heading" tabIndex={-1}>
        {copy.chapterTitle}
      </h2>
      <div className="growth-mode-choice">
        <p data-journey-current-mode>
          <strong>
            {record.mode === 'synthetic-policy'
              ? copy.guidedMode
              : copy.manualMode}
          </strong>
          <span>
            {record.mode === 'synthetic-policy'
              ? copy.guidedExplanation
              : copy.manualExplanation}
          </span>
        </p>
        <div
          className="growth-mode-buttons"
          role="group"
          aria-label={copy.modeChoice}
        >
          <button
            type="button"
            data-journey-mode
            aria-pressed={record.mode === 'synthetic-policy'}
            disabled={disabled}
            onClick={() => {
              if (record.mode === 'manual') onMode();
            }}
          >
            {copy.guidedMode}
          </button>
          <button
            type="button"
            data-journey-manual
            aria-pressed={record.mode === 'manual'}
            disabled={disabled}
            onClick={() => {
              if (record.mode === 'synthetic-policy') onMode();
            }}
          >
            {copy.manualMode}
          </button>
        </div>
      </div>
      <p className="growth-evidence-notice">{copy.activityChoiceHint}</p>
      {invitation && (
        <div
          className="growth-invitation"
          data-invitation-reason={invitation.reason}
        >
          <h3>{copy.invitation}</h3>
          <p id="growth-invitation-reason">{copy.reasons[invitation.reason]}</p>
          <button
            type="button"
            data-invitation-family={invitation.familyId}
            aria-describedby="growth-invitation-reason"
            disabled={disabled}
            onClick={() => onChoose(invitation.familyId)}
          >
            {copy.familyLabels[invitation.familyId]}
          </button>
        </div>
      )}
      {journey.currentEdge && (
        <div className="growth-chapter-edge" data-chapter-edge>
          <p>{copy.chapterEnd}</p>
          <div className="growth-edge-actions">
            <button
              type="button"
              data-chapter-revisit
              aria-controls="growth-discoveries"
              aria-expanded={open}
              disabled={disabled}
              onClick={onOpen}
            >
              {open ? copy.closeDiscoveries : copy.revisitChapter}
            </button>
            {onExplore && (
              <button
                type="button"
                data-chapter-explore
                disabled={disabled}
                onClick={onExplore}
              >
                {copy.exploreChapter}
              </button>
            )}
          </div>
        </div>
      )}
      {journey.capacityReached && (
        <p data-chapter-capacity>{copy.capacityReached}</p>
      )}
      {record.events.length >= SYNTHETIC_LOOP_EVENT_LIMIT &&
        PROOF_FAMILY_IDS.some((family) => family === record.selectedFamily) && (
          <p data-legacy-capacity>{copy.legacyCapacity}</p>
        )}
      <button
        type="button"
        data-action="discoveries"
        disabled={disabled}
        aria-expanded={open}
        aria-controls="growth-discoveries"
        onClick={onOpen}
      >
        {open ? copy.closeDiscoveries : copy.chooseDiscovery}
      </button>
      {open && (
        <div id="growth-discoveries">
          <p className="growth-evidence-notice">{copy.experimentalNotice}</p>
          <p className="growth-evidence-notice" data-chapter-boundary>
            {copy.boundary}
          </p>
          <div className="growth-opportunities">
            {CHAPTER_FAMILY_IDS.map((family) => {
              const readiness = journey.readiness.find(
                (item) => item.familyId === family,
              );
              return (
                <button
                  type="button"
                  key={family}
                  data-discovery-family={family}
                  disabled={disabled}
                  aria-pressed={record.selectedFamily === family}
                  onClick={() => onChoose(family)}
                >
                  <span>{copy.familyLabels[family]}</span>
                  {readiness?.readyForInvitation && (
                    <small>{copy.readyLabel}</small>
                  )}
                </button>
              );
            })}
          </div>
          <h3>{copy.familiarTitle}</h3>
          <div className="growth-opportunities">
            {[...PROOF_FAMILY_IDS, ...SLICE_FAMILY_IDS].map((family) => (
              <button
                type="button"
                key={family}
                data-discovery-family={family}
                disabled={disabled}
                onClick={() => onChoose(family)}
              >
                {familyLabel(family)}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
