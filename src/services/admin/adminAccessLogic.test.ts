import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyAdminAccessError,
  formatAdminUnavailableMessage,
} from '@/src/services/admin/adminAccessLogic';

describe('classifyAdminAccessError', () => {
  it('maps 401 to unauthorized', () => {
    const err = new Error('Sign in required.') as Error & { status?: number };
    err.status = 401;
    assert.deepEqual(classifyAdminAccessError(err), {
      status: 'unauthorized',
      message: 'Sign in with an admin account to continue.',
    });
  });

  it('maps sign-in message without status to unauthorized', () => {
    assert.deepEqual(classifyAdminAccessError(new Error('Sign in required.')), {
      status: 'unauthorized',
      message: 'Sign in with an admin account to continue.',
    });
  });

  it('maps 403 to forbidden', () => {
    const err = new Error('Admin access required.') as Error & { status?: number };
    err.status = 403;
    assert.deepEqual(classifyAdminAccessError(err), {
      status: 'forbidden',
      message: 'You do not have permission to access the admin dashboard.',
    });
  });

  it('maps 503 with missingEnv to unavailable (not configured)', () => {
    const err = new Error('Admin system is not configured on the server.') as Error & {
      status?: number;
      missingEnv?: string[];
      hint?: string;
    };
    err.status = 503;
    err.missingEnv = ['SUPABASE_SERVICE_ROLE_KEY'];
    err.hint = 'Add SUPABASE_SERVICE_ROLE_KEY in Vercel.';

    const result = classifyAdminAccessError(err);
    assert.equal(result.status, 'unavailable');
    assert.match(result.message ?? '', /SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('maps 503 without missingEnv to server_error (not mislabeled as not configured)', () => {
    const err = new Error(
      'Admin profiles database is not ready. Apply supabase/migrations/007_admin_profiles.sql.'
    ) as Error & { status?: number };
    err.status = 503;

    const result = classifyAdminAccessError(err);
    assert.equal(result.status, 'server_error');
    assert.match(result.message ?? '', /007_admin_profiles/);
  });

  it('maps client-side missing API URL to unavailable', () => {
    const err = new Error(
      'Admin API is only available when the app server is configured. Use npx expo start --web locally or deploy to Vercel.'
    ) as Error & { status?: number };
    err.status = 503;

    assert.equal(classifyAdminAccessError(err).status, 'unavailable');
  });
});

describe('formatAdminUnavailableMessage', () => {
  it('includes missing env names when present', () => {
    const err = {
      message: 'Admin system is not configured on the server.',
      missingEnv: ['SUPABASE_SERVICE_ROLE_KEY'],
      hint: 'Restart after setting env.',
    } as Error & { missingEnv?: string[]; hint?: string };

    assert.match(formatAdminUnavailableMessage(err), /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(formatAdminUnavailableMessage(err), /Restart after setting env/);
  });
});
