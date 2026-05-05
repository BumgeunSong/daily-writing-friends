import { describe, it, expect } from 'vitest';
import { shouldSyncEditorContent } from './editorContentSync';

const EMPTY_DOC = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });

describe('shouldSyncEditorContent', () => {
  it('syncs when editor is empty and target HTML arrives (draft loaded after mount)', () => {
    expect(
      shouldSyncEditorContent({
        currentHtml: '<p></p>',
        currentJsonStr: EMPTY_DOC,
        targetHtml: '<p>loaded draft body</p>',
        targetJsonStr: undefined,
        isFocused: false,
      }),
    ).toBe(true);
  });

  it('does not sync while user is typing (focused)', () => {
    expect(
      shouldSyncEditorContent({
        currentHtml: '<p>old</p>',
        currentJsonStr: '{}',
        targetHtml: '<p>new</p>',
        targetJsonStr: undefined,
        isFocused: true,
      }),
    ).toBe(false);
  });

  it('does not sync when current HTML already matches target (avoid feedback after onChange)', () => {
    expect(
      shouldSyncEditorContent({
        currentHtml: '<p>same</p>',
        currentJsonStr: '{}',
        targetHtml: '<p>same</p>',
        targetJsonStr: undefined,
        isFocused: false,
      }),
    ).toBe(false);
  });

  it('does not sync when no target signal at all', () => {
    expect(
      shouldSyncEditorContent({
        currentHtml: '<p>x</p>',
        currentJsonStr: '{}',
        targetHtml: undefined,
        targetJsonStr: undefined,
        isFocused: false,
      }),
    ).toBe(false);
  });

  it('syncs to empty target so switching to a title-only draft clears stale body', () => {
    expect(
      shouldSyncEditorContent({
        currentHtml: '<p>previous draft body</p>',
        currentJsonStr: '{}',
        targetHtml: '',
        targetJsonStr: undefined,
        isFocused: false,
      }),
    ).toBe(true);
  });

  it('prefers target JSON over HTML when both are provided', () => {
    expect(
      shouldSyncEditorContent({
        currentHtml: '<p>html-mismatch</p>',
        currentJsonStr: JSON.stringify({ type: 'doc', content: [] }),
        targetHtml: '<p>html-mismatch</p>',
        targetJsonStr: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
        isFocused: false,
      }),
    ).toBe(true);
  });

  it('skips when target JSON matches current JSON (covers async-JSON contract)', () => {
    const sameJson = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(
      shouldSyncEditorContent({
        currentHtml: '<p></p>',
        currentJsonStr: sameJson,
        targetHtml: undefined,
        targetJsonStr: sameJson,
        isFocused: false,
      }),
    ).toBe(false);
  });
});
