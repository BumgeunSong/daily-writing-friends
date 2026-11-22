import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { useTiptapEditor } from '@/post/hooks/useTiptapEditor';
import { EditorToolbar } from './EditorToolbar';

function ToolbarHarness({
  html,
  onReady,
}: {
  html: string;
  onReady: (editor: NonNullable<ReturnType<typeof useTiptapEditor>>) => void;
}) {
  const editor = useTiptapEditor({ initialHtml: html, onChange: () => {} });
  if (!editor) return null;
  onReady(editor);
  return <EditorToolbar editor={editor} onImageUpload={() => {}} variant='inline' />;
}

function renderToolbar(html: string, selection: { from: number; to: number }) {
  let editor!: NonNullable<ReturnType<typeof useTiptapEditor>>;
  render(<ToolbarHarness html={html} onReady={(e) => (editor = e)} />);
  act(() => {
    editor.commands.setTextSelection(selection);
  });
  return editor;
}

describe('EditorToolbar 링크', () => {
  it('유효한 URL을 입력하고 확인하면 선택 영역에 링크가 걸린다', async () => {
    const user = userEvent.setup({ delay: null });
    const editor = renderToolbar('<p>글자</p>', { from: 1, to: 3 });

    await user.click(screen.getByTestId('toolbar-link'));
    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://example.com{Enter}');

    expect(editor.getHTML()).toContain('href="https://example.com"');
    expect(screen.queryByPlaceholderText('https://example.com')).not.toBeInTheDocument();
  });

  it('http로 시작하지 않는 URL에는 안내 문구를 보이고 링크를 걸지 않는다', async () => {
    const user = userEvent.setup({ delay: null });
    const editor = renderToolbar('<p>글자</p>', { from: 1, to: 3 });

    await user.click(screen.getByTestId('toolbar-link'));
    await user.type(screen.getByPlaceholderText('https://example.com'), 'example.com');
    expect(screen.getByText('URL은 http:// 또는 https://로 시작해야 합니다')).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(editor.getHTML()).not.toContain('<a ');
  });

  it('기존 링크가 있으면 팝오버를 열 때 URL이 채워지고, 비우고 확인하면 해제된다', async () => {
    const user = userEvent.setup({ delay: null });
    const editor = renderToolbar('<p><a href="https://a.com">링크</a></p>', { from: 1, to: 3 });

    await user.click(screen.getByTestId('toolbar-link'));
    const input = screen.getByPlaceholderText('https://example.com');
    expect(input).toHaveValue('https://a.com');

    await user.clear(input);
    await user.keyboard('{Enter}');
    expect(editor.getHTML()).not.toContain('<a ');
  });

  it('취소 버튼은 링크를 바꾸지 않고 팝오버를 닫는다', async () => {
    const user = userEvent.setup({ delay: null });
    const editor = renderToolbar('<p>글자</p>', { from: 1, to: 3 });

    await user.click(screen.getByTestId('toolbar-link'));
    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://example.com');
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[buttons.length - 1]);

    expect(editor.getHTML()).not.toContain('<a ');
    expect(screen.queryByPlaceholderText('https://example.com')).not.toBeInTheDocument();
  });
});

describe('EditorToolbar 서식', () => {
  const pressToolbar = async (name: string) => {
    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole('button', { name }));
  };

  const marks = [
    ['Bold', '굵게', '<p><strong>글자</strong></p>'],
    ['Italic', '기울임', '<p><em>글자</em></p>'],
    ['Underline', '밑줄', '<p><u>글자</u></p>'],
    ['Strikethrough', '취소선', '<p><s>글자</s></p>'],
  ] as const;

  it.each(marks)('글자를 선택하고 %s 버튼(%s)을 누르면 선택한 글자에 서식이 걸린다', async (button, _label, expected) => {
    const editor = renderToolbar('<p>글자</p>', { from: 1, to: 3 });

    await pressToolbar(button);

    expect(editor.getHTML()).toBe(expected);
  });

  it.each(marks)('%s 버튼(%s)을 한 번 더 누르면 서식이 풀린다', async (button) => {
    const editor = renderToolbar('<p>글자</p>', { from: 1, to: 3 });

    await pressToolbar(button);
    await pressToolbar(button);

    expect(editor.getHTML()).toBe('<p>글자</p>');
  });

  it('커서만 놓고 굵게 버튼을 누른 뒤 이어서 쓰는 글자에 서식이 걸린다', async () => {
    const editor = renderToolbar('<p></p>', { from: 1, to: 1 });

    await pressToolbar('Bold');
    act(() => {
      editor.view.dispatch(editor.state.tr.insertText('글자'));
    });

    expect(editor.getHTML()).toBe('<p><strong>글자</strong></p>');
  });

  const blocks = [
    ['Heading 1', '제목 1', '<h1>글자</h1>'],
    ['Heading 2', '제목 2', '<h2>글자</h2>'],
    ['Blockquote', '인용', '<blockquote><p>글자</p></blockquote>'],
    ['Bullet List', '글머리 목록', '<ul><li><p>글자</p></li></ul>'],
    ['Ordered List', '번호 목록', '<ol><li><p>글자</p></li></ol>'],
  ] as const;

  it.each(blocks)('줄에서 %s 버튼(%s)을 누르면 그 줄이 해당 구조로 바뀐다', async (button, _label, expected) => {
    const editor = renderToolbar('<p>글자</p>', { from: 1, to: 1 });

    await pressToolbar(button);

    expect(editor.getHTML()).toBe(expected);
  });

  it('제목 1인 줄에서 제목 2 버튼을 누르면 제목 2로 바뀐다', async () => {
    const editor = renderToolbar('<h1>글자</h1>', { from: 1, to: 1 });

    await pressToolbar('Heading 2');

    expect(editor.getHTML()).toBe('<h2>글자</h2>');
  });
});
