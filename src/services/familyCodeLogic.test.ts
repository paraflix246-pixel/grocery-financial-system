import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  normalizeFamilyCode,
  parseFamilyInviteInput,
} from '@/src/services/familyCodeLogic';

describe('familyCodeLogic', () => {
  it('normalizes compact codes', () => {
    assert.equal(normalizeFamilyCode('q3hf-dark'), 'Q3HF-DARK');
    assert.equal(normalizeFamilyCode('Q3HFDARK'), 'Q3HF-DARK');
  });

  it('parses a bare family code', () => {
    const result = parseFamilyInviteInput('q3hf-dark');
    assert.ok(result);
    assert.equal(result?.type, 'code');
    if (result?.type === 'code') assert.equal(result.code, 'Q3HF-DARK');
  });

  it('parses invite URL with code query param', () => {
    const result = parseFamilyInviteInput('https://app.example.com/list/join?code=ABCD-1234');
    assert.ok(result);
    assert.equal(result?.type, 'code');
    if (result?.type === 'code') assert.equal(result.code, 'ABCD-1234');
  });

  it('parses JSON snapshot payloads', () => {
    const result = parseFamilyInviteInput(
      JSON.stringify({ listName: 'Test', items: [{ name: 'Milk' }] })
    );
    assert.equal(result?.type, 'snapshot');
  });
});
