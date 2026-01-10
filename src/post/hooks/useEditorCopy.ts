import { type Editor } from '@tiptap/react';
import { useCallback, useRef, useEffect } from 'react';
import { useCopyHandler } from './useCopyHandler';

// Types for better type safety
interface ProseMirrorNode {
  type: { name: string };
  textContent: string;
  marks?: readonly ProseMirrorMark[];
  attrs?: Record<string, unknown>;
}

interface ProseMirrorMark {
  type: { name: string };
  attrs?: Record<string, unknown>;
}

interface ProseMirrorFragment {
  content: { forEach: (callback: (node: ProseMirrorNode, offset?: number, index?: number) => void) => void };
  textContent: string;
}

// Constants for mark and node types
const MARK_TYPES = {
  BOLD: ['bold', 'strong'],
  ITALIC: ['italic', 'em'],
  UNDERLINE: 'underline',
  STRIKE: 'strike',
  LINK: 'link',
  CODE: 'code',
} as const;

const NODE_TYPES = {
  PARAGRAPH: 'paragraph',
  HEADING: 'heading',
  BLOCKQUOTE: 'blockquote',
  CODE_BLOCK: 'codeBlock',
  LIST_ITEM: 'listItem',
  BULLET_LIST: 'bulletList',
  ORDERED_LIST: 'orderedList',
} as const;

// Timing constants
const EDITOR_ELEMENT_UPDATE_DELAY = 100; // milliseconds - delay for editor DOM element to be available

/**
 * Applies formatting marks to text content
 */
function applyMarksToText(text: string, marks: readonly ProseMirrorMark[]): string {
  // Apply marks in reverse order for proper nesting
  return [...marks].reverse().reduce((formattedText, mark) => {
    const markType = mark.type.name;

    if ((MARK_TYPES.BOLD as readonly string[]).includes(markType)) {
      return `<strong>${formattedText}</strong>`;
    }

    if ((MARK_TYPES.ITALIC as readonly string[]).includes(markType)) {
      return `<em>${formattedText}</em>`;
    }

    switch (markType) {
      case MARK_TYPES.UNDERLINE:
        return `<u>${formattedText}</u>`;
      case MARK_TYPES.STRIKE:
        return `<s>${formattedText}</s>`;
      case MARK_TYPES.LINK: {
        const href = mark.attrs?.href || '#';
        const target = mark.attrs?.target || '_blank';
        return `<a href="${href}" target="${target}">${formattedText}</a>`;
      }
      case MARK_TYPES.CODE:
        return `<code>${formattedText}</code>`;
      default:
        return formattedText;
    }
  }, text);
}

/**
 * Converts a ProseMirror node to HTML string
 */
function nodeToHtml(node: ProseMirrorNode): string {
  const { type, textContent, marks = [], attrs = {} } = node;

  if (!textContent) return '';

  // Apply marks to text content
  const formattedText = applyMarksToText(textContent, marks);

  // Wrap in appropriate block element
  switch (type.name) {
    case NODE_TYPES.PARAGRAPH:
      return `<p>${formattedText}</p>`;
    case NODE_TYPES.HEADING: {
      const level = Math.max(1, Math.min(6, attrs.level || 1));
      return `<h${level}>${formattedText}</h${level}>`;
    }
    case NODE_TYPES.BLOCKQUOTE:
      return `<blockquote>${formattedText}</blockquote>`;
    case NODE_TYPES.CODE_BLOCK:
      return `<pre><code>${textContent}</code></pre>`;
    case NODE_TYPES.LIST_ITEM:
      return `<li>${formattedText}</li>`;
    case NODE_TYPES.BULLET_LIST:
      return `<ul>${formattedText}</ul>`;
    case NODE_TYPES.ORDERED_LIST:
      return `<ol>${formattedText}</ol>`;
    default:
      // For unknown node types, wrap in paragraph
      return `<p>${formattedText}</p>`;
  }
}

/**
 * Extracts HTML from browser's native selection
 */
function getBrowserSelectionHtml(editor: Editor): string | null {
  const browserSelection = window.getSelection();

  if (!browserSelection || browserSelection.rangeCount === 0) {
    return null;
  }

  const range = browserSelection.getRangeAt(0);
  const editorElement = editor.view.dom;

  // Verify the selection is within our editor
  if (!editorElement.contains(range.commonAncestorContainer)) {
    return null;
  }

  const fragment = range.cloneContents();
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(fragment);

  return tempDiv.innerHTML;
}

/**
 * Generates HTML from ProseMirror fragment
 */
function generateHtmlFromFragment(fragment: ProseMirrorFragment): string {
  const htmlParts: string[] = [];

  fragment.content.forEach((node) => {
    const nodeHtml = nodeToHtml(node);
    if (nodeHtml) {
      htmlParts.push(nodeHtml);
    }
  });

  return htmlParts.join('');
}

/**
 * Extracts selected content as HTML with fallback strategies
 */
function extractSelectedHtml(editor: Editor): string {
  const selection = editor.state.selection;
  const { from, to, empty } = selection;

  // If selection is empty (cursor position), return empty
  if (empty) return '';

  try {
    // Method 1: Use browser's native selection API (most reliable)
    const browserHtml = getBrowserSelectionHtml(editor);
    if (browserHtml) {
      return browserHtml;
    }

    // Method 2: Extract fragment and manually generate HTML
    const selectedFragment = editor.state.doc.cut(from, to) as unknown as ProseMirrorFragment;
    return generateHtmlFromFragment(selectedFragment);
  } catch (error) {
    console.warn('Failed to extract selected HTML, using fallback:', error);

    // Final fallback: get text content only
    try {
      const selectedFragment = editor.state.doc.cut(from, to) as unknown as ProseMirrorFragment;
      const textContent = selectedFragment.textContent;
      return textContent ? `<p>${textContent}</p>` : '';
    } catch (fallbackError) {
      console.error('All selection methods failed:', fallbackError);
      return '';
    }
  }
}

/**
 * Custom hook for managing editor copy functionality
 * Handles HTML extraction from selected text and clipboard operations
 */
export function useEditorCopy(editor: Editor | null) {
  const editorElementRef = useRef<HTMLElement | null>(null);

  // Get selected HTML for copy handler
  const getSelectedHtml = useCallback(() => {
    if (!editor) return '';
    return extractSelectedHtml(editor);
  }, [editor]);

  // Update editor element reference
  useEffect(() => {
    const timer = setTimeout(() => {
      const editorElement = editor?.view?.dom;
      if (editorElement && editorElement instanceof HTMLElement) {
        editorElementRef.current = editorElement;
      }
    }, EDITOR_ELEMENT_UPDATE_DELAY);

    return () => clearTimeout(timer);
  }, [editor]);

  // Apply copy handler
  useCopyHandler(getSelectedHtml, editorElementRef.current);

  return { editorElementRef, getSelectedHtml };
}
