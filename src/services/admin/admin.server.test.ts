import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import type { User } from '@supabase/supabase-js';

import { resolveAuthUserEmail, resolveProfileRole } from '@/src/services/admin/admin.server';

describe('resolveProfileRole', () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  afterEach(() => {
    if (originalAdminEmails === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    }
  });

  it('promotes configured admin emails', () => {
    process.env.ADMIN_EMAILS = 'pennypantry02@gmail.com,other@example.com';
    assert.equal(resolveProfileRole('pennypantry02@gmail.com'), 'admin');
    assert.equal(resolveProfileRole('  Pennypantry02@Gmail.com '), 'admin');
    assert.equal(resolveProfileRole('other@example.com'), 'admin');
  });

  it('returns user for unknown or missing emails', () => {
    process.env.ADMIN_EMAILS = 'pennypantry02@gmail.com';
    assert.equal(resolveProfileRole('guest@example.com'), 'user');
    assert.equal(resolveProfileRole(null), 'user');
    assert.equal(resolveProfileRole(undefined), 'user');
  });
});

describe('resolveAuthUserEmail', () => {
  it('prefers auth email and falls back to user metadata', () => {
    const withDirectEmail = { email: 'Admin@Example.com' } as User;
    assert.equal(resolveAuthUserEmail(withDirectEmail), 'admin@example.com');

    const withMetadataEmail = {
      email: null,
      user_metadata: { email: 'Meta@Example.com' },
    } as User;
    assert.equal(resolveAuthUserEmail(withMetadataEmail), 'meta@example.com');
  });

  it('falls back to OAuth identity email when auth email is missing', () => {
    const googleUser = {
      email: null,
      user_metadata: {},
      identities: [
        {
          provider: 'google',
          identity_data: { email: 'Pennypantry02@Gmail.com' },
        },
      ],
    } as User;
    assert.equal(resolveAuthUserEmail(googleUser), 'pennypantry02@gmail.com');
  });

  it('promotes pennypantry02 regardless of email casing', () => {
    process.env.ADMIN_EMAILS = 'pennypantry02@gmail.com';
    assert.equal(resolveProfileRole('Pennypantry02@Gmail.com'), 'admin');
    const googleUser = {
      email: null,
      identities: [{ provider: 'google', identity_data: { email: 'PENNYPANTRY02@gmail.com' } }],
    } as User;
    assert.equal(resolveProfileRole(resolveAuthUserEmail(googleUser)), 'admin');
  });
});
