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
});
