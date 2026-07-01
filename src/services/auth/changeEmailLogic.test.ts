import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildEmailChangeRedirectUrl,
  getOAuthOnlyChangeEmailBlock,
  mapChangeEmailSupabaseError,
} from './changeEmailLogic';

describe('changeEmailLogic', () => {
  it('buildEmailChangeRedirectUrl uses auth callback with email-change intent', () => {
    const url = buildEmailChangeRedirectUrl(
      (path) => `https://pennypantry.xyz${path}`,
      '/auth/callback'
    );
    assert.equal(url, 'https://pennypantry.xyz/auth/callback?intent=email-change');
  });

  it('mapChangeEmailSupabaseError detects email already in use', () => {
    assert.equal(
      mapChangeEmailSupabaseError({
        message: 'A user with this email address has already been registered',
      }),
      'email_in_use'
    );
    assert.equal(mapChangeEmailSupabaseError({ code: 'email_exists' }), 'email_in_use');
  });

  it('mapChangeEmailSupabaseError detects rate limits and invalid email', () => {
    assert.equal(
      mapChangeEmailSupabaseError({
        message: 'For security purposes, you can only request this once every 60 seconds',
      }),
      'rate_limited'
    );
    assert.equal(
      mapChangeEmailSupabaseError({ message: 'Unable to validate email address: invalid format' }),
      'invalid_email'
    );
  });

  it('getOAuthOnlyChangeEmailBlock flags Google-only accounts', () => {
    const result = getOAuthOnlyChangeEmailBlock({
      identities: [{ provider: 'google' }],
      app_metadata: { provider: 'google', providers: ['google'] },
    });
    assert.equal(result.blocked, true);
    if (result.blocked) {
      assert.equal(result.provider, 'google');
    }
  });

  it('getOAuthOnlyChangeEmailBlock allows email/password accounts', () => {
    const result = getOAuthOnlyChangeEmailBlock({
      identities: [{ provider: 'google' }, { provider: 'email' }],
    });
    assert.equal(result.blocked, false);
  });
});
