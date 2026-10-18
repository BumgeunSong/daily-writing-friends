import { act, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { withProviders } from '@/test/utils/withProviders';

import { useCommentEditor } from './useCommentEditor';

// TipTap's Placeholder extension tracks the editor viewport via ResizeObserver
// and IntersectionObserver, neither of which jsdom implements; stub both so the
// editor can mount.
beforeAll(() => {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal('ResizeObserver', NoopObserver);
  vi.stubGlobal('IntersectionObserver', NoopObserver);
});

function renderCommentEditor(initialContent: string) {
  const { Wrapper } = withProviders();
  return renderHook(
    () =>
      useCommentEditor({
        boardId: '',
        placeholder: '테스트',
        initialContent,
        onSubmit: vi.fn(() => Promise.resolve()),
      }),
    {
      wrapper: ({ children }) => (
        <MemoryRouter>
          <Wrapper>{children}</Wrapper>
        </MemoryRouter>
      ),
    },
  );
}

// renderHook's container is never attached to document.body, so DOM .focus()
// and userEvent (which dispatches on document.activeElement) can't reach the
// editor. Set the ProseMirror selection directly and dispatch the keydown on
// the view's own DOM node -- ProseMirror's keymap listener is bound there,
// not on the document, so it fires regardless of attachment.
function pressEnterAt(
  editor: NonNullable<ReturnType<typeof useCommentEditor>['editor']>,
  pos: number,
) {
  act(() => {
    editor.commands.setTextSelection(pos);
  });
  act(() => {
    // userEvent dispatches on document.activeElement, which renderHook's
    // detached container can never hold -- fireEvent targets the node itself.
    // eslint-disable-next-line testing-library/prefer-user-event
    fireEvent.keyDown(editor.view.dom, { key: 'Enter', code: 'Enter' });
  });
}

function pressEnterAtEnd(editor: NonNullable<ReturnType<typeof useCommentEditor>['editor']>) {
  pressEnterAt(editor, editor.state.doc.content.size);
}

function endOfFirstHardBreak(
  editor: NonNullable<ReturnType<typeof useCommentEditor>['editor']>,
) {
  let pos = -1;
  editor.state.doc.descendants((node, nodePos) => {
    if (pos === -1 && node.type.name === 'hardBreak') pos = nodePos + node.nodeSize;
  });
  return pos;
}

// Blockquote's wrapping input rule is registered on the view's handleTextInput
// prop (prosemirror-inputrules), not on keydown -- invoke that prop directly
// so "> " is matched exactly as it would be for real typing.
function typeBlockquoteMarker(
  editor: NonNullable<ReturnType<typeof useCommentEditor>['editor']>,
  pos: number,
) {
  act(() => {
    editor.view.someProp('handleTextInput', (f) =>
      (f as (view: typeof editor.view, from: number, to: number, text: string) => unknown)(
        editor.view,
        pos,
        pos,
        '> ',
      ),
    );
  });
}

describe('useCommentEditor — blockquote exit', () => {
  it('lifts an empty paragraph out of the blockquote when Enter is pressed on a blank quoted line', async () => {
    const { result } = renderCommentEditor('<blockquote><p>인용문<br></p></blockquote>');
    await waitFor(() => expect(result.current.editor).not.toBeNull());

    pressEnterAtEnd(result.current.editor!);

    expect(result.current.editor!.getHTML()).toBe('<blockquote><p>인용문</p></blockquote><p></p>');
  });

  it('inserts a plain line break when Enter is pressed mid-quote, without exiting', async () => {
    const { result } = renderCommentEditor('<blockquote><p>인용문</p></blockquote>');
    await waitFor(() => expect(result.current.editor).not.toBeNull());

    pressEnterAtEnd(result.current.editor!);

    expect(result.current.editor!.getHTML()).toBe('<blockquote><p>인용문<br></p></blockquote>');
  });

  it('inserts a plain line break, without exiting, when Enter is pressed right after a hard break that is not the last line', async () => {
    const { result } = renderCommentEditor('<blockquote><p>줄1<br>줄2</p></blockquote>');
    await waitFor(() => expect(result.current.editor).not.toBeNull());
    const editor = result.current.editor!;

    pressEnterAt(editor, endOfFirstHardBreak(editor));

    expect(editor.getHTML()).toBe('<blockquote><p>줄1<br><br>줄2</p></blockquote>');
  });
});

describe('useCommentEditor — blockquote input rule', () => {
  it('wraps the line in a blockquote when "> " is typed at the start of a plain paragraph', async () => {
    const { result } = renderCommentEditor('<p>인용문</p>');
    await waitFor(() => expect(result.current.editor).not.toBeNull());
    const editor = result.current.editor!;

    typeBlockquoteMarker(editor, 1);

    expect(editor.getHTML()).toBe('<blockquote><p>인용문</p></blockquote>');
  });

  it('does not nest a second blockquote when "> " is typed at the start of an already-quoted line', async () => {
    const { result } = renderCommentEditor('<blockquote><p>인용문</p></blockquote>');
    await waitFor(() => expect(result.current.editor).not.toBeNull());
    const editor = result.current.editor!;

    typeBlockquoteMarker(editor, 2);

    // The rule bails out without dispatching, so the doc is untouched here;
    // a real keystroke's own default insertion (not simulated by this
    // synthetic handleTextInput call) would additionally leave "> " as text.
    // What matters for this regression is that no second <blockquote> wraps it.
    expect(editor.getHTML()).toBe('<blockquote><p>인용문</p></blockquote>');
  });
});
