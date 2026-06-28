import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildHouseholdInviteMailto,
  isValidInviteEmail,
} from '@/src/services/workspaceInviteService';

describe('workspaceInviteService', () => {
  it('validates invite emails', () => {
    assert.equal(isValidInviteEmail('family@example.com'), true);
    assert.equal(isValidInviteEmail('not-an-email'), false);
  });

  it('builds mailto links with invite details', () => {
    const url = buildHouseholdInviteMailto({
      email: 'family@example.com',
      subject: 'Join us',
      code: 'ABCD-1234',
      inviteUrl: 'https://pennypantry.xyz/invite/ABCD-1234',
      bodyTemplate: 'Code: {{code}}\nLink: {{url}}',
    });
    assert.match(url, /^mailto:/);
    assert.match(decodeURIComponent(url), /family@example.com/);
    assert.match(decodeURIComponent(url), /ABCD-1234/);
    assert.match(decodeURIComponent(url), /pennypantry\.xyz/);
  });
});
