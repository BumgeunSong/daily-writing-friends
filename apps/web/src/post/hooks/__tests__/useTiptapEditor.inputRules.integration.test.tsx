import { renderHook } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { describe, it, expect } from 'vitest';
import { sanitize } from '@/post/utils/sanitizeHtml';
import { useTiptapEditor } from '../useTiptapEditor';

function renderEditor(): Editor {
  const { result } = renderHook(() =>
    useTiptapEditor({ initialHtml: '<p></p>', onChange: () => {} }),
  );
  if (!result.current) throw new Error('editor not initialized');
  return result.current;
}

/** 한 글자씩 ProseMirror의 handleTextInput에 흘려 입력 규칙을 발동시킨다. */
function typeText(editor: Editor, text: string) {
  for (const char of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp('handleTextInput', (handler) =>
      handler(editor.view, from, to, char, () => editor.state.tr.insertText(char, from, to)),
    );
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(char, from, to));
  }
}

function pressBackspace(editor: Editor) {
  const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
  editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event));
}

const currentBlocks = (editor: Editor) =>
  editor.getJSON().content?.map((node) => node.type) ?? [];

const firstBlockText = (editor: Editor) => editor.state.doc.firstChild?.textContent;

describe('빈 줄에서 마크다운 입력 규칙이 발동한 직후', () => {
  it.each([
    ['# ', 'heading'],
    ['## ', 'heading'],
    ['> ', 'blockquote'],
    ['- ', 'bulletList'],
    ['1. ', 'orderedList'],
  ])('"%s"를 입력하면 %s 블록이 되고 Backspace 한 번이면 입력한 원문으로 돌아간다', (typed, block) => {
    const editor = renderEditor();

    typeText(editor, typed);
    expect(currentBlocks(editor)[0]).toBe(block);

    pressBackspace(editor);
    expect(editor.state.doc.firstChild?.type.name).toBe('paragraph');
    expect(firstBlockText(editor)).toBe(typed);
  });

  it.each([
    ['**굵게**', 'strong', '굵게'],
    ['*기울임*', 'em', '기울임'],
  ])('"%s"를 입력하면 서식이 적용되고 Backspace 한 번이면 입력한 원문으로 돌아간다', (typed, tag, inner) => {
    const editor = renderEditor();

    typeText(editor, typed);
    expect(editor.getHTML()).toContain(`<${tag}>${inner}</${tag}>`);

    pressBackspace(editor);

    expect(editor.getHTML()).not.toContain(`<${tag}>`);
    expect(firstBlockText(editor)).toBe(typed);
  });

  it('한글 문장 뒤에 이어 입력한 **굵게**도 Backspace 한 번이면 원문으로 돌아간다', () => {
    const editor = renderEditor();
    typeText(editor, '안녕 ');
    typeText(editor, '**굵게**');
    expect(editor.getHTML()).toContain('<strong>굵게</strong>');

    pressBackspace(editor);

    expect(editor.getHTML()).not.toContain('<strong>');
    expect(firstBlockText(editor)).toBe('안녕 **굵게**');
  });

  it('"---"를 입력하면 구분선이 생기고 아래에 입력할 빈 문단이 이어진다', () => {
    const editor = renderEditor();

    typeText(editor, '---');

    expect(currentBlocks(editor)).toEqual(['horizontalRule', 'paragraph']);
    expect(editor.getHTML()).toBe('<hr><p></p>');
    expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');
    expect(editor.state.selection.$from.parentOffset).toBe(0);
  });

  it('"---" 직후 Backspace 한 번이면 입력한 원문으로 돌아간다', () => {
    const editor = renderEditor();
    typeText(editor, '---');

    pressBackspace(editor);

    expect(editor.state.doc.firstChild?.type.name).toBe('paragraph');
    expect(firstBlockText(editor)).toBe('---');
    expect(editor.getHTML()).not.toContain('<hr');
    expect(editor.state.selection.$from.parentOffset).toBe(3);
  });

  it.each(['--', '글---'])('"%s"는 구분선으로 바뀌지 않는다', (typed) => {
    const editor = renderEditor();

    typeText(editor, typed);

    expect(editor.getHTML()).not.toContain('<hr');
  });

  it('한글 문장 다음 줄에서 "---"를 입력해도 구분선이 생기고 앞 문장은 보존된다', () => {
    const editor = renderEditor();
    typeText(editor, '안녕하세요');
    editor.commands.splitBlock();

    typeText(editor, '---');

    expect(currentBlocks(editor)).toEqual(['paragraph', 'horizontalRule', 'paragraph']);
    expect(editor.getHTML()).toContain('<p>안녕하세요</p><hr>');
  });
});

describe('구분선이 있는 문서를 저장하고 다시 열 때', () => {
  it('JSON으로 복원해도 구분선이 유지된다', () => {
    const editor = renderEditor();
    typeText(editor, '---');
    const saved = editor.getJSON();

    editor.commands.setContent(saved);

    expect(currentBlocks(editor)).toEqual(['horizontalRule', 'paragraph']);
  });

  it('HTML로 복원해도 구분선이 유지된다', () => {
    const editor = renderEditor();

    editor.commands.setContent('<p>위</p><hr><p>아래</p>');

    expect(currentBlocks(editor)).toEqual(['paragraph', 'horizontalRule', 'paragraph']);
  });

  it('저장 경로(getHTML → sanitize)를 거쳐 다시 열어도 구분선이 유지된다', () => {
    const editor = renderEditor();
    typeText(editor, '---');
    const savedHtml = sanitize(editor.getHTML());

    editor.commands.setContent(savedHtml);

    expect(currentBlocks(editor)).toEqual(['horizontalRule', 'paragraph']);
  });

  it('JSON 복원 결과가 저장 전 JSON과 같다', () => {
    const editor = renderEditor();
    typeText(editor, '---');
    const saved = editor.getJSON();

    editor.commands.setContent(saved);

    expect(editor.getJSON()).toEqual(saved);
  });
});

describe('문서 끝에 빈 문단을 자동으로 붙이는 규칙은', () => {
  it('인용구로 끝나는 문서에는 붙이지 않는다', () => {
    const editor = renderEditor();

    editor.commands.setContent('<p>a</p><blockquote><p>b</p></blockquote>');

    expect(currentBlocks(editor)).toEqual(['paragraph', 'blockquote']);
  });

  it('구분선으로 끝나는 문서에는 붙인다', () => {
    const editor = renderEditor();

    editor.commands.setContent('<p>a</p><hr>');

    expect(currentBlocks(editor)).toEqual(['paragraph', 'horizontalRule', 'paragraph']);
  });
});
