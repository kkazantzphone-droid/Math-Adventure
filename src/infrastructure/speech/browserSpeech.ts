import type {
  SpeechCapability,
  SpeechOutcome,
} from '../../application/ports/speech';
import {
  isLocale,
  SUPPORTED_LOCALES,
  type Locale,
} from '../../presentation/localisation/locales';
import type {
  SpeechController,
  SpeechRequest,
  SpeechSnapshot,
} from '../../presentation/speech/controller';
import {
  buildUtterancePlan,
  isCatalogueUtterancePlan,
  type UtterancePlan,
} from '../../presentation/speech/plans';

export interface BrowserVoice {
  readonly voiceURI: string;
  readonly name: string;
  readonly lang: string;
  readonly localService: boolean;
  readonly default: boolean;
}

export interface BackendUtterance {
  readonly text: string;
  readonly locale: Locale;
  readonly voice: BrowserVoice;
  readonly onEnd: () => void;
  readonly onError: (cancelled: boolean) => void;
}

/** Small injectable browser boundary. Fakes do not need DOM/Web Speech globals. */
export interface BrowserSpeechBackend {
  getVoices(): readonly BrowserVoice[];
  subscribeVoicesChanged(listener: () => void): () => void;
  speak(utterance: BackendUtterance): void;
  cancel(): void;
}

export interface SpeechScheduler {
  schedule(delayMs: number, callback: () => void): () => void;
}

export interface BrowserSpeechOptions {
  readonly loadingTimeoutMs?: number;
  readonly retryIntervalMs?: number;
  readonly utteranceTimeoutMs?: number;
  readonly scheduler?: SpeechScheduler;
}

const browserScheduler: SpeechScheduler = {
  schedule(delayMs, callback) {
    const timer = globalThis.setTimeout(callback, delayMs);
    return () => globalThis.clearTimeout(timer);
  },
};

function boundedMilliseconds(
  value: number | undefined,
  fallback: number,
): number {
  return value !== undefined &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 60_000
    ? value
    : fallback;
}

/** BCP-47 is case-insensitive, but region/language substitution is forbidden. */
export function isExactLocalVoice(
  voice: BrowserVoice,
  locale: Locale,
): boolean {
  return (
    voice.localService === true &&
    voice.lang.toLowerCase() === locale.toLowerCase()
  );
}

function voiceKey(voice: BrowserVoice): string {
  return JSON.stringify([
    voice.voiceURI,
    voice.lang,
    voice.name,
    voice.localService,
  ]);
}

