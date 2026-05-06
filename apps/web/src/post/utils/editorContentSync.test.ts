import { describe, it, expect } from 'vitest';
import { decideEditorContentSync } from './editorContentSync';

const EMPTY_DOC = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });

describe('decideEditorContentSync', () => {
  it('skips when no target signal at all', () => {
    expect(
      decideEditorContentSync({
        currentSanitizedHtml: '<p>x</p>',
        currentJsonStr: '{}',
        targetHtml: undefined,
        targetJsonStr: undefined,
        isFocused: false,
        lastSyncedSignature: null,
      }),
    ).toEqual({ kind: 'skip' });
  });

  it('skips when target signature equals last-synced signature (prevents blur from overwriting in-flight edits)', () => {
    expect(
      decideEditorContentSync({
        currentSanitizedHtml: '<p>Dx</p>', // user typed 'x', debounce pending
        currentJsonStr: '{}',
        targetHtml: '<p>D</p>', // parent state is still lagging
        targetJsonStr: undefined,
        isFocused: false, // just blurred
        lastSyncedSignature: '<p>D</p>',
      }),
    ).toEqual({ kind: 'skip' });
  });

  it('records-only when current sanitized HTML already matches target (avoids re-sync after onChange catches up)', () => {
    expect(
      decideEditorContentSync({
        currentSanitizedHtml: '<p>same</p>',
        currentJsonStr: '{}',
        targetHtml: '<p>same</p>',
        targetJsonStr: undefined,
        isFocused: false,
        lastSyncedSignature: 'older',
      }),
    ).toEqual({ kind: 'recordOnly', signature: '<p>same</p>' });
  });

  it('records-only when target JSON matches current JSON (image-class sanitization case)', () => {
    const sameJson = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(
      decideEditorContentSync({
        currentSanitizedHtml: '<p></p>',
        currentJsonStr: sameJson,
        targetHtml: undefined,
        targetJsonStr: sameJson,
        isFocused: false,
        lastSyncedSignature: null,
      }),
    ).toEqual({ kind: 'recordOnly', signature: sameJson });
  });

  it('skips while focused even when an external target arrives (retried later via blur)', () => {
    expect(
      decideEditorContentSync({
        currentSanitizedHtml: '<p>old</p>',
        currentJsonStr: '{}',
        targetHtml: '<p>new</p>',
        targetJsonStr: undefined,
        isFocused: true,
        lastSyncedSignature: null,
      }),
    ).toEqual({ kind: 'skip' });
  });

  it('syncs when not focused and external target differs from current', () => {
    expect(
      decideEditorContentSync({
        currentSanitizedHtml: '<p></p>',
        currentJsonStr: EMPTY_DOC,
        targetHtml: '<p>loaded draft body</p>',
        targetJsonStr: undefined,
        isFocused: false,
        lastSyncedSignature: null,
      }),
    ).toEqual({ kind: 'sync', signature: '<p>loaded draft body</p>' });
  });

  it('syncs to empty target so switching to a title-only draft clears stale body', () => {
    expect(
      decideEditorContentSync({
        currentSanitizedHtml: '<p>previous draft body</p>',
        currentJsonStr: '{}',
        targetHtml: '',
        targetJsonStr: undefined,
        isFocused: false,
        lastSyncedSignature: '<p>previous draft body</p>',
      }),
    ).toEqual({ kind: 'sync', signature: '' });
  });

  it('prefers JSON signature over HTML when both targets are provided', () => {
    const targetJson = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(
      decideEditorContentSync({
        currentSanitizedHtml: '<p>html-mismatch</p>',
        currentJsonStr: JSON.stringify({ type: 'doc', content: [] }),
        targetHtml: '<p>html-mismatch</p>',
        targetJsonStr: targetJson,
        isFocused: false,
        lastSyncedSignature: null,
      }),
    ).toEqual({ kind: 'sync', signature: targetJson });
  });

  // Sequence test: walks through the realistic state-machine progression that
  // the four issues from PR review surface. Tests interaction of lastSynced +
  // sanitized-current + focus + debounced onChange in one go.
  it('handles the load → type → blur-during-debounce → debounce-flush sequence safely', () => {
    // Step 1: draft body arrives after mount, editor still empty.
    const r1 = decideEditorContentSync({
      currentSanitizedHtml: '<p></p>',
      currentJsonStr: EMPTY_DOC,
      targetHtml: '<p>D</p>',
      targetJsonStr: undefined,
      isFocused: false,
      lastSyncedSignature: null,
    });
    expect(r1).toEqual({ kind: 'sync', signature: '<p>D</p>' });

    // Step 2: user types 'x' inside the editor. Editor now ahead of parent
    // state because onChange is debounced 300ms. User blurs within debounce.
    const r2 = decideEditorContentSync({
      currentSanitizedHtml: '<p>Dx</p>',
      currentJsonStr: '{}',
      targetHtml: '<p>D</p>', // parent state lags
      targetJsonStr: undefined,
      isFocused: false, // just blurred
      lastSyncedSignature: '<p>D</p>',
    });
    expect(r2).toEqual({ kind: 'skip' }); // critical: user's 'x' is preserved

    // Step 3: debounce flushes, parent state catches up, effect re-runs.
    const r3 = decideEditorContentSync({
      currentSanitizedHtml: '<p>Dx</p>',
      currentJsonStr: '{}',
      targetHtml: '<p>Dx</p>',
      targetJsonStr: undefined,
      isFocused: false,
      lastSyncedSignature: '<p>D</p>',
    });
    expect(r3).toEqual({ kind: 'recordOnly', signature: '<p>Dx</p>' });
  });
});
