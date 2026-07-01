import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  extractAuthProviders,
  isOAuthOnlyAccount,
  primaryOAuthProvider,
} from './authIdentityLogic';

describe('forgotPassword.server', () => {
  it('detects Google-only accounts', () => {
    const providers = ['google'];
    assert.equal(isOAuthOnlyAccount(providers), true);
    assert.equal(primaryOAuthProvider(providers), 'google');
  });

  it('detects Apple-only accounts', () => {
    const providers = ['apple'];
    assert.equal(isOAuthOnlyAccount(providers), true);
    assert.equal(primaryOAuthProvider(providers), 'apple');
  });

  it('allows reset when email/password identity exists', () => {
    assert.equal(isOAuthOnlyAccount(['google', 'email']), false);
    assert.equal(isOAuthOnlyAccount(['email']), false);
  });

  it('merges identities and app_metadata providers', () => {
    const providers = extractAuthProviders({
      id: 'u1',
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: {},
      aud: 'authenticated',
      created_at: '',
      identities: [{ provider: 'google', identity_id: '1', id: '1', user_id: 'u1', identity_data: {}, last_sign_in_at: '', created_at: '', updated_at: '' }],
    });
    assert.deepEqual(providers, ['google']);
    assert.equal(isOAuthOnlyAccount(providers), true);
  });
});
