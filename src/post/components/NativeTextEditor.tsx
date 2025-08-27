import { forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';
import type { NativeTextEditorProps } from '../types/nativeEditor';
import { useNativeTextEditor } from '../hooks/useNativeTextEditor';
import { NativeEditorToolbar } from './NativeEditorToolbar';

export const NativeTextEditor = forwardRef<HTMLTextAreaElement, NativeTextEditorProps>(
  ({
    initialContent,
    onSave,
    onImageUpload,
    variant = 'sticky',
    placeholder = 'Start writing...',
    disabled = false,
    autoFocus = false,
    className,
  }, ref) => {
    const {
      textareaRef,
      editorState,
      formatter,
      imageHandler,
      textareaProps,
      handlePaste,
    } = useNativeTextEditor({
      initialContent,
      onContentChange: (content) => {
        // Real-time content sync if needed
      },
      onSave,
      placeholder,
      disabled,
      autoSave: true,
      autoSaveDelay: 2000,
    });

    const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
      // Handle image drops through image handler
      imageHandler.handleDrop(e.nativeEvent);
      // Let default behavior handle text drops if no images
    };

    const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
      // Allow drop
      e.preventDefault();
    };

    const handleImageUploadClick = () => {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'image/*');
      input.setAttribute('multiple', '');
      input.click();

      input.onchange = () => {
        if (input.files) {
          imageHandler.handleFileSelect(input.files);
        }
      };
    };

    // Merge refs
    const mergedRef = (node: HTMLTextAreaElement | null) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      
      if (textareaRef) {
        textareaRef.current = node;
      }
    };

    const textareaClasses = cn(
      // Base textarea styles
      'w-full resize-none border-none outline-none bg-transparent',
      
      // Typography
      'font-sans text-base leading-relaxed',
      
      // Mobile optimizations
      'text-[16px]', // Prevents zoom on iOS
      
      // Spacing
      variant === 'sticky' ? 'min-h-[calc(100vh-200px)] p-4 pb-32' : 'min-h-[400px] p-4',
      
      // Disabled state
      disabled && 'opacity-60 cursor-not-allowed',
      
      // Custom className
      className
    );

    const containerClasses = cn(
      'relative w-full',
      variant === 'sticky' ? 'h-full' : 'border rounded-lg',
      disabled && 'pointer-events-none'
    );

    return (
      <div className={containerClasses}>
        {/* Toolbar */}
        <NativeEditorToolbar
          formatter={formatter}
          onImageUpload={handleImageUploadClick}
          variant={variant}
          formatState={editorState.formatState}
          disabled={disabled}
        />

        {/* Main textarea */}
        <textarea
          {...textareaProps}
          ref={mergedRef}
          className={textareaClasses}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          autoFocus={autoFocus}
          style={{
            // iOS specific fixes
            WebkitAppearance: 'none',
            WebkitBorderRadius: '0',
            transform: 'translateZ(0)', // Force hardware acceleration
          }}
        />

      </div>
    );
  }
);

NativeTextEditor.displayName = 'NativeTextEditor';