import { renderHook } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { describe, it, expect } from 'vitest';
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
});
