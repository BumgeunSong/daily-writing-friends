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

      // Insert image
      editor.insertEmbed(index, 'image', url);

      // Add a newline after the image for easier editing
      editor.insertText(index + 1, '\n');

      // Move cursor to after the newline
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
      console.log('🎬 [VideoInsertion] Starting video insertion', { videoData });

      const editor = quillRef.current?.getEditor();
      if (!editor) {
        console.error('🎬 [VideoInsertion] No editor available');
        return;
      }

      // Get current selection or use end of content
      const currentSelection = editor.getSelection();
      const contentLength = editor.getLength();
      const index = currentSelection?.index ?? Math.max(0, contentLength - 1);

      console.log('🎬 [VideoInsertion] Insertion details', {
        currentSelection,
        contentLength,
        index
      });

      try {
        // Sanity checks before insertion
        const formats = editor.options.formats;
        console.log('🎬 [VideoInsertion] Editor formats:', formats);
        if (!formats?.includes('video-thumb')) {
          console.warn('🎬 [VideoInsertion] video-thumb not whitelisted; aborting');
          return;
        }

        const blotClass = ReactQuillQuill.import('formats/video-thumb');
        console.log('🎬 [VideoInsertion] Blot identity check:', blotClass === VideoBlot);
        console.log('🎬 [VideoInsertion] Blot name:', (blotClass as any)?.blotName);

        // Insert video embed
        console.log('🎬 [VideoInsertion] Inserting video embed');
        try {
          editor.insertEmbed(index, 'video-thumb', videoData, 'user');
          console.log('🎬 [VideoInsertion] insertEmbed completed successfully');
        } catch (embedError) {
          console.error('🎬 [VideoInsertion] insertEmbed failed:', embedError);
          throw embedError;
        }

        // Add a newline after the video for easier editing
        console.log('🎬 [VideoInsertion] Adding newline');
        editor.insertText(index + 1, '\n', 'user');

        // Set cursor position after the newline
        console.log('🎬 [VideoInsertion] Setting cursor position');
        editor.setSelection(index + 2, 0, 'user');

        console.log('🎬 [VideoInsertion] Video insertion completed successfully');

        // Critical probes: Check what actually happened
        const delta = editor.getContents();
        console.log('🎬 [VideoInsertion] Delta after insert:', delta.ops);
        console.log('🎬 [VideoInsertion] HTML after insert:', editor.root.innerHTML);

        // Probe: Check which blot type was actually inserted
        const lastOp = delta.ops[delta.ops.length - 2]; // -2 because last is the newline
        if (lastOp?.insert) {
          if (lastOp.insert['video-thumb']) {
            console.log('✅ [VideoInsertion] SUCCESS: video-thumb blot used', lastOp.insert['video-thumb']);
          } else if (lastOp.insert['video']) {
            console.warn('❌ [VideoInsertion] FALLBACK: built-in video blot used', lastOp.insert['video']);
          } else {
            console.warn('❓ [VideoInsertion] UNKNOWN: unexpected blot type', Object.keys(lastOp.insert));
          }
        } else {
          console.warn('❌ [VideoInsertion] No insert operation found in last op');
        }
      } catch (error) {
        console.error('🎬 [VideoInsertion] Failed to insert video:', error);
        if (error instanceof Error) {
          console.error('🎬 [VideoInsertion] Error details:', error.stack);
        }
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
    try {
      const icons = ReactQuillQuill.import('ui/icons') as Record<string, string>;
      if (!icons['video']) {
        console.log('🎬 [QuillSetup] Adding custom video icon');
        icons['video'] = `<svg viewBox="0 0 18 18">
          <rect class="ql-fill" x="2" y="4" width="14" height="10" rx="1"/>
          <polygon class="ql-stroke" points="7,7 7,11 11,9"/>
        </svg>`;
      }
    } catch (iconError) {
      console.warn('🎬 [QuillSetup] Could not set video icon:', iconError);
    }

    // Add styles (check if already added)
    if (!document.querySelector('#quill-video-styles')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'quill-video-styles';
      styleTag.textContent = quillStyles;
      document.head.appendChild(styleTag);

      console.log('🎬 [QuillSetup] Setup complete');
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

  // Debug: Add MutationObserver to detect iframe insertions
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'IFRAME') {
            const iframe = node as HTMLIFrameElement;
            console.warn('🚨 [IFRAME DETECTED]', {
              src: iframe.src,
              className: iframe.className,
              parent: iframe.parentElement?.className
            });
          }
        });
      });
    });

    observer.observe(editor.root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);

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

