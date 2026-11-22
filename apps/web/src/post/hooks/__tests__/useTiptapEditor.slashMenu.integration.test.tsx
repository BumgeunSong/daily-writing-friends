import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorContent, type Editor } from '@tiptap/react';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { sanitize } from '@/post/utils/sanitizeHtml';
import { useTiptapEditor } from '../useTiptapEditor';

const noop = () => undefined;

// jsdom has no layout engine; ProseMirror and floating-ui measure rects.
beforeAll(() => {
  const emptyRect = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) };
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => emptyRect as DOMRect;
  Object.assign(Text.prototype, { getClientRects: () => [] });
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener: noop, removeEventListener: noop })) as typeof window.matchMedia;
});

function Harness({ html, onImageRequest, onReady }: { html: string; onImageRequest: () => void; onReady: (editor: Editor) => void }) {
  const editor = useTiptapEditor({ initialHtml: html, onChange: noop, onImageRequest });
  if (!editor) return null;
  onReady(editor);
  return <EditorContent editor={editor} />;
}

function renderEditor(html = '<p></p>', onImageRequest: () => void = noop) {
  let editor!: Editor;
  render(<Harness html={html} onImageRequest={onImageRequest} onReady={(e) => (editor = e)} />);
  return editor;
}

/** 한 글자씩 handleTextInput을 거쳐 입력해 Suggestion 플러그인이 트랜잭션마다 상태를 갱신하게 한다. */
function typeText(editor: Editor, text: string) {
  act(() => {
    for (const char of text) {
      const { from, to } = editor.state.selection;
      const handled = editor.view.someProp('handleTextInput', (handler) =>
        handler(editor.view, from, to, char, () => editor.state.tr.insertText(char, from, to)),
      );
      if (!handled) editor.view.dispatch(editor.state.tr.insertText(char, from, to));
    }
  });
}

function pressKey(editor: Editor, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  let handled = false;
  act(() => {
    handled = editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event)) ?? false;
  });
  return { handled, event };
}

/** ProseMirror 자체의 keydown 경로(조합 가드 포함)를 타도록 DOM 이벤트로 보낸다. */
function dispatchDomKey(editor: Editor, key: string, init: KeyboardEventInit & { keyCode?: number }) {
  act(() => {
    editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
  });
}

const menu = () => screen.queryByRole('listbox');
const options = () => screen.queryAllByRole('option').map((option) => option.textContent);
const activeOption = () =>
  screen.getAllByRole('option').find((option) => option.getAttribute('aria-selected') === 'true')?.textContent;
const blockTypes = (editor: Editor) => editor.getJSON().content?.map((node) => node.type);

describe('빈 줄에서 슬래시를 입력했을 때', () => {
  it('메뉴가 열리고 7개 항목이 role=option으로 보인다', async () => {
    const editor = renderEditor();
    typeText(editor, '/');

    await waitFor(() => expect(menu()).not.toBeNull());
    expect(options()).toEqual(['이미지', '제목 1', '제목 2', '인용', '글머리 목록', '번호 목록', '구분선']);
    expect(activeOption()).toBe('이미지');
  });

  it('문장 중간의 슬래시(날짜)에서는 열리지 않는다', () => {
    const editor = renderEditor();
    typeText(editor, '2026/11');
    expect(menu()).toBeNull();
  });

  it('글이 이미 있는 줄 맨 앞에서 슬래시를 입력해도 열리지 않는다', () => {
    const editor = renderEditor('<p>안녕</p>');
    act(() => {
      editor.commands.setTextSelection(1);
    });
    typeText(editor, '/');
    expect(menu()).toBeNull();
  });

  it('인용 안의 빈 줄에서는 열리지 않는다', () => {
    const editor = renderEditor('<blockquote><p></p></blockquote>');
    act(() => {
      editor.commands.setTextSelection(2);
    });
    typeText(editor, '/');
    expect(menu()).toBeNull();
  });

  it('슬래시 뒤 한글 이름으로 항목이 걸러진다', async () => {
    const editor = renderEditor();
    typeText(editor, '/제목');
    await waitFor(() => expect(options()).toEqual(['제목 1', '제목 2']));
  });

  it('슬래시 뒤 영문 키워드로 항목이 걸러진다', async () => {
    const editor = renderEditor();
    typeText(editor, '/quote');
    await waitFor(() => expect(options()).toEqual(['인용']));
  });
});

