import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  getMissingSupabaseAdminEnvVars,
  isSupabaseAdminConfigured,
} from '@/src/services/stripe/stripeSupabase.server';

describe('getMissingSupabaseAdminEnvVars', () => {
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

  it('reports both required env vars when unset', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.deepEqual(getMissingSupabaseAdminEnvVars(), [
      'EXPO_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ]);
    assert.equal(isSupabaseAdminConfigured(), false);
  });

  it('reports only the service role key when URL is set', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.deepEqual(getMissingSupabaseAdminEnvVars(), ['SUPABASE_SERVICE_ROLE_KEY']);
    assert.equal(isSupabaseAdminConfigured(), false);
  });

  it('returns configured when both env vars are set', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_test';
    assert.deepEqual(getMissingSupabaseAdminEnvVars(), []);
    assert.equal(isSupabaseAdminConfigured(), true);
  });
});
