import { useCallback, useEffect, useRef, useState } from 'react';
import type { NativeEditorState, TextFormatter } from '../types/nativeEditor';
import { useTextFormatter } from './useTextFormatter';
import { useImageHandler } from './useImageHandler';

interface UseNativeTextEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onSave?: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export function useNativeTextEditor({
  initialContent = '',
  onContentChange,
  onSave,
  placeholder = 'Start writing...',
  disabled = false,
  autoSave = false,
  autoSaveDelay = 1000,
}: UseNativeTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState(initialContent);
  const [isComposing, setIsComposing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isComposingRef = useRef(false);
  
  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Content change handler with Korean IME support
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
    onContentChange?.(newContent);

    // Handle auto-save
    if (autoSave && onSave) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      autoSaveTimerRef.current = setTimeout(() => {
        onSave(newContent);
        setIsDirty(false);
      }, autoSaveDelay);
    }
  }, [onContentChange, onSave, autoSave, autoSaveDelay]);

  // Initialize text formatter
  const formatter = useTextFormatter({
    textareaRef,
    content,
    onContentChange: handleContentChange,
  });

  // Initialize image handler
  const imageHandler = useImageHandler({
    textareaRef,
    content,
    onContentChange: handleContentChange,
  });

  // Korean IME event handlers - simplified approach
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
    isComposingRef.current = false;
    
    // Let the next onChange event handle the final value
    // No need to force update here as onChange will fire
  }, []);

  // Simplified input handler - let React handle everything naturally
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleContentChange(e.target.value);
  }, [handleContentChange]);

  // Paste handler
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Handle image paste first
    imageHandler.handlePaste(e.nativeEvent);
    
    // Let the default paste behavior work for text (if not image)
    if (!isComposing) {
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          handleContentChange(textarea.value);
        }
      }, 0);
    }
  }, [isComposing, handleContentChange, imageHandler]);

  // Focus management
  const focus = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const blur = useCallback(() => {
    textareaRef.current?.blur();
  }, []);

  // Save handler
  const save = useCallback(() => {
    if (onSave) {
      onSave(content);
      setIsDirty(false);
      
      // Clear auto-save timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    }
  }, [content, onSave]);

  // Keyboard shortcut handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't handle shortcuts during Korean IME composition
    if (isComposing) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

    if (ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          formatter.toggleBold();
          break;
        case 'i':
          e.preventDefault();
          formatter.toggleItalic();
          break;
        case 's':
          e.preventDefault();
          save();
          break;
        case 'z':
          // Let browser handle undo/redo for textarea
          break;
        default:
          break;
      }
    }

    // Handle Enter key for auto-list continuation
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.substring(0, cursorPos);
      const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
      const currentLine = textBeforeCursor.substring(lastNewlineIndex + 1);

      // Check if current line is a list item
      const bulletMatch = currentLine.match(/^(\s*)([-*+])\s/);
      const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s/);

      if (bulletMatch && currentLine.trim() === bulletMatch[0].trim()) {
        // Empty bullet item - remove it
        e.preventDefault();
        const newContent = content.substring(0, lastNewlineIndex + 1) + 
                          content.substring(cursorPos);
        handleContentChange(newContent);
        setTimeout(() => {
          textarea.setSelectionRange(lastNewlineIndex + 1, lastNewlineIndex + 1);
        }, 0);
      } else if (orderedMatch && currentLine.trim() === orderedMatch[0].trim()) {
        // Empty ordered item - remove it
        e.preventDefault();
        const newContent = content.substring(0, lastNewlineIndex + 1) + 
                          content.substring(cursorPos);
        handleContentChange(newContent);
        setTimeout(() => {
          textarea.setSelectionRange(lastNewlineIndex + 1, lastNewlineIndex + 1);
        }, 0);
      } else if (bulletMatch) {
        // Continue bullet list
        e.preventDefault();
        const indent = bulletMatch[1];
        const bullet = bulletMatch[2];
        const newListItem = `\n${indent}${bullet} `;
        const newContent = content.substring(0, cursorPos) + 
                          newListItem + 
                          content.substring(cursorPos);
        handleContentChange(newContent);
        setTimeout(() => {
          const newPos = cursorPos + newListItem.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
      } else if (orderedMatch) {
        // Continue ordered list
        e.preventDefault();
        const indent = orderedMatch[1];
        const nextNumber = parseInt(orderedMatch[2]) + 1;
        const newListItem = `\n${indent}${nextNumber}. `;
        const newContent = content.substring(0, cursorPos) + 
                          newListItem + 
                          content.substring(cursorPos);
        handleContentChange(newContent);
        setTimeout(() => {
          const newPos = cursorPos + newListItem.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
      }
    }
  }, [isComposing, formatter, content, handleContentChange, save]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Update content when initialContent changes
  useEffect(() => {
    if (initialContent !== content && !isDirty) {
      setContent(initialContent);
    }
  }, [initialContent, content, isDirty]);

  const editorState: NativeEditorState = {
    content,
    isComposing,
    selection: {
      start: textareaRef.current?.selectionStart || 0,
      end: textareaRef.current?.selectionEnd || 0,
      text: textareaRef.current?.value.substring(
        textareaRef.current?.selectionStart || 0,
        textareaRef.current?.selectionEnd || 0
      ) || '',
      isEmpty: (textareaRef.current?.selectionStart || 0) === (textareaRef.current?.selectionEnd || 0),
    },
    formatState: formatter.getFormatState(),
    isUploading: imageHandler.isUploading,
    uploadProgress: imageHandler.uploadProgress,
  };

  return {
    // Refs
    textareaRef,
    
    // State
    editorState,
    content,
    isComposing,
    isDirty,
    
    // Text formatter
    formatter,
    
    // Image handler
    imageHandler,
    
    // Event handlers
    handleInput,
    handleCompositionStart,
    handleCompositionEnd,
    handlePaste,
    handleKeyDown,
    
    // Actions
    focus,
    blur,
    save,
    
    // Props for textarea - keep controlled but let composition events handle sync
    textareaProps: {
      ref: textareaRef,
      value: content,
      onChange: handleInput,
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
      onPaste: handlePaste,
      onKeyDown: handleKeyDown,
      placeholder,
      disabled,
      spellCheck: true,
      autoComplete: 'off',
      autoCorrect: 'off',
      autoCapitalize: 'sentences',
    },
  };
}