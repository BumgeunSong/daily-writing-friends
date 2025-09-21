import { useRef, useState, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Hooks
import { useCopyHandler } from '@/post/hooks/useCopyHandler';
import { useImageUploadDialog } from '@/post/hooks/useImageUploadDialog';
import { useQuillConfig } from '@/post/hooks/useQuillConfig';
import { useEditorOperations } from '@/post/hooks/useEditorOperations';
import { useEditorStyles } from '@/post/hooks/useEditorStyles';

// Components
import { CopyErrorBoundary } from './CopyErrorBoundary';
import { ImageUploadDialog } from './ImageUploadDialog';
import { VideoEmbedDialog } from './VideoEmbedDialog';

// Types
import type { PostTextEditorProps, VideoDialogState } from '@/post/types/editor';

const DEFAULT_PLACEHOLDER = '내용을 입력하세요...';

const EDITOR_CLASS_NAMES = [
  'prose',
  'prose-lg',
  'prose-slate',
  'w-full',
  'max-w-none',
  'dark:prose-invert',
  'prose-h1:text-3xl',
  'prose-h1:font-semibold',
  'prose-h2:text-2xl',
  'prose-h2:font-semibold',
].join(' ');

export function PostTextEditor({
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
}: PostTextEditorProps) {
  // Refs
  const quillRef = useRef<ReactQuill>(null);

  // State
  const [videoDialog, setVideoDialog] = useState<VideoDialogState>({
    isOpen: false,
    url: '',
  });

  // Load editor styles
  useEditorStyles();

  // Editor operations
  const { insertImage, insertVideo, getSelectedHtml, getEditorElement } =
    useEditorOperations({ quillRef });

  // Image upload functionality
  const imageUploadDialog = useImageUploadDialog({ insertImage });

  // Dialog handlers
  const handleImageDialogOpen = useCallback(() => {
    imageUploadDialog.openDialog();
  }, [imageUploadDialog]);

  const handleVideoDialogOpen = useCallback(() => {
    setVideoDialog(prev => ({ ...prev, isOpen: true }));
  }, []);

  const handleVideoDialogClose = useCallback(() => {
    setVideoDialog({ isOpen: false, url: '' });
  }, []);

  const handleVideoInsert = useCallback((url: string) => {
    insertVideo(url);
    handleVideoDialogClose();
  }, [insertVideo, handleVideoDialogClose]);

  // Quill configuration
  const { modules, formats } = useQuillConfig({
    onImageInsert: handleImageDialogOpen,
    onVideoInsert: handleVideoDialogOpen,
  });

  // Copy functionality
  useCopyHandler(getSelectedHtml, getEditorElement());

  return (
    <CopyErrorBoundary>
      <div className="relative w-full space-y-2">
        <div className="w-full rounded-xl border-0 bg-background">
          <ReactQuill
            ref={quillRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            theme="snow"
            modules={modules}
            formats={formats}
            className={EDITOR_CLASS_NAMES}
          />
        </div>
      </div>

      {/* Image Upload Dialog */}
      <ImageUploadDialog
        isOpen={imageUploadDialog.isOpen}
        onOpenChange={imageUploadDialog.closeDialog}
        onSelectFiles={imageUploadDialog.selectFiles}
        onClose={imageUploadDialog.closeDialog}
        maxFilesAlert={imageUploadDialog.maxFilesAlert}
        onMaxFilesConfirm={imageUploadDialog.handleMaxFilesConfirm}
        onMaxFilesCancel={imageUploadDialog.handleMaxFilesCancel}
        isUploading={imageUploadDialog.isUploading}
        uploadProgress={imageUploadDialog.uploadProgress}
        uploadComplete={imageUploadDialog.uploadComplete}
      />

      {/* Video Embed Dialog */}
      <VideoEmbedDialog
        isOpen={videoDialog.isOpen}
        onOpenChange={handleVideoDialogClose}
        onVideoInsert={handleVideoInsert}
      />
    </CopyErrorBoundary>
  );
}