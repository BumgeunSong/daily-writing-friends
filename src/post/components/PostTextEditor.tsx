import { useEffect, useRef, useMemo, useCallback } from 'react';
import ReactQuill, { Quill as ReactQuillQuill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useCopyHandler } from '@/post/hooks/useCopyHandler';
import { useImageUploadDialog } from '@/post/hooks/useImageUploadDialog';
import { useVideoEmbedDialog } from '@/post/hooks/useVideoEmbedDialog';
import { CopyErrorBoundary } from './CopyErrorBoundary';
import { ImageUploadDialog } from './ImageUploadDialog';
import { VideoBlot } from '../quill-register';
import { VideoEmbedDialog } from './VideoEmbedDialog';

interface PostTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const quillStyles = `
/* Z-index values for consistent layering */
:root {
  --z-toolbar-sticky: 50;
  --z-video-selection: 60;
}

.ql-container {
  font-family: var(--font-sans);
  font-size: 1.125rem;
  line-height: 1.5;
  min-height: 300px;
  width: 100%;
  max-width: none;
}

.ql-editor {
  padding: 1.5rem 1.5rem 1.5rem 0;
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));
  width: 100%;
  max-width: none;
  border: none !important;
  overflow-x: hidden;
  word-wrap: break-word;
}

.ql-editor p {
  margin-bottom: 0.5rem;
}

/* Ensure consistent paragraph spacing for better copy-paste behavior */
.ql-editor p:last-child {
  margin-bottom: 0;
}

.ql-editor strong {
  font-weight: 600;
}

.ql-editor a {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.ql-editor a:hover {
  color: hsl(var(--primary) / 0.8);
}

/* Updated heading styles */
.ql-editor h1 {
  font-size: 1.875rem;
  font-weight: 600;
  margin-top: 2.5rem;
  margin-bottom: 1.5rem;
}

.ql-editor h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1.25rem;
}

/* Remove all borders from Quill components */
.ql-toolbar,
.ql-toolbar.ql-snow {
  position: sticky;
  top: 0;
  z-index: var(--z-toolbar-sticky);
  border: none !important;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  background-color: hsl(var(--background));
  padding: 0.75rem 0;
}

.ql-container,
.ql-container.ql-snow {
  border: none !important;
  border-bottom-left-radius: 0.75rem;
  border-bottom-right-radius: 0.75rem;
}

.ql-toolbar button {
  height: 2.5rem;
  width: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  color: hsl(var(--foreground) / 0.5);
}

.ql-toolbar button svg .ql-stroke,
.ql-toolbar button svg .ql-fill {
  stroke: hsl(var(--foreground) / 0.5);
  fill: hsl(var(--foreground) / 0.5);
}

.ql-toolbar button:hover {
  background-color: hsl(var(--selection) / 0.6);
  color: hsl(var(--foreground));
}

.ql-toolbar button:hover svg .ql-stroke,
.ql-toolbar button:hover svg .ql-fill {
  stroke: hsl(var(--foreground));
  fill: hsl(var(--foreground));
}

.ql-toolbar .ql-active {
  background-color: hsl(var(--selection));
  color: hsl(var(--foreground));
}

.ql-toolbar .ql-active svg .ql-stroke,
.ql-toolbar .ql-active svg .ql-fill {
  stroke: hsl(var(--foreground));
  fill: hsl(var(--foreground));
}

/* Placeholder styling - 모바일 환경에서도 작동하도록 수정 */
.ql-editor.ql-blank::before {
  color: hsl(var(--muted-foreground));
  font-style: normal;
  pointer-events: none; /* 플레이스홀더가 터치 이벤트를 방해하지 않도록 함 */
  opacity: 0.7; /* 약간 투명하게 설정 */
  left: 0; /* Align placeholder with text content */
}

/* 포커스 상태나 터치 시 플레이스홀더 숨기기 */
.ql-container:focus-within .ql-editor.ql-blank::before,
.ql-editor.ql-blank:focus::before {
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* Matching prose styles - Important declarations to override Tailwind prose */
.ql-editor {
  max-width: none;
  font-size: 1.125rem !important;
  line-height: 1.5 !important;
}

/* Override Tailwind prose-lg line-height */
.prose-lg .ql-editor {
  line-height: 1.5 !important;
}

/* List styling */
.ql-editor ol,
.ql-editor ul {
  padding-left: 1.5rem;
}

.ql-editor li {
  padding-left: 0.5rem;
}

.ql-editor li.ql-indent-1 {
  padding-left: 1.5rem;
}

.ql-editor ol li:before,
.ql-editor ul li:before {
  left: -1.5rem;
}

/* Video Embed Styles */
.ql-video-thumb {
  margin: 0 auto !important;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease;
  position: relative;
  cursor: pointer;
  outline: none;
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* Override prose styles for video thumbnails */
.prose .ql-video-thumb,
.prose-lg .ql-video-thumb {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

.prose .ql-video-thumb img,
.prose-lg .ql-video-thumb img {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

.ql-video-thumb:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.ql-video-thumb:focus {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Video Editor Container */
.video-editor-container {
  position: relative !important;
  width: 100% !important;
  height: 0 !important; /* Required for padding-bottom trick */
  background-color: hsl(var(--muted));
  border-radius: 0.75rem;
  overflow: hidden;
  box-sizing: border-box !important;
}

/* Video Thumbnail */
.video-editor-thumbnail {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block;
}

/* Video Overlay */
.video-editor-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent, rgba(0, 0, 0, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.video-editor-play-button {
  width: 4rem;
  height: 4rem;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  backdrop-filter: blur(4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.ql-video-thumb:hover .video-editor-play-button {
  background-color: hsl(var(--primary));
  transform: scale(1.1);
}

.video-editor-timestamp {
  position: absolute;
  bottom: 0.75rem;
  left: 0.75rem;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  backdrop-filter: blur(4px);
}

/* Video Info */
.video-editor-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: white;
  padding: 2rem 1rem 1rem;
  backdrop-filter: blur(4px);
}

.video-editor-title {
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.25;
  margin-bottom: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-editor-caption {
  font-size: 0.75rem;
  opacity: 0.9;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Selection Frame */
.video-editor-selection-frame {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid hsl(var(--primary));
  border-radius: 0.75rem;
  z-index: var(--z-video-selection);
  pointer-events: none;
}

.video-editor-selection-frame::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: hsl(var(--primary) / 0.1);
  border-radius: 0.75rem;
}

/* Toolbar */
.video-editor-toolbar {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  pointer-events: auto;
}

.video-editor-btn {
  width: 2rem;
  height: 2rem;
  background-color: rgba(0, 0, 0, 0.8);
  border: none;
  border-radius: 0.25rem;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.video-editor-btn:hover {
  background-color: hsl(var(--primary));
  transform: scale(1.05);
}

.video-editor-btn:active {
  transform: scale(0.95);
}

.video-editor-btn--delete:hover {
  background-color: hsl(var(--destructive));
}

/* Mobile responsive adjustments */
@media (max-width: 640px) {
  .video-editor-play-button {
    width: 3rem;
    height: 3rem;
  }

  .video-editor-info {
    padding: 1.5rem 0.75rem 0.75rem;
  }

  .video-editor-toolbar {
    top: 0.25rem;
    right: 0.25rem;
    gap: 0.125rem;
  }

  .video-editor-btn {
    width: 1.75rem;
    height: 1.75rem;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .video-editor-container {
    background-color: hsl(var(--muted) / 0.5);
  }
}
`;