describe('키보드로 메뉴를 조작할 때', () => {
  it('방향키로 활성 항목이 이동하고 aria-selected가 따라간다', async () => {
    const editor = renderEditor();
    typeText(editor, '/');
    await waitFor(() => expect(menu()).not.toBeNull());

    pressKey(editor, 'ArrowDown');
    await waitFor(() => expect(activeOption()).toBe('제목 1'));
    pressKey(editor, 'ArrowUp');
    pressKey(editor, 'ArrowUp');
    await waitFor(() => expect(activeOption()).toBe('구분선'));
  });

  it('Enter로 고르면 입력한 /검색어가 지워지고 블록이 바뀐다', async () => {
    const editor = renderEditor();
    typeText(editor, '/제목');
    await waitFor(() => expect(options()).toEqual(['제목 1', '제목 2']));

    pressKey(editor, 'ArrowDown');
    pressKey(editor, 'Enter');

    expect(editor.getJSON().content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 2 } });
    expect(editor.state.doc.textContent).toBe('');
    expect(menu()).toBeNull();
  });

  it('Esc로 닫으면 문서는 그대로 두고 메뉴만 사라진다', async () => {
    const editor = renderEditor();
    typeText(editor, '/제목');
    await waitFor(() => expect(menu()).not.toBeNull());

    pressKey(editor, 'Escape');

    await waitFor(() => expect(menu()).toBeNull());
    expect(editor.state.doc.textContent).toBe('/제목');
  });

  it('메뉴가 열린 동안에도 문서의 커서 위치는 입력 끝에 머문다', async () => {
    const editor = renderEditor();
    typeText(editor, '/제');
    await waitFor(() => expect(menu()).not.toBeNull());

    pressKey(editor, 'ArrowDown');

    expect(editor.state.selection.from).toBe(3);
  });
});

describe('각 항목을 골랐을 때', () => {
  it.each([
    ['제목 1', { type: 'heading', attrs: { level: 1 } }],
    ['제목 2', { type: 'heading', attrs: { level: 2 } }],
    ['인용', { type: 'blockquote' }],
    ['글머리 목록', { type: 'bulletList' }],
    ['번호 목록', { type: 'orderedList' }],
  ])('%s는 해당 블록을 만든다', async (title, expected) => {
    const editor = renderEditor();
    typeText(editor, '/');
    await waitFor(() => expect(menu()).not.toBeNull());

    await userEvent.click(screen.getByRole('option', { name: new RegExp(`^${title}$`) }));

    expect(editor.getJSON().content?.[0]).toMatchObject(expected);
    expect(editor.state.doc.textContent).toBe('');
  });

  it('구분선은 hr을 삽입하고 그 아래 빈 문단에 이어 쓸 수 있다', async () => {
    const editor = renderEditor();
    typeText(editor, '/구분');
    await waitFor(() => expect(options()).toEqual(['구분선']));

    pressKey(editor, 'Enter');

    expect(blockTypes(editor)).toEqual(['horizontalRule', 'paragraph']);
    expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');
    expect(editor.state.selection.$from.parentOffset).toBe(0);
  });

  it('이미지는 입력한 /검색어를 지우고 파일 선택기 요청을 호출한다', async () => {
    const onImageRequest = vi.fn();
    const editor = renderEditor('<p></p>', onImageRequest);
    typeText(editor, '/image');
    await waitFor(() => expect(options()).toEqual(['이미지']));

    pressKey(editor, 'Enter');

    expect(onImageRequest).toHaveBeenCalledTimes(1);
    expect(editor.state.doc.textContent).toBe('');
  });

  it.each([
    ['/제목', 'heading'],
    ['/인용', 'blockquote'],
    ['/글머리', 'bulletList'],
    ['/번호', 'orderedList'],
    ['/구분', 'horizontalRule'],
  ])('%s로 고른 블록은 저장된 html과 json으로 다시 열어도 유지된다', async (query, blockType) => {
    const editor = renderEditor();
    typeText(editor, query);
    await waitFor(() => expect(menu()).not.toBeNull());
    pressKey(editor, 'Enter');
    const savedHtml = sanitize(editor.getHTML());
    const savedJson = editor.getJSON();

    const fromHtml = renderEditor(savedHtml);
    const fromJson = renderEditor();
    act(() => {
      fromJson.commands.setContent(savedJson);
    });

    expect(blockTypes(fromHtml)?.[0]).toBe(blockType);
    expect(blockTypes(fromJson)?.[0]).toBe(blockType);
  });
});

describe('한글 IME 조합 중일 때', () => {
  it('조합 중 Enter(isComposing)는 메뉴 선택으로 처리되지 않는다', async () => {
    const editor = renderEditor();
    typeText(editor, '/제목');
    await waitFor(() => expect(menu()).not.toBeNull());

    dispatchDomKey(editor, 'Enter', { isComposing: true });

    expect(editor.getJSON().content?.[0]?.type).toBe('paragraph');
    expect(editor.state.doc.textContent).toContain('/제목');
  });

  it('조합 중 Enter는 keyCode 229만 있어도 메뉴 선택으로 처리되지 않는다', async () => {
    const editor = renderEditor();
    typeText(editor, '/제');
    await waitFor(() => expect(menu()).not.toBeNull());

    dispatchDomKey(editor, 'Enter', { keyCode: 229 });

    expect(editor.getJSON().content?.[0]?.type).toBe('paragraph');
    expect(editor.state.doc.textContent).toContain('/제');
  });

  it('조합 중 방향키는 메뉴 활성 항목을 움직이지 않는다', async () => {
    const editor = renderEditor();
    typeText(editor, '/');
    await waitFor(() => expect(menu()).not.toBeNull());

    pressKey(editor, 'ArrowDown', { isComposing: true });

    expect(activeOption()).toBe('이미지');
  });

  it('미완성 음절(/제모)이 입력돼도 제목 항목이 사라지지 않는다', async () => {
    const editor = renderEditor();
    typeText(editor, '/제모');
    await waitFor(() => expect(options()).toEqual(['제목 1', '제목 2']));
  });
});

