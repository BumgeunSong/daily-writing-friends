import { useCallback, useRef, useEffect } from 'react';
import { type Editor } from '@tiptap/react';
import { useCopyHandler } from './useCopyHandler';

/**
 * Custom hook for managing editor copy functionality
 * Handles HTML extraction from selected text and clipboard operations
 */
export function useEditorCopy(editor: Editor | null) {
  const editorElementRef = useRef<HTMLElement | null>(null);

  // Get selected HTML for copy handler
  const getSelectedHtml = useCallback(() => {
    if (!editor) return '';

    const { from, to } = editor.state.selection;
    
    // If nothing is selected, return empty
    if (from === to) return '';

    // Get HTML of selection
    const selectedNode = editor.state.doc.cut(from, to);
    const tempEditor = document.createElement('div');
    
    // Convert ProseMirror node to HTML
    const html = editor.storage.html || editor.getHTML();
    
    // For now, fallback to full HTML if we can't get selection
    // This can be improved with a proper ProseMirror serializer
    return html;
  }, [editor]);

  // Update editor element reference
  useEffect(() => {
    const timer = setTimeout(() => {
      const editorElement = editor?.view?.dom;
      if (editorElement && editorElement instanceof HTMLElement) {
        editorElementRef.current = editorElement;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [editor]);

  // Apply copy handler
  useCopyHandler(getSelectedHtml, editorElementRef.current);

  return { editorElementRef, getSelectedHtml };
}