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
