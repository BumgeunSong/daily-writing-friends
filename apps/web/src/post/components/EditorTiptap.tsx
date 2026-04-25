import { useImperativeHandle, forwardRef, useEffect } from 'react';
import { useEditorCopy } from '@/post/hooks/useEditorCopy';
import { useTiptapEditor } from '@/post/hooks/useTiptapEditor';
import { useTiptapImageUpload } from '@/post/hooks/useTiptapImageUpload';
import type { ProseMirrorDoc } from '@/post/model/Post';
import { CopyErrorBoundary } from './CopyErrorBoundary';
import { EditorContentArea } from './EditorContentArea';
import { ResponsiveEditorToolbar } from './ResponsiveEditorToolbar';
import { UploadProgress } from './UploadProgress';
import { useIsMobile } from '../../shared/hooks/useWindowSize';

interface EditorTiptapProps {
  initialHtml?: string;
  initialJson?: ProseMirrorDoc;
  onChange: (output: { html: string; json: ProseMirrorDoc }) => void;
  placeholder?: string;
  onUploadingChange?: (isUploading: boolean) => void;
}

export interface EditorTiptapHandle {
  focus: () => void;
}

/**
 * TipTap Editor Component
 * A rich text editor with image upload support and responsive toolbar
 */
export const EditorTiptap = forwardRef<EditorTiptapHandle, EditorTiptapProps>(
  ({ initialHtml, initialJson, onChange, placeholder = '내용을 입력하세요...', onUploadingChange }, ref) => {
    // Initialize editor with custom configuration
    const editor = useTiptapEditor({
      initialHtml,
      initialJson,
      onChange,
      placeholder,
    });

    // Image upload functionality
    const { openFilePicker, handlePaste, handleDrop, isUploading, uploadProgress } = useTiptapImageUpload({
      editor,
    });

    // Expose upload state to parent for submit button control
    useEffect(() => {
      onUploadingChange?.(isUploading);
    }, [isUploading, onUploadingChange]);

    // Copy functionality
    useEditorCopy(editor);

    // Handle paste and drop events for images
    // Must use a timer to wait for editor.view.dom — editorElementRef.current is set
    // asynchronously and mutating a ref doesn't trigger useEffect re-runs
    useEffect(() => {
      if (!editor) return;

      const timer = setTimeout(() => {
        const editorElement = editor.view?.dom;
        if (!editorElement) return;

        const handleEditorPaste = async (event: ClipboardEvent) => {
          await handlePaste(event);
        };

        const handleEditorDrop = async (event: DragEvent) => {
          await handleDrop(event);
        };

        editorElement.addEventListener('paste', handleEditorPaste);
        editorElement.addEventListener('drop', handleEditorDrop);

        // Store cleanup functions on the element for the effect cleanup
        (editorElement as any).__cleanupImageHandlers = () => {
          editorElement.removeEventListener('paste', handleEditorPaste);
          editorElement.removeEventListener('drop', handleEditorDrop);
        };
      }, 150);

      return () => {
        clearTimeout(timer);
        const editorElement = editor.view?.dom;
        (editorElement as any)?.__cleanupImageHandlers?.();
      };
    }, [editor, handlePaste, handleDrop]);

    // Expose focus method
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editor?.commands.focus();
        },
      }),
      [editor],
    );

    // 윈도우 크기 변경을 실시간으로 감지하여 모바일 여부 판단
    const isMobile = useIsMobile(768);

    if (!editor) {
      return null;
    }

    return (
      <CopyErrorBoundary>
        <div className='relative w-full'>
          {/* Desktop toolbar at top */}
          <div className='hidden md:block'>
            <ResponsiveEditorToolbar editor={editor} onImageUpload={openFilePicker} />
          </div>

          {/* Editor content area */}
          <EditorContentArea editor={editor} isMobile={isMobile} />

          {/* Upload progress overlay */}
          <UploadProgress isUploading={isUploading} uploadProgress={uploadProgress} />

          {/* Mobile toolbar at bottom */}
          <div className='md:hidden'>
            <ResponsiveEditorToolbar editor={editor} onImageUpload={openFilePicker} />
          </div>
        </div>
      </CopyErrorBoundary>
    );
  },
);

EditorTiptap.displayName = 'EditorTiptap';
