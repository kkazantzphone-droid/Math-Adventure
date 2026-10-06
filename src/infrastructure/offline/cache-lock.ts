/** Native origin coordination only; no record, token or learner data is stored. */
export async function withNativeCacheLock<T>(
  locks: LockManager | undefined,
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (locks === undefined) throw new Error('SHELL_CACHE_LOCK_UNAVAILABLE');
  const cancellation = new AbortController();
  const timer = globalThis.setTimeout(() => cancellation.abort(), 1_500);
  try {
    return await locks.request(
      name,
      { mode: 'exclusive', signal: cancellation.signal },
      operation,
    );
  } finally {
    globalThis.clearTimeout(timer);
  }
}
