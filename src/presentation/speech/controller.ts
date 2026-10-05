import type {
  SpeechCapability,
  SpeechPort,
} from '../../application/ports/speech';
import type { Locale } from '../localisation/locales';
import type { UtterancePlan } from './plans';

export interface SpeechRequest {
  readonly locale: Locale;
}

export interface SpeechVoiceSummary {
  readonly voiceURI: string;
  readonly name: string;
  readonly locale: string;
  readonly localService: boolean;
}

export interface SpeechSnapshot {
  readonly capabilities: Readonly<Record<Locale, SpeechCapability>>;
  /** Transient adult diagnostic labels only; never stored or transmitted. */
  readonly voices: readonly SpeechVoiceSummary[];
}

/** UI depends on this structural presentation contract, not on Web Speech. */
export interface SpeechController extends SpeechPort<
  SpeechRequest,
  UtterancePlan
> {
  snapshot(): SpeechSnapshot;
  subscribe(listener: () => void): () => void;
  refresh(): void;
  dispose(): void;
}
