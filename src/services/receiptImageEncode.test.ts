import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { inferImageMimeType, isHeicMime } from '@/src/services/receiptImageEncode';

describe('receiptImageEncode', () => {
  it('infers mime type from extension when file.type is empty', () => {
    assert.equal(inferImageMimeType({ name: 'receipt.jpg', type: '' }), 'image/jpeg');
    assert.equal(inferImageMimeType({ name: 'receipt.JPEG', type: '' }), 'image/jpeg');
    assert.equal(inferImageMimeType({ name: 'scan.png', type: '' }), 'image/png');
    assert.equal(inferImageMimeType({ name: 'photo.webp', type: '' }), 'image/webp');
  });

  it('prefers the browser-provided mime type when present', () => {
    assert.equal(
      inferImageMimeType({ name: 'receipt.jpg', type: 'image/jpeg' }),
      'image/jpeg'
    );
  });

  it('returns null for unsupported extensions', () => {
    assert.equal(inferImageMimeType({ name: 'notes.pdf', type: '' }), null);
    assert.equal(inferImageMimeType({ name: 'photo.gif', type: '' }), null);
  });

  it('detects HEIC mime types', () => {
    assert.equal(isHeicMime('image/heic'), true);
    assert.equal(isHeicMime('image/heif'), true);
    assert.equal(isHeicMime('image/jpeg'), false);
  });
});
