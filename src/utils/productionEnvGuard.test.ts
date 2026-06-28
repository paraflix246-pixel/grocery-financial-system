import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  isLocalhostServiceUrl,
  resolveProductionSafeUrl,
  resolvePublicServiceUrl,
} from '@/src/utils/productionEnvGuard';

describe('productionEnvGuard', () => {
  const originalEnv = { ...process.env };
  const originalWindow = (globalThis as { window?: Window }).window;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete (globalThis as { window?: Window }).window;
  });

  afterEach(() => {
    process.env = originalEnv;
    (globalThis as { window?: Window }).window = originalWindow;
  });

  it('detects localhost service URLs', () => {
    assert.equal(isLocalhostServiceUrl('http://localhost:8085/api/kroger'), true);
    assert.equal(isLocalhostServiceUrl('https://pennypantry.xyz/api/kroger'), false);
  });

  it('ignores localhost EXPO_PUBLIC values in production builds', () => {
    process.env.NODE_ENV = 'production';
    assert.equal(
      resolveProductionSafeUrl('http://localhost:8081', 'EXPO_PUBLIC_APP_URL'),
      null
    );
    assert.equal(
      resolveProductionSafeUrl('https://pennypantry.xyz', 'EXPO_PUBLIC_APP_URL'),
      'https://pennypantry.xyz'
    );
  });

  it('resolvePublicServiceUrl falls back to same-origin API path on web', () => {
    process.env.NODE_ENV = 'production';
    (globalThis as { window?: Window }).window = {
      location: { origin: 'https://pennypantry.xyz' },
    } as Window;

    assert.equal(
      resolvePublicServiceUrl(
        'http://localhost:8085/api/kroger',
        'EXPO_PUBLIC_KROGER_API_URL',
        '/api/kroger'
      ),
      'https://pennypantry.xyz/api/kroger'
    );
  });

  it('resolvePublicServiceUrl prefers non-localhost configured URL', () => {
    process.env.NODE_ENV = 'production';
    assert.equal(
      resolvePublicServiceUrl(
        'https://api.example.com/kroger',
        'EXPO_PUBLIC_KROGER_API_URL',
        '/api/kroger'
      ),
      'https://api.example.com/kroger'
    );
  });
});
