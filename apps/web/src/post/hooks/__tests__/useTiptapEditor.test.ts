import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useTiptapEditor } from '../useTiptapEditor';

describe('useTiptapEditor — typing signal', () => {
  it('calls onTyping when beforeinput fires on the editor DOM (covers normal input)', () => {
    const onTyping = vi.fn();
    const { result } = renderHook(() =>
      useTiptapEditor({
        initialHtml: '<p></p>',
        onChange: () => {},
        onTyping,
      }),
    );

    const editor = result.current;
    expect(editor).not.toBeNull();

    act(() => {
      editor!.view.dom.dispatchEvent(new InputEvent('beforeinput', { data: 'a' }));
    });

    expect(onTyping).toHaveBeenCalled();
  });

  it('calls onTyping when compositionupdate fires (covers IME mid-composition where Tiptap onUpdate is silent)', () => {
    const onTyping = vi.fn();
    const { result } = renderHook(() =>
      useTiptapEditor({
        initialHtml: '<p></p>',
        onChange: () => {},
        onTyping,
      }),
    );

    const editor = result.current;
    expect(editor).not.toBeNull();

    act(() => {
      editor!.view.dom.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'ㄱ' }));
    });

    expect(onTyping).toHaveBeenCalled();
  });

  it('keeps onTyping ref fresh so latest callback fires (not the first-render closure)', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ onTyping }) =>
        useTiptapEditor({
          initialHtml: '<p></p>',
          onChange: () => {},
          onTyping,
        }),
      { initialProps: { onTyping: first } },
    );

    rerender({ onTyping: second });

    act(() => {
      result.current!.view.dom.dispatchEvent(
        new CompositionEvent('compositionupdate', { data: 'ㄱ' }),
      );
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });
});
