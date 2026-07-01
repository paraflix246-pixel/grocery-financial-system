import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { adminNotConfiguredResponse } from '@/src/services/admin/admin.server';

describe('adminNotConfiguredResponse', () => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    } else {
      process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    }
    if (originalServiceRole === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
    }
  });

  it('returns missing env names and setup hint in the 503 payload', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = adminNotConfiguredResponse();
    assert.equal(response.status, 503);

    const payload = (await response.json()) as {
      error?: string;
      missingEnv?: string[];
      hint?: string;
    };

    assert.equal(payload.error, 'Admin system is not configured on the server.');
    assert.deepEqual(payload.missingEnv, ['SUPABASE_SERVICE_ROLE_KEY']);
    assert.match(payload.hint ?? '', /SUPABASE_SERVICE_ROLE_KEY/);
  });
});
