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
}: {
  readonly record: SyntheticLoopRecord;
  readonly preferences: LoopPreferences;
  readonly open: boolean;
  readonly disabled: boolean;
  readonly onOpen: () => void;
  readonly onChoose: (family: LoopFamilyId) => void;
  readonly familyLabel: (family: LoopFamilyId) => string;
  readonly onMode: () => void;
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
      {invitation && (
        <div
          className="growth-invitation"
          data-invitation-reason={invitation.reason}
        >
          <p>{copy.reasons[invitation.reason]}</p>
          <button
            type="button"
            data-invitation-family={invitation.familyId}
            disabled={disabled}
            onClick={() => onChoose(invitation.familyId)}
          >
            {copy.familyLabels[invitation.familyId]}
          </button>
        </div>
      )}
      {journey.currentEdge && <p data-chapter-edge>{copy.chapterEnd}</p>}
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
          <button
            type="button"
            data-journey-mode
            aria-pressed={record.mode === 'synthetic-policy'}
            disabled={disabled}
            onClick={onMode}
          >
            {record.mode === 'synthetic-policy'
              ? copy.guidedPractice
              : copy.chooseGuidedPractice}
          </button>
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
