import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildChurnRiskList,
  buildLastSeenBackfillUpdates,
  computeActivityScoreFromSignals,
  computeChurnDaysInactive,
  computeExclusiveTierCounts,
  isChurnRiskCandidate,
  rankTopUsers,
  resolveEffectiveLastSeenAt,
  type ProfileActivityRow,
} from '@/src/services/admin/adminAnalyticsLogic';

const NOW = new Date('2026-07-01T12:00:00.000Z').getTime();
const DAYS = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

describe('resolveEffectiveLastSeenAt', () => {
  it('prefers the most recent activity signal', () => {
    assert.equal(
      resolveEffectiveLastSeenAt({
        lastSeenAt: DAYS(10),
        lastSignInAt: DAYS(2),
        latestAuditAt: DAYS(5),
      }),
      DAYS(2)
    );
  });

  it('falls back to auth sign-in when profile last_seen is missing', () => {
    assert.equal(
      resolveEffectiveLastSeenAt({
        lastSeenAt: null,
        lastSignInAt: DAYS(3),
      }),
      DAYS(3)
    );
  });

  it('returns null when no activity exists', () => {
    assert.equal(resolveEffectiveLastSeenAt({ lastSeenAt: null }), null);
  });
});

describe('computeActivityScoreFromSignals', () => {
  it('scores recent activity higher than stale or missing activity', () => {
    const active = computeActivityScoreFromSignals(
      { lastSeenAt: DAYS(1), subscriptionStatus: null },
      NOW
    );
    const stale = computeActivityScoreFromSignals(
      { lastSeenAt: DAYS(40), subscriptionStatus: null },
      NOW
    );
    const missing = computeActivityScoreFromSignals(
      { lastSeenAt: null, lastSignInAt: null, subscriptionStatus: null },
      NOW
    );

    assert.ok(active > stale);
    assert.equal(missing, 0);
    assert.equal(active, 97);
  });

  it('adds subscription bonus', () => {
    const withSub = computeActivityScoreFromSignals(
      { lastSeenAt: DAYS(10), subscriptionStatus: 'active' },
      NOW
    );
    const withoutSub = computeActivityScoreFromSignals(
      { lastSeenAt: DAYS(10), subscriptionStatus: null },
      NOW
    );
    assert.equal(withSub - withoutSub, 15);
  });
});

describe('isChurnRiskCandidate', () => {
  it('flags users inactive for 30+ days', () => {
    assert.equal(
      isChurnRiskCandidate({
        effectiveLastSeen: DAYS(45),
        createdAt: DAYS(120),
        isBanned: false,
        nowMs: NOW,
      }),
      true
    );
  });

  it('does not flag new accounts that have never opened the app', () => {
    assert.equal(
      isChurnRiskCandidate({
        effectiveLastSeen: null,
        createdAt: DAYS(5),
        isBanned: false,
        nowMs: NOW,
      }),
      false
    );
  });

  it('flags never-seen accounts older than the inactive threshold', () => {
    assert.equal(
      isChurnRiskCandidate({
        effectiveLastSeen: null,
        createdAt: DAYS(60),
        isBanned: false,
        nowMs: NOW,
      }),
      true
    );
  });
});

describe('computeChurnDaysInactive', () => {
  it('uses account age when no activity exists', () => {
    assert.equal(computeChurnDaysInactive(null, DAYS(45), NOW), 45);
  });

  it('uses effective last seen when available', () => {
    assert.equal(computeChurnDaysInactive(DAYS(12), DAYS(90), NOW), 12);
  });
});

describe('rankTopUsers', () => {
  const profiles: ProfileActivityRow[] = [
    {
      id: 'active',
      email: 'active@example.com',
      plan_type: null,
      subscription_status: null,
      last_seen_at: DAYS(1),
      created_at: DAYS(100),
    },
    {
      id: 'stale',
      email: 'stale@example.com',
      plan_type: null,
      subscription_status: null,
      last_seen_at: null,
      created_at: DAYS(100),
    },
    {
      id: 'signin-only',
      email: 'signin@example.com',
      plan_type: null,
      subscription_status: null,
      last_seen_at: null,
      created_at: DAYS(100),
    },
  ];

  it('ranks by activity score using auth sign-in fallback', () => {
    const signInByUserId = new Map<string, string | null>([
      ['stale', null],
      ['signin-only', DAYS(2)],
    ]);
    const ranked = rankTopUsers(profiles, signInByUserId, new Map(), 10, NOW);

    assert.equal(ranked[0]?.id, 'active');
    assert.equal(ranked[1]?.id, 'signin-only');
    assert.equal(ranked[2]?.id, 'stale');
    assert.ok((ranked[1]?.activityScore ?? 0) > 0);
    assert.equal(ranked[1]?.lastSeenAt, DAYS(2));
  });
});

describe('buildChurnRiskList', () => {
  it('excludes recent never-seen signups and includes stale users', () => {
    const profiles: ProfileActivityRow[] = [
      {
        id: 'new-signup',
        email: 'new@example.com',
        plan_type: null,
        subscription_status: null,
        last_seen_at: null,
        created_at: DAYS(3),
      },
      {
        id: 'stale-user',
        email: 'stale@example.com',
        plan_type: null,
        subscription_status: null,
        last_seen_at: DAYS(50),
        created_at: DAYS(120),
      },
    ];

    const churn = buildChurnRiskList(profiles, new Map(), new Map(), { nowMs: NOW });
    assert.equal(churn.length, 1);
    assert.equal(churn[0]?.id, 'stale-user');
    assert.equal(churn[0]?.lastSeenAt, DAYS(50));
  });
});

describe('computeExclusiveTierCounts', () => {
  it('counts pro, family-only, and free users without double-counting free family owners', () => {
    const counts = computeExclusiveTierCounts(
      [
        { id: 'pro', subscription_status: 'active' },
        { id: 'family', subscription_status: null },
        { id: 'free', subscription_status: null },
      ],
      new Set(['family'])
    );

    assert.deepEqual(counts, { tierPro: 1, tierFamily: 1, tierFree: 1 });
  });
});

describe('buildLastSeenBackfillUpdates', () => {
  it('creates updates only for profiles missing last_seen with known auth activity', () => {
    const updates = buildLastSeenBackfillUpdates({
      profiles: [
        { id: 'a', last_seen_at: null },
        { id: 'b', last_seen_at: DAYS(1) },
        { id: 'c', last_seen_at: null },
      ],
      signInByUserId: new Map([
        ['a', DAYS(4)],
        ['c', null],
      ]),
      auditByUserId: new Map([['c', DAYS(2)]]),
    });

    assert.deepEqual(updates, [
      { id: 'a', last_seen_at: DAYS(4) },
      { id: 'c', last_seen_at: DAYS(2) },
    ]);
  });
});
