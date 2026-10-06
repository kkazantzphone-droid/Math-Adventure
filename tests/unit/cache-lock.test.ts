import { describe, expect, it, vi } from 'vitest';
import { withNativeCacheLock } from '../../src/infrastructure/offline/cache-lock';

describe('native release cache lifetime coordination', () => {
  it('uses the exact release name and exclusive native lock without retaining a timer', async () => {
    const operation = vi.fn(() => Promise.resolve('synthetic-result'));
    const request = vi.fn(
      (_name: string, _options: LockOptions, work: () => Promise<string>) =>
        work(),
    );
    const locks = { request } as unknown as LockManager;
    expect(
      await withNativeCacheLock(locks, 'synthetic-release-cache', operation),
    ).toBe('synthetic-result');
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0]?.[0]).toBe('synthetic-release-cache');
    expect(request.mock.calls[0]?.[1].mode).toBe('exclusive');
    expect(request.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);
    expect(request.mock.calls[0]?.[2]).toBe(operation);
  });

  it('fails closed without native coordination rather than running an unsafe fallback', async () => {
    const operation = vi.fn(() => Promise.resolve('unsafe'));
    await expect(
      withNativeCacheLock(undefined, 'synthetic-release-cache', operation),
    ).rejects.toThrow('SHELL_CACHE_LOCK_UNAVAILABLE');
    expect(operation).not.toHaveBeenCalled();
  });

  it('aborts a blocked native lock request at 1500 milliseconds without entering its operation', async () => {
    vi.useFakeTimers();
    try {
      const operation = vi.fn(() => Promise.resolve('unsafe'));
      const locks = {
        request(_name: string, options: LockOptions) {
          return new Promise<string>((_resolve, reject) => {
            options.signal?.addEventListener(
              'abort',
              () => reject(new Error('SYNTHETIC_ABORT')),
              { once: true },
            );
          });
        },
      } as unknown as LockManager;
      const result = withNativeCacheLock(
        locks,
        'synthetic-release-cache',
        operation,
      );
      const rejected = expect(result).rejects.toThrow('SYNTHETIC_ABORT');
      await vi.advanceTimersByTimeAsync(1500);
      await rejected;
      expect(operation).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
