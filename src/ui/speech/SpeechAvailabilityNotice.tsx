import type { Locale } from '../../presentation/localisation/locales';
import type { SpeechSnapshot } from '../../presentation/speech/controller';
import type { UtterancePlan } from '../../presentation/speech/plans';

/** Capability alone cannot supply a phrase, especially for a planned pack. */
export function SpeechAvailabilityNotice({
  locale,
  plan,
  snapshot,
  unavailable,
  loading,
  speechRole,
}: {
  readonly locale: Locale;
  readonly plan: UtterancePlan | null;
  readonly snapshot: SpeechSnapshot;
  readonly unavailable: string;
  readonly loading: string;
  readonly speechRole: 'question' | 'number';
}) {
  const capability = snapshot.capabilities[locale].state;
  if (plan !== null && plan.locale === locale && capability === 'ready-local')
    return null;
  return (
    <p
      className="child-language-note"
      data-child-speech-availability={
        speechRole === 'question' ? true : undefined
      }
      data-child-number-speech-availability={
        speechRole === 'number' ? true : undefined
      }
    >
      {plan !== null && capability === 'loading' ? loading : unavailable}
    </p>
  );
}
