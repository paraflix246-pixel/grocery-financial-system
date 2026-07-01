import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildSignupVerificationRedirectUrl,
  isEmailConfirmed,
  needsEmailVerificationAfterSignUp,
} from './emailConfirmationLogic';

describe('emailConfirmationLogic', () => {
  it('isEmailConfirmed respects email_confirmed_at and OAuth providers', () => {
    assert.equal(
      isEmailConfirmed({
        email_confirmed_at: '2026-01-01T00:00:00Z',
        identities: [{ provider: 'email' }],
      }),
      true
    );
    assert.equal(
      isEmailConfirmed({
        email_confirmed_at: null,
        identities: [{ provider: 'google' }],
      }),
      true
    );
    assert.equal(
      isEmailConfirmed({
        email_confirmed_at: null,
        identities: [{ provider: 'email' }],
      }),
      false
    );
  });

  it('needsEmailVerificationAfterSignUp is false when session exists', () => {
    assert.equal(
      needsEmailVerificationAfterSignUp({ access_token: 'x' }, { email_confirmed_at: null }),
      false
    );
  });

  it('needsEmailVerificationAfterSignUp is true without session and unconfirmed email', () => {
    assert.equal(
      needsEmailVerificationAfterSignUp(null, {
        email_confirmed_at: null,
        identities: [{ provider: 'email' }],
      }),
      true
    );
  });

  it('buildSignupVerificationRedirectUrl appends signup intent', () => {
    const url = buildSignupVerificationRedirectUrl(
      (path) => `https://pennypantry.xyz${path}`,
      '/auth/callback'
    );
    assert.equal(url, 'https://pennypantry.xyz/auth/callback?intent=signup');
  });
});
