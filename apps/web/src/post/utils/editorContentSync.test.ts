import { describe, it, expect } from 'vitest';
import { shouldSyncEditorContent } from './editorContentSync';

describe('shouldSyncEditorContent', () => {
  it('syncs when editor is empty and target arrives (draft loaded after mount)', () => {
    expect(
      shouldSyncEditorContent({
        currentHtml: '<p></p>',
        targetHtml: '<p>loaded draft body</p>',
        isFocused: false,
      }),
    ).toBe(true);
  });

  it('does not sync while user is typing (focused)', () => {
    expect(
      shouldSyncEditorContent({
        currentHtml: '<p>old</p>',
        targetHtml: '<p>new</p>',
        isFocused: true,
      }),
    ).toBe(false);
  });

  it('does not sync when current already matches target (avoid feedback after onChange)', () => {
    expect(
      shouldSyncEditorContent({
        currentHtml: '<p>same</p>',
        targetHtml: '<p>same</p>',
        isFocused: false,
      }),
    ).toBe(false);
  });

  it('does not sync when target is undefined', () => {
    expect(
      shouldSyncEditorContent({
        currentHtml: '<p>x</p>',
        targetHtml: undefined,
        isFocused: false,
      }),
    ).toBe(false);
  });

  it('does not overwrite editor with empty target (avoid wiping content on transient empty value)', () => {
    expect(
      shouldSyncEditorContent({
        currentHtml: '<p>existing</p>',
        targetHtml: '',
        isFocused: false,
      }),
    ).toBe(false);
  });
});
