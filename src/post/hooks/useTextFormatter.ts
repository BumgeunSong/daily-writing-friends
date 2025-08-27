import { useCallback, useMemo } from 'react';
import type { TextFormatter, FormatState } from '../types/nativeEditor';
import { getSelection } from '../utils/textSelection';
import {
  detectFormatAtPosition,
  formatBoldText,
  formatItalicText,
  formatStrikeText,
  formatHeading,
  formatList,
  formatBlockquote,
  insertLink,
} from '../utils/markdownFormatter';

interface UseTextFormatterProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  onContentChange: (content: string) => void;
}

export function useTextFormatter({
  textareaRef,
  content,
  onContentChange,
}: UseTextFormatterProps): TextFormatter {
  const updateTextareaContent = useCallback((newText: string, newStart?: number, newEnd?: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.value = newText;
    onContentChange(newText);

    // Update cursor position if provided
    if (typeof newStart === 'number') {
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newStart, newEnd || newStart);
      }, 0);
    }
  }, [textareaRef, onContentChange]);

  const getCurrentFormatState = useCallback((): FormatState => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return {
        isBold: false,
        isItalic: false,
        isStrike: false,
        isHeading1: false,
        isHeading2: false,
        isBlockquote: false,
        isBulletList: false,
        isOrderedList: false,
        isLink: false,
      };
    }

    const position = textarea.selectionStart;
    const detected = detectFormatAtPosition(content, position);

    return {
      isBold: detected.isBold || false,
      isItalic: detected.isItalic || false,
      isStrike: detected.isStrike || false,
      isHeading1: detected.isHeading1 || false,
      isHeading2: detected.isHeading2 || false,
      isBlockquote: detected.isBlockquote || false,
      isBulletList: detected.isBulletList || false,
      isOrderedList: detected.isOrderedList || false,
      isLink: detected.isLink || false,
    };
  }, [textareaRef, content]);

  const formatter: TextFormatter = useMemo(() => ({
    // Format detection methods
    isBold: () => getCurrentFormatState().isBold,
    isItalic: () => getCurrentFormatState().isItalic,
    isStrike: () => getCurrentFormatState().isStrike,
    isHeading: (level?: 1 | 2) => {
      const state = getCurrentFormatState();
      if (level === 1) return state.isHeading1;
      if (level === 2) return state.isHeading2;
      return state.isHeading1 || state.isHeading2;
    },
    isBulletList: () => getCurrentFormatState().isBulletList,
    isOrderedList: () => getCurrentFormatState().isOrderedList,
    isBlockquote: () => getCurrentFormatState().isBlockquote,
    isLink: () => getCurrentFormatState().isLink,

    // Format action methods
    toggleBold: () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const selection = getSelection(textarea);
      const { newText, newStart, newEnd } = formatBoldText(
        content,
        selection.start,
        selection.end
      );
      
      updateTextareaContent(newText, newStart, newEnd);
    },

    toggleItalic: () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const selection = getSelection(textarea);
      const { newText, newStart, newEnd } = formatItalicText(
        content,
        selection.start,
        selection.end
      );
      
      updateTextareaContent(newText, newStart, newEnd);
    },

    toggleStrike: () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const selection = getSelection(textarea);
      const { newText, newStart, newEnd } = formatStrikeText(
        content,
        selection.start,
        selection.end
      );
      
      updateTextareaContent(newText, newStart, newEnd);
    },

    toggleHeading: (level: 1 | 2) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const position = textarea.selectionStart;
      const { newText, newPosition } = formatHeading(content, position, level);
      
      updateTextareaContent(newText, newPosition);
    },

    toggleBulletList: () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const position = textarea.selectionStart;
      const { newText, newPosition } = formatList(content, position, false);
      
      updateTextareaContent(newText, newPosition);
    },

    toggleOrderedList: () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const position = textarea.selectionStart;
      const { newText, newPosition } = formatList(content, position, true);
      
      updateTextareaContent(newText, newPosition);
    },

    toggleBlockquote: () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const position = textarea.selectionStart;
      const { newText, newPosition } = formatBlockquote(content, position);
      
      updateTextareaContent(newText, newPosition);
    },

    insertLink: (url: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const selection = getSelection(textarea);
      const { newText, newStart, newEnd } = insertLink(
        content,
        selection.start,
        selection.end,
        url
      );
      
      updateTextareaContent(newText, newStart, newEnd);
    },

    getFormatState: getCurrentFormatState,
  }), [textareaRef, content, onContentChange, getCurrentFormatState, updateTextareaContent]);

  return formatter;
}