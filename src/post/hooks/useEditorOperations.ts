import { useCallback } from 'react';
import type { QuillRef } from './useQuillConfig';

interface UseEditorOperationsProps {
  quillRef: QuillRef;
}

const VIDEO_MARKDOWN_TEMPLATE = (url: string) => `\n[video](${url})\n`;

export function useEditorOperations({ quillRef }: UseEditorOperationsProps) {
  const insertImage = useCallback((url: string) => {
    if (!quillRef.current) return;

    const editor = quillRef.current.getEditor();
    const range = editor.getSelection(true);
    editor.insertEmbed(range.index, 'image', url, 'user');
    editor.setSelection(range.index + 1);
  }, [quillRef]);

  const insertVideo = useCallback((url: string) => {
    if (!quillRef.current) return;

    const editor = quillRef.current.getEditor();
    const range = editor.getSelection(true);
    const markdown = VIDEO_MARKDOWN_TEMPLATE(url);
    editor.insertText(range.index, markdown, 'user');
    editor.setSelection(range.index + markdown.length);
  }, [quillRef]);

  const getSelectedHtml = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) return '';

    const range = selection.getRangeAt(0);
    const clonedSelection = range.cloneContents();
    const div = document.createElement('div');
    div.appendChild(clonedSelection);
    return div.innerHTML;
  }, []);

  const getEditorElement = useCallback((): HTMLElement | null => {
    if (!quillRef.current) return null;

    const editor = quillRef.current.getEditor();
    return editor.root as HTMLElement;
  }, [quillRef]);

  return {
    insertImage,
    insertVideo,
    getSelectedHtml,
    getEditorElement,
  };
}