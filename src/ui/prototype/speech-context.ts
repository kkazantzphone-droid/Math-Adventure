import type { LanguagePreferences } from '../../presentation/localisation/preferences';
import { buildUtterancePlan } from '../../presentation/speech/plans';
import type {
  SpeechKind,
  UtterancePlan,
} from '../../presentation/speech/plans';
import type { SpeechController } from '../../presentation/speech/controller';
import type { PrototypeAction, PrototypeState } from './model';

/** Fixed synthetic wording only. Number relationships use the independent number-speech choice. */
export function speechForPrototypeState(
  state: PrototypeState,
  preferences: LanguagePreferences,
): UtterancePlan | null {
  let kind: SpeechKind = 'childInstructions';
  let locale = preferences.instructionLocale;
  if (state.screen === 'activity') {
    kind =
      state.activity === 'number'
        ? state.hintVisible
          ? 'numberHint'
          : 'numberPrompt'
        : state.hintVisible
          ? 'shapeHint'
          : 'shapePrompt';
    if (state.activity === 'number') locale = preferences.numberSpeechLocale;
  } else if (state.screen === 'success') {
    kind = 'positiveFeedback';
  } else if (state.screen === 'explore' && state.representation !== null) {
    kind = state.representation;
    locale = preferences.numberSpeechLocale;
  }
  return buildUtterancePlan(kind, locale);
}

/** Cancel synchronously before changing the visual context; speech never dispatches an action. */
export function dispatchPrototypeAction(
  action: PrototypeAction,
  onAction: (action: PrototypeAction) => void,
  speech?: Pick<SpeechController, 'cancel'>,
): void {
  speech?.cancel();
  onAction(action);
}
