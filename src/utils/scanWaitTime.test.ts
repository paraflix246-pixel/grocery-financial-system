import { describe, it } from 'node:test';

import assert from 'node:assert/strict';



import {

  formatScanElapsed,

  getDeepReadScanWaitMessages,

} from '@/src/utils/scanWaitTime';



describe('formatScanElapsed', () => {

  it('formats seconds under a minute', () => {

    assert.equal(formatScanElapsed(0), '0s');

    assert.equal(formatScanElapsed(42), '42s');

  });



  it('formats minutes and seconds', () => {

    assert.equal(formatScanElapsed(60), '1m');

    assert.equal(formatScanElapsed(90), '1m 30s');

  });

});



describe('getDeepReadScanWaitMessages', () => {

  it('shows stage label before elapsed time starts', () => {

    const messages = getDeepReadScanWaitMessages(0, 'uploading');

    assert.equal(messages.label, 'Uploading…');

    assert.match(messages.hint, /Usually 20–60 seconds/);

  });



  it('includes elapsed time in the label', () => {

    const messages = getDeepReadScanWaitMessages(22, 'reading');

    assert.match(messages.label, /Reading receipt…/);

    assert.match(messages.label, /22s/);

    assert.match(messages.hint, /Usually 20–60 seconds/);

  });



  it('switches to long-wait copy after typical max', () => {

    const messages = getDeepReadScanWaitMessages(80, 'reading');

    assert.match(messages.label, /Reading receipt…/);

    assert.match(messages.hint, /Long receipts/);

  });



  it('shows refining stage label', () => {
    const messages = getDeepReadScanWaitMessages(5, 'refining');
    assert.equal(messages.label, 'Refining with AI… 5s');
  });

  it('mentions DeepRead processing after two minutes', () => {

    const messages = getDeepReadScanWaitMessages(130, 'extracting');

    assert.match(messages.label, /Still working/);

    assert.match(messages.hint, /up to 3 minutes/);

  });

});


