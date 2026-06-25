import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEEPREAD_POLL_INITIAL_MS,
  DEEPREAD_POLL_MAX_MS,
  nextDeepReadPollDelayMs,
  pollWithBackoff,
} from '@/src/services/deepreadReceiptPoll';

describe('nextDeepReadPollDelayMs', () => {
  it('backs off and caps at the max interval', () => {
    assert.equal(nextDeepReadPollDelayMs(DEEPREAD_POLL_INITIAL_MS), 1400);
    assert.equal(nextDeepReadPollDelayMs(8000), DEEPREAD_POLL_MAX_MS);
    assert.equal(nextDeepReadPollDelayMs(DEEPREAD_POLL_MAX_MS), DEEPREAD_POLL_MAX_MS);
  });
});

describe('pollWithBackoff', () => {
  it('returns immediately when the first fetch is terminal', async () => {
    let polls = 0;
    const result = await pollWithBackoff({
      fetchStatus: async () => {
        polls += 1;
        return { status: 'completed' };
      },
      isTerminal: (job) => job.status === 'completed',
      sleep: async () => {
        throw new Error('should not sleep before a terminal result');
      },
    });

    assert.equal(result.status, 'completed');
    assert.equal(polls, 1);
  });

  it('polls until a terminal status and uses backoff between attempts', async () => {
    const sleeps: number[] = [];
    let polls = 0;

    const result = await pollWithBackoff({
      fetchStatus: async () => {
        polls += 1;
        return polls < 3 ? { status: 'processing' } : { status: 'completed' };
      },
      isTerminal: (job) => job.status === 'completed',
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    assert.equal(result.status, 'completed');
    assert.equal(polls, 3);
    assert.deepEqual(sleeps, [DEEPREAD_POLL_INITIAL_MS, 1400]);
  });
});
