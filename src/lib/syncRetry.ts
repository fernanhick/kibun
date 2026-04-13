/**
 * Fire-and-forget retry wrapper for Supabase operations.
 * Never blocks the caller. Falls back to backfill-on-login for persistent failures.
 */
export function withRetry(
  fn: () => PromiseLike<{ error: any }>,
  label: string,
  maxRetries = 2
): void {
  const delays = [3000, 10000]; // 3s, 10s

  const attempt = (retryCount: number) => {
    fn().then(({ error }) => {
      if (!error) return;
      if (retryCount < maxRetries) {
        setTimeout(() => attempt(retryCount + 1), delays[retryCount] ?? 10000);
      } else if (__DEV__) {
        console.warn(`[kibun:${label}] Failed after ${maxRetries} retries:`, error.message);
      }
    });
  };

  attempt(0);
}
