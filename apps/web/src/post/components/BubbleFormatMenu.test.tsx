import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorContent } from '@tiptap/react';
import { beforeAll, describe, it, expect } from 'vitest';
import { useTiptapEditor } from '@/post/hooks/useTiptapEditor';
import { BubbleFormatMenu } from './BubbleFormatMenu';

// jsdom has no layout engine; ProseMirror and the bubble menu measure selection rects.
beforeAll(() => {
  const emptyRect = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) };
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => emptyRect as DOMRect;
  Object.assign(Text.prototype, { getClientRects: () => [] });
});

type TestEditor = NonNullable<ReturnType<typeof useTiptapEditor>>;

function Harness({ html, onReady }: { html: string; onReady: (editor: TestEditor) => void }) {
  const editor = useTiptapEditor({ initialHtml: html, onChange: () => {} });
  if (!editor) return null;
  onReady(editor);
  return (
    <>
      <EditorContent editor={editor} />
      <BubbleFormatMenu editor={editor} />
    </>
  );
}

function renderMenu(html: string) {
  let editor!: TestEditor;
  render(<Harness html={html} onReady={(e) => (editor = e)} />);
  return editor;
}

function select(editor: TestEditor, from: number, to: number) {
  act(() => {
    editor.chain().focus().setTextSelection({ from, to }).run();
  });
}

// The menu element is detached from the DOM while hidden.
const isShown = () => screen.queryByTestId('bubble-format-menu')?.style.visibility === 'visible';

describe('BubbleFormatMenu', () => {
  it('텍스트를 선택하면 보이고 선택을 풀면 사라진다', async () => {
    const editor = renderMenu('<p>글자를 선택</p>');
    expect(isShown()).toBe(false);

    select(editor, 1, 4);
    await waitFor(() => expect(isShown()).toBe(true));

    select(editor, 2, 2);
    await waitFor(() => expect(isShown()).toBe(false));
  });

  it('이미지 노드를 선택하면 보이지 않는다', async () => {
    const editor = renderMenu('<p>글자</p><img src="https://example.com/a.png">');

    act(() => {
      editor.chain().focus().setNodeSelection(editor.state.doc.content.size - 1).run();
    });

    await new Promise((r) => setTimeout(r, 400));
    expect(isShown()).toBe(false);
  });

  it('현재 서식에 맞춰 버튼의 활성 상태를 표시한다', async () => {
    const editor = renderMenu('<p><strong>굵게</strong> 보통</p>');

    select(editor, 1, 3);
    await waitFor(() => expect(screen.getByLabelText('Bold')).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByLabelText('Italic')).toHaveAttribute('aria-pressed', 'false');

    select(editor, 5, 7);
    await waitFor(() => expect(screen.getByLabelText('Bold')).toHaveAttribute('aria-pressed', 'false'));
  });

  it('버튼으로 선택 영역에 서식을 적용한다', async () => {
    const user = userEvent.setup({ delay: null });
    const editor = renderMenu('<p>안녕하세요</p>');
    select(editor, 1, 4);
    await waitFor(() => expect(isShown()).toBe(true));

    await user.click(screen.getByLabelText('Bold'));
    await user.click(screen.getByLabelText('Heading 2'));

    expect(editor.getHTML()).toContain('<h2><strong>안녕하</strong>세요</h2>');
  });

  it('메뉴 안에서 링크를 추가한다', async () => {
    const user = userEvent.setup({ delay: null });
    const editor = renderMenu('<p>글자</p>');
    select(editor, 1, 3);
    await waitFor(() => expect(isShown()).toBe(true));

    await user.click(screen.getByLabelText('Link'));
    await user.type(screen.getByLabelText('링크 URL'), 'https://example.com{Enter}');

    expect(editor.getHTML()).toContain('href="https://example.com"');
    expect(screen.getByLabelText('Link')).toBeInTheDocument();
  });

  it('허용되지 않는 URL은 거부한다', async () => {
    const user = userEvent.setup({ delay: null });
    const editor = renderMenu('<p>글자</p>');
    select(editor, 1, 3);
    await waitFor(() => expect(isShown()).toBe(true));

    await user.click(screen.getByLabelText('Link'));
    await user.type(screen.getByLabelText('링크 URL'), 'javascript:alert(1){Enter}');

    expect(editor.getHTML()).not.toContain('<a ');
  });

  it('기존 링크는 URL이 채워지고 비우면 해제된다', async () => {
    const user = userEvent.setup({ delay: null });
    const editor = renderMenu('<p><a href="https://a.com">링크</a></p>');
    select(editor, 1, 3);
    await waitFor(() => expect(isShown()).toBe(true));

    await user.click(screen.getByLabelText('Link'));
    const input = screen.getByLabelText('링크 URL');
    expect(input).toHaveValue('https://a.com');
    await user.clear(input);
    await user.keyboard('{Enter}');

    expect(editor.getHTML()).not.toContain('<a ');
  });

  it('모든 버튼에 aria-label이 있다', async () => {
    const editor = renderMenu('<p>글자</p>');
    select(editor, 1, 3);
    await waitFor(() => expect(isShown()).toBe(true));

    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAccessibleName();
    }
  });
});
