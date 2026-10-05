import { describe, expect, it } from 'vitest';
import {
  BrowserSpeechAdapter,
  isExactLocalVoice,
  type BackendUtterance,
  type BrowserSpeechBackend,
  type BrowserVoice,
  type SpeechScheduler,
} from '../../src/infrastructure/speech/browserSpeech';
import type { SpeechRequest } from '../../src/presentation/speech/controller';
import {
  buildUtterancePlan,
  type UtterancePlan,
} from '../../src/presentation/speech/plans';
import type { Locale } from '../../src/presentation/localisation/locales';

class FakeScheduler implements SpeechScheduler {
  now = 0;
  readonly jobs = new Map<object, { at: number; callback: () => void }>();
  schedule(delayMs: number, callback: () => void): () => void {
    const key = {};
    this.jobs.set(key, { at: this.now + delayMs, callback });
    return () => {
      this.jobs.delete(key);
    };
  }
  advance(ms: number): void {
    const end = this.now + ms;
    for (;;) {
      const next = [...this.jobs.entries()]
        .filter(([, job]) => job.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (next === undefined) break;
      this.now = next[1].at;
      this.jobs.delete(next[0]);
      next[1].callback();
    }
    this.now = end;
  }
}

class FakeBackend implements BrowserSpeechBackend {
  voices: readonly BrowserVoice[];
  readonly utterances: BackendUtterance[] = [];
  readonly listeners = new Set<() => void>();
  reads = 0;
  cancels = 0;
  failGet = false;
  failSpeak = false;
  failCancel = false;
  constructor(voices: readonly BrowserVoice[] = []) {
    this.voices = voices;
  }
  getVoices(): readonly BrowserVoice[] {
    this.reads += 1;
    if (this.failGet) throw new Error('private provider detail');
    return this.voices;
  }
  subscribeVoicesChanged(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  speak(utterance: BackendUtterance): void {
    if (this.failSpeak) throw new Error('private provider detail');
    this.utterances.push(utterance);
  }
  cancel(): void {
    this.cancels += 1;
    if (this.failCancel) throw new Error('private provider detail');
  }
  voicesChanged(voices: readonly BrowserVoice[]): void {
    this.voices = voices;
    for (const listener of this.listeners) listener();
  }
}

function voice(
  lang = 'en-GB',
  localService = true,
  name = 'Synthetic voice',
  voiceURI = 'synthetic-local',
): BrowserVoice {
  return { lang, localService, name, voiceURI, default: false };
}

function plan(locale: Locale = 'en-GB'): UtterancePlan {
  const result = buildUtterancePlan('numberPrompt', locale);
  if (result === null) throw new Error('test requires a prototype locale');
  return result;
}

function setup(voices: readonly BrowserVoice[] = []) {
  const backend = new FakeBackend(voices);
  const scheduler = new FakeScheduler();
  const adapter = new BrowserSpeechAdapter(backend, {
    scheduler,
    loadingTimeoutMs: 100,
    retryIntervalMs: 20,
    utteranceTimeoutMs: 200,
  });
  return { adapter, backend, scheduler };
}

describe('exact local-only voice eligibility', () => {
  it('rejects remote voices even with an exact requested locale', () => {
    expect(isExactLocalVoice(voice('en-GB', false), 'en-GB')).toBe(false);
    expect(
      isExactLocalVoice({ ...voice('en-GB', false), default: true }, 'en-GB'),
    ).toBe(false);
    expect(isExactLocalVoice(voice('en-GB', true), 'en-GB')).toBe(true);
  });
  it('allows only case differences, never language/region substitutes', () => {
    expect(isExactLocalVoice(voice('EN-gb'), 'en-GB')).toBe(true);
    expect(isExactLocalVoice(voice('en-US'), 'en-GB')).toBe(false);
    expect(isExactLocalVoice(voice('en'), 'en-GB')).toBe(false);
    expect(isExactLocalVoice(voice('pt-BR'), 'pt-PT')).toBe(false);
    expect(isExactLocalVoice(voice('de'), 'de-DE')).toBe(false);
  });
});

describe('bounded speech enumeration', () => {
  it('reads voices immediately and reports exact-local capabilities without offline claims', async () => {
    const { adapter, backend, scheduler } = setup([
      voice(),
      voice('de-DE'),
      voice('el-GR', false),
    ]);
    expect(backend.reads).toBe(1);
    expect(await adapter.capabilities({ locale: 'en-GB' })).toEqual({
      state: 'ready-local',
    });
    expect(await adapter.capabilities({ locale: 'de-DE' })).toEqual({
      state: 'ready-local',
    });
    expect(await adapter.capabilities({ locale: 'el-GR' })).toEqual({
      state: 'missing',
    });
    expect(await adapter.capabilities({ locale: 'pt-PT' })).toEqual({
      state: 'missing',
    });
    expect(JSON.stringify(adapter.snapshot())).not.toContain('tested-offline');
    expect(scheduler.jobs.size).toBe(0);
  });
  it('bounds empty-list loading and stops retries at missing', () => {
    const { adapter, backend, scheduler } = setup();
    expect(adapter.snapshot().capabilities['en-GB']).toEqual({
      state: 'loading',
    });
    scheduler.advance(99);
    expect(adapter.snapshot().capabilities['en-GB']).toEqual({
      state: 'loading',
    });
    scheduler.advance(1);
    expect(adapter.snapshot().capabilities['en-GB']).toEqual({
      state: 'missing',
    });
    expect(scheduler.jobs.size).toBe(0);
    const reads = backend.reads;
    scheduler.advance(1000);
    expect(backend.reads).toBe(reads);
  });
  it('accepts a delayed list during bounded retry without requiring voiceschanged', () => {
    const { adapter, backend, scheduler } = setup();
    backend.voices = [voice()];
    scheduler.advance(20);
    expect(adapter.snapshot().capabilities['en-GB']).toEqual({
      state: 'ready-local',
    });
    expect(scheduler.jobs.size).toBe(0);
  });
  it('responds to later voiceschanged after the loading window closed', () => {
    const { adapter, backend, scheduler } = setup();
    scheduler.advance(100);
    backend.voicesChanged([voice('de-DE')]);
    expect(adapter.snapshot().capabilities['de-DE']).toEqual({
      state: 'ready-local',
    });
    expect(adapter.snapshot().capabilities['en-GB']).toEqual({
      state: 'missing',
    });
  });
  it('permits a deliberate later bounded refresh', () => {
    const { adapter, backend, scheduler } = setup();
    scheduler.advance(100);
    adapter.refresh();
    expect(adapter.snapshot().capabilities['en-GB']).toEqual({
      state: 'loading',
    });
    backend.voices = [voice()];
    scheduler.advance(20);
    expect(adapter.snapshot().capabilities['en-GB']).toEqual({
      state: 'ready-local',
    });
  });
  it('deduplicates the full voice tuple while preserving same-name distinct providers', () => {
    const a = voice();
    const { adapter } = setup([
      a,
      a,
      { ...a },
      voice('de-DE'),
      voice('en-GB', false),
      voice('en-GB', true, a.name, 'different-uri'),
    ]);
    expect(adapter.snapshot().voices).toHaveLength(4);
    expect(
      adapter
        .snapshot()
        .voices.filter((entry) => entry.name === 'Synthetic voice'),
    ).toHaveLength(4);
    expect(Object.isFrozen(adapter.snapshot())).toBe(true);
    expect(Object.isFrozen(adapter.snapshot().capabilities)).toBe(true);
    expect(Object.isFrozen(adapter.snapshot().voices[0])).toBe(true);
  });
  it('publishes only changed immutable snapshots and isolates failing subscribers', () => {
    const { adapter, backend } = setup([voice()]);
    const initial = adapter.snapshot();
    let notifications = 0;
    adapter.subscribe(() => {
      throw new Error('subscriber failure');
    });
    const unsubscribe = adapter.subscribe(() => {
      notifications += 1;
    });
    adapter.refresh();
    expect(adapter.snapshot()).toBe(initial);
    expect(notifications).toBe(0);
    backend.voicesChanged([voice('de-DE')]);
    expect(notifications).toBe(1);
    expect(adapter.snapshot()).not.toBe(initial);
    unsubscribe();
    backend.voicesChanged([]);
    expect(notifications).toBe(1);
  });
  it('exposes stable error outcomes rather than provider error detail', async () => {
    const { adapter, backend, scheduler } = setup([voice()]);
    backend.failGet = true;
    adapter.refresh();
    expect(await adapter.capabilities({ locale: 'en-GB' })).toEqual({
      state: 'error',
    });
    expect(await adapter.speak(plan())).toEqual({ kind: 'error' });
    expect(JSON.stringify(adapter.snapshot())).not.toContain(
      'private provider detail',
    );
    expect(scheduler.jobs.size).toBe(0);
  });
  it('handles a surface without Web Speech as missing visual-only capability', async () => {
    const adapter = new BrowserSpeechAdapter(null);
    expect(await adapter.capabilities({ locale: 'el-GR' })).toEqual({
      state: 'missing',
    });
    expect(await adapter.speak(plan())).toEqual({ kind: 'unavailable' });
    expect(adapter.snapshot().voices).toEqual([]);
  });
  it('validates untrusted request data without accepting aliases or extra fields', async () => {
    const { adapter } = setup([voice()]);
    for (const request of [
      { locale: 'en-US' },
      { locale: 'en' },
      { locale: 'en-GB', childName: 'synthetic-field' },
      null,
      {
        get locale() {
          throw new Error('not data');
        },
      },
    ]) {
      expect(
        await adapter.capabilities(request as unknown as SpeechRequest),
      ).toEqual({ state: 'error' });
    }
  });
});

describe('explicit bounded utterance lifecycle', () => {
  it('passes the exact selected local voice and fixed semantic text, then completes', async () => {
    const chosen = voice('en-GB');
    const { adapter, backend, scheduler } = setup([
      voice('en-US'),
      voice('en-GB', false),
      chosen,
    ]);
    const outcome = adapter.speak(plan());
    expect(backend.utterances).toHaveLength(1);
    expect(backend.utterances[0]?.voice).toBe(chosen);
    expect(backend.utterances[0]?.text).toBe(
      'Three plus two. Choose a number.',
    );
    expect(backend.utterances[0]?.locale).toBe('en-GB');
    backend.utterances[0]?.onEnd();
    expect(await outcome).toEqual({ kind: 'completed' });
    expect(scheduler.jobs.size).toBe(0);
  });
  it('never falls through to a remote or default regional voice', async () => {
    const { adapter, backend } = setup([
      voice('en-GB', false),
      { ...voice('en-US'), default: true },
    ]);
    expect(await adapter.speak(plan())).toEqual({ kind: 'unavailable' });
    expect(backend.utterances).toHaveLength(0);
  });
  it('revalidates provider eligibility at speech time rather than trusting cached ready', async () => {
    const { adapter, backend } = setup([voice()]);
    backend.voices = [voice('en-GB', false)];
    expect(await adapter.speak(plan())).toEqual({ kind: 'unavailable' });
    expect(backend.utterances).toHaveLength(0);
  });
  it('replaces speech and ignores stale end/error callbacks from the cancelled utterance', async () => {
    const { adapter, backend, scheduler } = setup([voice()]);
    const first = adapter.speak(plan());
    const second = adapter.speak(plan());
    expect(await first).toEqual({ kind: 'cancelled' });
    backend.utterances[0]?.onEnd();
    backend.utterances[0]?.onError(false);
    expect(scheduler.jobs.size).toBe(1);
    backend.utterances[1]?.onEnd();
    expect(await second).toEqual({ kind: 'completed' });
    expect(scheduler.jobs.size).toBe(0);
  });
  it('cancels obsolete speech immediately and safely tolerates browser cancellation errors', async () => {
    const { adapter, backend, scheduler } = setup([voice()]);
    const outcome = adapter.speak(plan());
    backend.failCancel = true;
    expect(() => adapter.cancel()).not.toThrow();
    expect(await outcome).toEqual({ kind: 'cancelled' });
    expect(scheduler.jobs.size).toBe(0);
  });
  it('bounds missing browser end/error callbacks with a configurable watchdog', async () => {
    const { adapter, backend, scheduler } = setup([voice()]);
    const outcome = adapter.speak(plan());
    scheduler.advance(199);
    expect(scheduler.jobs.size).toBe(1);
    scheduler.advance(1);
    expect(await outcome).toEqual({ kind: 'timeout' });
    expect(scheduler.jobs.size).toBe(0);
    backend.utterances[0]?.onEnd();
    expect(await outcome).toEqual({ kind: 'timeout' });
    expect(backend.cancels).toBeGreaterThan(0);
  });
  it.each([false, true])(
    'maps browser error cancellation=%s to stable outcomes',
    async (cancelled) => {
      const { adapter, backend, scheduler } = setup([voice()]);
      const outcome = adapter.speak(plan());
      backend.utterances[0]?.onError(cancelled);
      expect(await outcome).toEqual({
        kind: cancelled ? 'cancelled' : 'error',
      });
      expect(scheduler.jobs.size).toBe(0);
    },
  );
  it('handles a throwing speak provider without leaking errors or keeping watchdogs', async () => {
    const { adapter, backend, scheduler } = setup([voice()]);
    backend.failSpeak = true;
    expect(await adapter.speak(plan())).toEqual({ kind: 'error' });
    expect(scheduler.jobs.size).toBe(0);
  });
  it('cancels an active utterance when voiceschanged removes its provider', async () => {
    const { adapter, backend } = setup([voice()]);
    const outcome = adapter.speak(plan());
    backend.voicesChanged([voice('en-GB', false)]);
    expect(await outcome).toEqual({ kind: 'cancelled' });
    expect(adapter.snapshot().capabilities['en-GB']).toEqual({
      state: 'missing',
    });
  });
  it('rejects non-catalogue text and personal fields before touching the browser', async () => {
    const { adapter, backend } = setup([voice()]);
    const reads = backend.reads;
    const candidates: unknown[] = [
      { ...plan(), segments: [{ locale: 'en-GB', text: 'Arbitrary text' }] },
      { ...plan(), learnerId: 'synthetic-extra-field' },
    ];
    for (const candidate of candidates)
      expect(await adapter.speak(candidate as UtterancePlan)).toEqual({
        kind: 'error',
      });
    expect(backend.reads).toBe(reads);
    expect(backend.utterances).toHaveLength(0);
    expect(backend.cancels).toBe(0);
  });
  it('copies catalogue text before provider callbacks can mutate an external plan', async () => {
    const { adapter, backend } = setup([voice()]);
    const external = { ...plan(), segments: [{ ...plan().segments[0] }] };
    adapter.subscribe(() => {
      external.segments[0] = { locale: 'en-GB', text: 'Injected text' };
    });
    backend.voices = [voice('en-GB', true, 'Changed display label')];
    const outcome = adapter.speak(external as UtterancePlan);
    expect(backend.utterances[0]?.text).toBe(
      'Three plus two. Choose a number.',
    );
    backend.utterances[0]?.onEnd();
    expect(await outcome).toEqual({ kind: 'completed' });
  });
  it('disposes listeners, loading and active speech without later resurrection', async () => {
    const { adapter, backend, scheduler } = setup([voice()]);
    const outcome = adapter.speak(plan());
    adapter.dispose();
    expect(await outcome).toEqual({ kind: 'cancelled' });
    expect(backend.listeners.size).toBe(0);
    expect(scheduler.jobs.size).toBe(0);
    expect(await adapter.speak(plan())).toEqual({ kind: 'unavailable' });
    expect(await adapter.capabilities({ locale: 'en-GB' })).toEqual({
      state: 'missing',
    });
    const reads = backend.reads;
    adapter.refresh();
    backend.voicesChanged([voice()]);
    scheduler.advance(1000);
    expect(backend.reads).toBe(reads);
    expect(adapter.snapshot().voices).toEqual([]);
  });
});
