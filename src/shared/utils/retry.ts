export interface RetryOptions {
  /**
   * Milliseconds to wait before each successive attempt.
   * The length of this array determines the number of retries.
   *
   * Example: [2000, 3000] → 3 total attempts
   *   Attempt 1 — immediate
   *   Attempt 2 — after 2 s
   *   Attempt 3 — after 3 s  → stop
   */
  delays: number[];
  onRetry?: (attempt: number, error: unknown) => void;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls `fn` up to `delays.length + 1` times.
 * Waits `delays[i]` ms before the (i+1)-th retry.
 * Re-throws the last error if all attempts fail.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { delays, onRetry } = options;
  const maxAttempts = delays.length + 1;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt) break;

      const delayMs = delays[attempt - 1];
      onRetry?.(attempt, err);
      await sleep(delayMs);
    }
  }

  throw lastError;
}
