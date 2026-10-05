import type { PrototypeCopy } from '../prototype/copy';
import type {
  SpeechController,
  SpeechSnapshot,
} from '../../presentation/speech/controller';
import type { UtterancePlan } from '../../presentation/speech/plans';

export function SpeechControls({
  speech,
  snapshot,
  plan,
  copy,
}: {
  readonly speech: SpeechController;
  readonly snapshot: SpeechSnapshot;
  readonly plan: UtterancePlan | null;
  readonly copy: PrototypeCopy;
}) {
  if (
    plan === null ||
    snapshot.capabilities[plan.locale].state !== 'ready-local'
  )
    return null;
  return (
    <div className="speech-controls">
      <button
        className="nav-button"
        type="button"
        onClick={() => {
          void speech.speak(plan).catch(() => undefined);
        }}
      >
        {copy.listen}
      </button>
      <button
        className="nav-button"
        type="button"
        onClick={() => speech.cancel()}
      >
        {copy.mute}
      </button>
    </div>
  );
}
