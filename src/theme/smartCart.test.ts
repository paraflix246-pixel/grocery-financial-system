import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatHomeGreeting, getGreetingFirstName } from './smartCart';

describe('formatHomeGreeting', () => {
  it('uses first name when display name is set', () => {
    assert.equal(getGreetingFirstName('Sarah Jones'), 'Sarah');
    const greeting = formatHomeGreeting('Sarah Jones');
    assert.match(greeting, /^Good (morning|afternoon|evening), Sarah$/);
  });

  it('omits name when display name is empty', () => {
    assert.equal(getGreetingFirstName(''), '');
    assert.equal(getGreetingFirstName('   '), '');
    const greeting = formatHomeGreeting('');
    assert.match(greeting, /^Good (morning|afternoon|evening)$/);
    assert.doesNotMatch(greeting, /,/);
  });
});