export function PostTextEditor({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
}: PostTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);
  const editorElementRef = useRef<HTMLElement | null>(null);


  const {
    isOpen: isDialogOpen,
    openDialog: openImageDialog,
    closeDialog: closeDialog,
    selectFiles,
    maxFilesAlert,
    handleMaxFilesConfirm,
    handleMaxFilesCancel,
    isUploading,
    uploadProgress,
    uploadComplete,
  } = useImageUploadDialog({
    insertImage: (url: string) => {
      const editor = quillRef.current?.getEditor();
      if (!editor) return;

      const range = editor.getSelection(true);
      const index = range?.index || editor.getLength() - 1;

      editor.insertEmbed(index, 'image', url);
      editor.insertText(index + 1, '\n');
      editor.setSelection(index + 2);
    }
  });

  const {
    isOpen: isVideoDialogOpen,
    openDialog: openVideoDialog,
    closeDialog: closeVideoDialog,
    isProcessing: isVideoProcessing,
    error: videoError,
    previewData: videoPreviewData,
    handleUrlSubmit: handleVideoUrlSubmit,
    handleInsertVideo,
    handleUrlPaste,
  } = useVideoEmbedDialog({
    insertVideo: (videoData) => {
      const editor = quillRef.current?.getEditor();
      if (!editor) return;

      const currentSelection = editor.getSelection();
      const contentLength = editor.getLength();
      const index = currentSelection?.index ?? Math.max(0, contentLength - 1);

      try {
        editor.insertEmbed(index, 'video-thumb', videoData, 'user');
        editor.insertText(index + 1, '\n', 'user');
        editor.setSelection(index + 2, 0, 'user');
      } catch (error) {
        console.error('Failed to insert video:', error);
      }
    }
  });  

  const formats = useMemo(() => [
    'bold', 'italic', 'underline', 'strike',
    'blockquote', 'header',
    'list', 'link', 'image', 'video-thumb'
  ], []);

  // Create stable handler functions using refs to avoid recreating modules
  const imageHandlerRef = useRef(() => {
    openImageDialog();
  });

  const videoHandlerRef = useRef(() => {
    openVideoDialog();
  });

  // Update handler refs when dialog functions change
  useEffect(() => {
    imageHandlerRef.current = () => openImageDialog();
    videoHandlerRef.current = () => openVideoDialog();
  }, [openImageDialog, openVideoDialog]);

  const modules = useMemo(
    () => {
      const moduleConfig = {
        toolbar: {
          container: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote'],
            [{ 'header': 1 }, { 'header': 2 }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image', 'video'],
          ],
          handlers: {
            image: () => imageHandlerRef.current(),
            video: () => videoHandlerRef.current(),
          },
        },
      };


      return moduleConfig;
    },
    [] // No dependencies - stable object identity
  );

  useEffect(() => {
    // Add custom video icon to toolbar (idempotent operation)
    const icons = ReactQuillQuill.import('ui/icons') as Record<string, string>;
    if (!icons['video']) {
      icons['video'] = `<svg viewBox="0 0 18 18">
        <rect class="ql-fill" x="2" y="4" width="14" height="10" rx="1"/>
        <polygon class="ql-stroke" points="7,7 7,11 11,9"/>
      </svg>`;
    }

    // Add styles (check if already added)
    if (!document.querySelector('#quill-video-styles')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'quill-video-styles';
      styleTag.textContent = quillStyles;
      document.head.appendChild(styleTag);
    }
  }, []);


  // 선택된 HTML을 가져오는 함수
  const getSelectedHtml = useCallback(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return '';
    
    const selection = editor.getSelection();
    if (!selection || selection.length === 0) return '';
    
    return editor.getSemanticHTML(selection.index, selection.length);
  }, []);

  // 에디터 요소 참조 업데이트
  useEffect(() => {
    const timer = setTimeout(() => {
      const editorElement = quillRef.current?.getEditor()?.root;
      if (editorElement) {
        editorElementRef.current = editorElement;
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // 커스텀 복사 핸들러 적용
  useCopyHandler(getSelectedHtml, editorElementRef.current);


  // Handle paste events for automatic YouTube URL detection
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;

      const pastedText = e.clipboardData.getData('text/plain');
      if (pastedText) {
        // Check if the pasted text contains a YouTube URL
        handleUrlPaste(pastedText).then((handled) => {
          if (handled) {
            // Prevent default paste behavior if we handled it
            e.preventDefault();
          }
        });
      }
    };

    const editorElement = editor.root;
    editorElement.addEventListener('paste', handlePaste);

    return () => {
      editorElement.removeEventListener('paste', handlePaste);
    };
  }, [handleUrlPaste]);

  // Handle video delete events
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const handleVideoDelete = (e: Event) => {
      const customEvent = e as CustomEvent;
      const node = customEvent.detail?.node;

      if (node) {
        const blot = editor.scroll.find(node);
        if (blot) {
          blot.remove();
        }
      }
    };

    document.addEventListener('video-delete', handleVideoDelete);

    return () => {
      document.removeEventListener('video-delete', handleVideoDelete);
    };
  }, []);


  return (
    <CopyErrorBoundary>
      <div className='relative w-full space-y-2'>
        <div className='w-full rounded-xl border-0 bg-background'>
          <ReactQuill
            ref={quillRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            theme="snow"
            modules={modules}
            formats={formats}
            className="prose prose-lg prose-slate w-full max-w-none dark:prose-invert prose-h1:text-3xl prose-h1:font-semibold prose-h2:text-2xl prose-h2:font-semibold"
          />
        </div>
      </div>

      <ImageUploadDialog
        isOpen={isDialogOpen}
        onOpenChange={closeDialog}
        onSelectFiles={selectFiles}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        uploadComplete={uploadComplete}
        maxFilesAlert={maxFilesAlert}
        onClose={closeDialog}
        onMaxFilesConfirm={handleMaxFilesConfirm}
        onMaxFilesCancel={handleMaxFilesCancel}
      />

      <VideoEmbedDialog
        isOpen={isVideoDialogOpen}
        onOpenChange={closeVideoDialog}
        onSubmit={handleVideoUrlSubmit}
        onInsert={handleInsertVideo}
        isProcessing={isVideoProcessing}
        error={videoError}
        previewData={videoPreviewData}
      />
    </CopyErrorBoundary>
  );
}

