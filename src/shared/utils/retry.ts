export interface RetryOptions {
  delays: number[];
  onRetry?: (attempt: number, error: unknown) => void;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
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
