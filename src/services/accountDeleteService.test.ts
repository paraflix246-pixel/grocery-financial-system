import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DELETE_CONFIRMATION_TOKEN,
  LOCAL_PREF_KEYS,
  filterDynamicLocalKeys,
  isDeleteConfirmationValid,
  resolveAccountApiUrl,
} from './accountDeleteLogic';

describe('accountDeleteLogic', () => {
  it('validates DELETE confirmation token case-insensitively', () => {
    assert.equal(isDeleteConfirmationValid(DELETE_CONFIRMATION_TOKEN), true);
    assert.equal(isDeleteConfirmationValid('delete'), true);
    assert.equal(isDeleteConfirmationValid(' Delete '), true);
    assert.equal(isDeleteConfirmationValid('REMOVE'), false);
    assert.equal(isDeleteConfirmationValid(''), false);
  });

  it('includes core local preference keys', () => {
    assert.ok(LOCAL_PREF_KEYS.includes('@smartcart_subscription'));
    assert.ok(LOCAL_PREF_KEYS.includes('@smartcart_auth_user_v1'));
    assert.ok(LOCAL_PREF_KEYS.includes('grocery_onboarding_complete'));
  });

  it('resolves account API URL from EXPO_PUBLIC_APP_URL', () => {
    assert.equal(
      resolveAccountApiUrl('/api/account/delete', { appUrl: 'https://pennypantry.xyz' }),
      'https://pennypantry.xyz/api/account/delete'
    );
    assert.equal(
      resolveAccountApiUrl('/api/account/delete', { webOrigin: 'https://pennypantry.xyz' }),
      'https://pennypantry.xyz/api/account/delete'
    );
  });

  it('filters dynamic list-related AsyncStorage keys', () => {
    const keys = [
      '@smartcart_list_checked_abc',
      '@smartcart_subscription',
      'other-key',
      '@smartcart_buy_again_hidden_xyz',
    ];
    assert.deepEqual(filterDynamicLocalKeys(keys), [
      '@smartcart_list_checked_abc',
      '@smartcart_buy_again_hidden_xyz',
    ]);
  });
});
