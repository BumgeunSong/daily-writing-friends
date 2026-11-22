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

  it.each([
    ['Bold', '<strong>글자</strong>'],
    ['Italic', '<em>글자</em>'],
    ['Underline', '<u>글자</u>'],
    ['Strikethrough', '<s>글자</s>'],
  ])('글자를 선택하고 %s 버튼을 누르면 %s로 감싼다', async (button, expected) => {
    const editor = renderToolbar('<p>글자</p>', { from: 1, to: 3 });

    await pressToolbar(button);

    expect(editor.getHTML()).toContain(expected);
  });

  it('같은 서식 버튼을 한 번 더 누르면 서식이 풀린다', async () => {
    const editor = renderToolbar('<p>글자</p>', { from: 1, to: 3 });

    await pressToolbar('Bold');
    await pressToolbar('Bold');

    expect(editor.getHTML()).toBe('<p>글자</p>');
  });

  it.each([
    ['Heading 1', '<h1>글자</h1>'],
    ['Heading 2', '<h2>글자</h2>'],
    ['Blockquote', '<blockquote><p>글자</p></blockquote>'],
    ['Bullet List', '<ul><li><p>글자</p></li></ul>'],
    ['Ordered List', '<ol><li><p>글자</p></li></ol>'],
  ])('줄에서 %s 버튼을 누르면 %s 구조가 된다', async (button, expected) => {
    const editor = renderToolbar('<p>글자</p>', { from: 1, to: 1 });

    await pressToolbar(button);

    expect(editor.getHTML()).toBe(expected);
  });

  it('제목 1인 줄에서 제목 2를 누르면 제목 2로 바뀐다', async () => {
    const editor = renderToolbar('<h1>글자</h1>', { from: 1, to: 1 });

    await pressToolbar('Heading 2');

    expect(editor.getHTML()).toBe('<h2>글자</h2>');
  });
});
