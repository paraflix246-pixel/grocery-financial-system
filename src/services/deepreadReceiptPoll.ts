import { DEEPREAD_REQUEST_TIMEOUT_MS } from '@/src/services/deepreadReceiptMapper';

/** First status check runs immediately; subsequent waits use backoff. */
export const DEEPREAD_POLL_INITIAL_MS = 1_000;
export const DEEPREAD_POLL_MAX_MS = 10_000;
export const DEEPREAD_POLL_BACKOFF = 1.4;

export function nextDeepReadPollDelayMs(currentDelayMs: number): number {
  return Math.min(
    Math.round(currentDelayMs * DEEPREAD_POLL_BACKOFF),
    DEEPREAD_POLL_MAX_MS
  );
}

export type DeepReadPollOptions<T> = {
  fetchStatus: () => Promise<T | null>;
  isTerminal: (result: T) => boolean;
  timeoutMs?: number;
  initialDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Poll DeepRead job status with fast initial checks and capped exponential backoff. */
export async function pollWithBackoff<T>(
  options: DeepReadPollOptions<T>
): Promise<T> {
  const {
    fetchStatus,
    isTerminal,
    timeoutMs = DEEPREAD_REQUEST_TIMEOUT_MS,
    initialDelayMs = DEEPREAD_POLL_INITIAL_MS,
    sleep = defaultSleep,
  } = options;

  const started = Date.now();
  let delayMs = initialDelayMs;

  while (Date.now() - started < timeoutMs) {
    const result = await fetchStatus();
    if (result != null && isTerminal(result)) {
      return result;
    }

    await sleep(delayMs);
    delayMs = nextDeepReadPollDelayMs(delayMs);
  }

  throw new Error('DeepRead scan timed out. Try again with a clearer, flatter photo.');
}
