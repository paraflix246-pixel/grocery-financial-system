import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildEmailChangedAlertHtml,
  buildPasswordChangedEmailHtml,
} from './emailBranding';
import { isResendConfigured } from './resendEmail.server';
import {
  buildPasswordChangedEmailHtmlForApp,
  isUserEmailConfirmed,
} from './transactionalEmail.server';

describe('transactionalEmail.server', () => {
  it('buildPasswordChangedEmailHtml includes security messaging', () => {
    const html = buildPasswordChangedEmailHtml('https://pennypantry.xyz');
    assert.match(html, /password was updated/i);
    assert.match(html, /If you did not make this change/);
    assert.match(html, /penny-pantry-logo\.png/);
  });

  it('buildEmailChangedAlertHtml shows old and new addresses', () => {
    const html = buildEmailChangedAlertHtml(
      'old@example.com',
      'new@example.com',
      'https://pennypantry.xyz'
    );
    assert.match(html, /old@example\.com/);
    assert.match(html, /new@example\.com/);
    assert.match(html, /Your email was changed/);
  });

  it('buildPasswordChangedEmailHtmlForApp uses default app URL', () => {
    const html = buildPasswordChangedEmailHtmlForApp();
    assert.match(html, /pennypantry\.xyz/);
  });

  it('isUserEmailConfirmed respects email_confirmed_at and OAuth providers', () => {
    assert.equal(
      isUserEmailConfirmed({
        email: 'a@b.com',
        email_confirmed_at: '2026-01-01T00:00:00Z',
        identities: [{ provider: 'email' }],
      } as never),
      true
    );
    assert.equal(
      isUserEmailConfirmed({
        email: 'a@b.com',
        email_confirmed_at: null,
        identities: [{ provider: 'google' }],
      } as never),
      true
    );
    assert.equal(
      isUserEmailConfirmed({
        email: 'a@b.com',
        email_confirmed_at: null,
        identities: [{ provider: 'email' }],
      } as never),
      false
    );
  });

  it('isResendConfigured reflects RESEND_API_KEY', () => {
    const original = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = '';
    assert.equal(isResendConfigured(), false);
    process.env.RESEND_API_KEY = 're_test';
    assert.equal(isResendConfigured(), true);
    if (original === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = original;
    }
  });
});
