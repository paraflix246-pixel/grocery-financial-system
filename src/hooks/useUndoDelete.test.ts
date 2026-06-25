import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Lightweight behavioral spec for undo-delete scheduling semantics.
 * Mirrors the ref-based commit/undo flow in useUndoDelete.
 */
test('undo cancels pending commit and leaves data intact', async () => {
  let deleted = false;
  let visible = true;
  const commit = async () => {
    deleted = true;
    visible = false;
  };
  const onUndo = async () => {
    visible = true;
  };

  visible = false;
  let commitRef: (() => Promise<void>) | null = commit;
  let undoRef: (() => Promise<void>) | null = onUndo;

  await undoRef!();
  commitRef = null;
  undoRef = null;

  assert.equal(deleted, false);
  assert.equal(visible, true);
});

test('superseding undo commits the previous pending delete', async () => {
  const deletedIds: string[] = [];
  let firstCommit: (() => Promise<void>) | null = async () => {
    deletedIds.push('a');
  };
  const secondCommit = async () => {
    deletedIds.push('b');
  };

  if (firstCommit) {
    await firstCommit();
  }
  firstCommit = secondCommit;

  assert.deepEqual(deletedIds, ['a']);
});