function sameSnapshot(a: SpeechSnapshot, b: SpeechSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface ActiveUtterance {
  readonly resolve: (outcome: SpeechOutcome) => void;
  cancelWatchdog: () => void;
}

export class BrowserSpeechAdapter implements SpeechController {
  private readonly listeners = new Set<() => void>();
  private readonly scheduler: SpeechScheduler;
  private readonly loadingTimeoutMs: number;
  private readonly retryIntervalMs: number;
  private readonly utteranceTimeoutMs: number;
  private voices: readonly BrowserVoice[] = [];
  private current: SpeechSnapshot;
  private cancelLoading: () => void = () => {};
  private cancelRetry: () => void = () => {};
  private unsubscribeVoices: () => void = () => {};
  private active: ActiveUtterance | null = null;
  private disposed = false;
  private loading = false;

  constructor(
    private readonly backend: BrowserSpeechBackend | null,
    options: BrowserSpeechOptions = {},
  ) {
    this.scheduler = options.scheduler ?? browserScheduler;
    this.loadingTimeoutMs = boundedMilliseconds(options.loadingTimeoutMs, 1500);
    this.retryIntervalMs = boundedMilliseconds(options.retryIntervalMs, 150);
    this.utteranceTimeoutMs = boundedMilliseconds(
      options.utteranceTimeoutMs,
      10_000,
    );
    this.current = this.createSnapshot('unknown');
    if (backend === null) {
      this.current = this.createSnapshot('missing');
      return;
    }
    try {
      this.unsubscribeVoices = backend.subscribeVoicesChanged(() =>
        this.enumerate(),
      );
    } catch {
      this.current = this.createSnapshot('error');
      return;
    }
    this.refresh();
  }

  snapshot(): SpeechSnapshot {
    return this.current;
  }

  subscribe(listener: () => void): () => void {
    if (this.disposed) return () => {};
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  capabilities(request: SpeechRequest): Promise<SpeechCapability> {
    if (!this.validRequest(request)) return Promise.resolve({ state: 'error' });
    return Promise.resolve(this.current.capabilities[request.locale]);
  }

  refresh(): void {
    if (this.disposed || this.backend === null) return;
    this.cancelLoading();
    this.cancelRetry();
    this.loading = true;
    this.cancelLoading = this.scheduler.schedule(this.loadingTimeoutMs, () => {
      this.loading = false;
      this.cancelRetry();
      this.enumerate();
    });
    this.enumerate();
  }

  private validRequest(value: unknown): value is SpeechRequest {
    try {
      if (typeof value !== 'object' || value === null) return false;
      const prototype: unknown = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) return false;
      const descriptor = Object.getOwnPropertyDescriptor(value, 'locale');
      return (
        Reflect.ownKeys(value).length === 1 &&
        descriptor !== undefined &&
        'value' in descriptor &&
        isLocale(descriptor.value)
      );
    } catch {
      return false;
    }
  }

  private enumerate(): void {
    if (this.disposed || this.backend === null) return;
    try {
      const unique = new Map<string, BrowserVoice>();
      for (const voice of this.backend.getVoices()) {
        if (
          typeof voice.voiceURI !== 'string' ||
          typeof voice.name !== 'string' ||
          typeof voice.lang !== 'string' ||
          typeof voice.localService !== 'boolean'
        )
          continue;
        unique.set(voiceKey(voice), voice);
      }
      this.voices = Object.freeze([...unique.values()]);
      if (this.voices.length > 0) {
        this.loading = false;
        this.cancelLoading();
        this.cancelRetry();
      } else if (this.loading) {
        this.cancelRetry();
        this.cancelRetry = this.scheduler.schedule(this.retryIntervalMs, () =>
          this.enumerate(),
        );
      }
      this.publish(this.createSnapshot(this.loading ? 'loading' : 'missing'));
      // A removed or changed provider cannot leave an obsolete utterance running.
      if (this.active !== null) this.cancel();
    } catch {
      this.loading = false;
      this.cancelLoading();
      this.cancelRetry();
      this.voices = [];
      this.publish(this.createSnapshot('error'));
      this.cancel();
    }
  }

  private createSnapshot(
    otherState: 'unknown' | 'loading' | 'missing' | 'error',
  ): SpeechSnapshot {
    const capabilities = Object.fromEntries(
      SUPPORTED_LOCALES.map((locale) => [
        locale,
        Object.freeze({
          state: this.voices.some((voice) => isExactLocalVoice(voice, locale))
            ? 'ready-local'
            : otherState,
        }),
      ]),
    ) as Record<Locale, SpeechCapability>;
    return Object.freeze({
      capabilities: Object.freeze(capabilities),
      voices: Object.freeze(
        this.voices.map((voice) =>
          Object.freeze({
            voiceURI: voice.voiceURI,
            name: voice.name,
            locale: voice.lang,
            localService: voice.localService,
          }),
        ),
      ),
    });
  }

  private publish(next: SpeechSnapshot): void {
    if (sameSnapshot(this.current, next)) return;
    this.current = next;
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        /* A subscriber cannot corrupt provider state. */
      }
    }
  }

  async speak(plan: UtterancePlan): Promise<SpeechOutcome> {
    if (!isCatalogueUtterancePlan(plan)) return { kind: 'error' };
    const safePlan = buildUtterancePlan(plan.kind, plan.locale);
    if (safePlan === null) return { kind: 'error' };
    if (this.disposed || this.backend === null) return { kind: 'unavailable' };
    // Re-read the provider list at the call boundary; cached availability is insufficient.
    this.enumerate();
    const voice = this.voices.find((candidate) =>
      isExactLocalVoice(candidate, safePlan.locale),
    );
    if (voice === undefined)
      return {
        kind:
          this.current.capabilities[safePlan.locale].state === 'error'
            ? 'error'
            : 'unavailable',
      };
    this.cancel();
    const segment = safePlan.segments[0];
    if (segment === undefined) return { kind: 'error' };
    return new Promise<SpeechOutcome>((resolve) => {
      const active: ActiveUtterance = { resolve, cancelWatchdog: () => {} };
      this.active = active;
      active.cancelWatchdog = this.scheduler.schedule(
        this.utteranceTimeoutMs,
        () => {
          if (this.active !== active) return;
          this.finish(active, 'timeout');
          this.cancelBackend();
        },
      );
      try {
        this.backend?.speak({
          text: segment.text,
          locale: segment.locale,
          voice,
          onEnd: () => this.finish(active, 'completed'),
          onError: (cancelled) =>
            this.finish(active, cancelled ? 'cancelled' : 'error'),
        });
      } catch {
        this.finish(active, 'error');
        this.cancelBackend();
      }
    });
  }

  private finish(active: ActiveUtterance, kind: SpeechOutcome['kind']): void {
    if (this.active !== active) return;
    this.active = null;
    active.cancelWatchdog();
    active.resolve({ kind });
  }

  private cancelBackend(): void {
    try {
      this.backend?.cancel();
    } catch {
      /* Visual interaction remains available. */
    }
  }

  cancel(): void {
    if (this.active !== null) this.finish(this.active, 'cancelled');
    this.cancelBackend();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelLoading();
    this.cancelRetry();
    this.cancel();
    try {
      this.unsubscribeVoices();
    } catch {
      /* No provider detail escapes. */
    }
    this.voices = [];
    this.current = this.createSnapshot('missing');
    this.listeners.clear();
  }
}

/** Only the composition root creates this browser provider; no automatic speech. */
export function createBrowserSpeechAdapter(
  options: BrowserSpeechOptions = {},
): BrowserSpeechAdapter {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    !('SpeechSynthesisUtterance' in window)
  )
    return new BrowserSpeechAdapter(null, options);
  const synthesis = window.speechSynthesis;
  const backend: BrowserSpeechBackend = {
    getVoices: () => synthesis.getVoices(),
    subscribeVoicesChanged(listener) {
      synthesis.addEventListener('voiceschanged', listener);
      return () => synthesis.removeEventListener('voiceschanged', listener);
    },
    speak(request) {
      const utterance = new SpeechSynthesisUtterance(request.text);
      utterance.lang = request.locale;
      utterance.voice = request.voice;
      utterance.onend = request.onEnd;
      utterance.onerror = (event) =>
        request.onError(
          event.error === 'canceled' || event.error === 'interrupted',
        );
      synthesis.speak(utterance);
    },
    cancel: () => synthesis.cancel(),
  };
  return new BrowserSpeechAdapter(backend, options);
}
