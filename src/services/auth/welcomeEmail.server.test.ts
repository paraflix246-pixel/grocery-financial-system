import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildWelcomeEmailHtml,
  isWelcomeEmailConfigured,
} from './welcomeEmail.server';

describe('welcomeEmail.server', () => {
  it('buildWelcomeEmailHtml greets by display name when provided', () => {
    const html = buildWelcomeEmailHtml('Alex', 'https://pennypantry.xyz');
    assert.match(html, /Hi Alex,/);
    assert.match(html, /https:\/\/pennypantry\.xyz/);
    assert.match(html, /penny-pantry-logo\.png/);
    assert.match(html, /Open Penny Pantry/);
  });

  it('buildWelcomeEmailHtml uses generic greeting without display name', () => {
    const html = buildWelcomeEmailHtml('', 'https://pennypantry.xyz');
    assert.match(html, /Hi there,/);
  });

  it('isWelcomeEmailConfigured reflects RESEND_API_KEY', () => {
    const original = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = '';
    assert.equal(isWelcomeEmailConfigured(), false);
    process.env.RESEND_API_KEY = 're_test';
    assert.equal(isWelcomeEmailConfigured(), true);
    if (original === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = original;
    }
  });
});
