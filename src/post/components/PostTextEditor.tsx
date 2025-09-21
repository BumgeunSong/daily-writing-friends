import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import ReactQuill, { Quill as ReactQuillQuill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useCopyHandler } from '@/post/hooks/useCopyHandler';
import { useImageUploadDialog } from '@/post/hooks/useImageUploadDialog';
import { CopyErrorBoundary } from './CopyErrorBoundary';
import { ImageUploadDialog } from './ImageUploadDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

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
  overflow-x: hidden;
  word-wrap: break-word;
}

/* Placeholder styling for both light and dark modes */
.ql-editor.ql-blank::before {
  color: hsl(var(--muted-foreground));
  opacity: 0.5;
  left: 0;
  right: auto;
  padding-left: 0;
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

.ql-snow .ql-tooltip {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.ql-snow .ql-tooltip[data-mode=link]::before {
  content: "링크 입력:";
}

.ql-snow .ql-tooltip.ql-editing a.ql-action::after {
  border-right: 0px;
  content: '저장';
  padding-right: 0px;
}

.ql-snow .ql-tooltip[data-mode=link] a.ql-action::after {
  content: '편집';
}

.ql-snow .ql-tooltip a.ql-remove::before {
  content: '제거';
}

/* Toolbar styles */
.ql-snow .ql-toolbar button:hover .ql-fill,
.ql-snow .ql-toolbar button:focus .ql-fill,
.ql-snow .ql-toolbar button.ql-active .ql-fill,
.ql-snow .ql-toolbar .ql-picker-label:hover .ql-fill,
.ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-fill,
.ql-snow .ql-toolbar .ql-picker-item:hover .ql-fill,
.ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-fill {
  fill: hsl(var(--primary));
}

.ql-snow .ql-toolbar button:hover .ql-stroke,
.ql-snow .ql-toolbar button:focus .ql-stroke,
.ql-snow .ql-toolbar button.ql-active .ql-stroke,
.ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke,
.ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
.ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke,
.ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke {
  stroke: hsl(var(--primary));
}

/* Header dropdown styling consistency */
.ql-snow .ql-picker-label {
  color: hsl(var(--foreground)) !important;
  border: none !important;
}

.ql-snow .ql-picker-options {
  background-color: hsl(var(--background)) !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.ql-snow .ql-picker-item {
  color: hsl(var(--foreground)) !important;
}

/* Custom video button styles */
.ql-snow .ql-toolbar button.ql-video::before {
  content: '\u25B6'; /* Play symbol */
  font-size: 14px;
}

.ql-snow .ql-toolbar button.ql-video {
  width: 28px;
  height: 28px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .ql-snow {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }

  .ql-snow .ql-toolbar {
    background-color: hsl(var(--background));
    border-bottom: 1px solid hsl(var(--border));
  }

  .ql-snow .ql-stroke {
    stroke: hsl(var(--foreground));
  }

  .ql-snow .ql-fill {
    fill: hsl(var(--foreground));
  }

  .ql-snow .ql-picker-options {
    background-color: hsl(var(--background)) !important;
    border: none !important;
  }

  .ql-snow .ql-picker-label {
    color: hsl(var(--foreground)) !important;
  }

  .ql-snow .ql-picker-item {
    color: hsl(var(--foreground)) !important;
  }

  /* Placeholder in dark mode */
  .ql-editor.ql-blank::before {
    color: hsl(var(--muted-foreground));
    opacity: 0.5;
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .ql-container {
    margin: 1rem -1rem;
    border-radius: 0;
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
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const insertImage = useCallback((url: string) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);
      editor.insertEmbed(range.index, 'image', url, 'user');
      editor.setSelection(range.index + 1);
    }
  }, []);

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
  } = useImageUploadDialog({ insertImage });

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'list',
    'link',
    'image',
  ];

  // Memoize image handler for stable reference
  const imageHandlerRef = useRef(() => {
    openImageDialog();
  });

  // Video handler for inserting video markdown
  const videoHandlerRef = useRef(() => {
    setVideoDialogOpen(true);
  });

  const handleVideoInsert = useCallback(() => {
    if (quillRef.current && videoUrl.trim()) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);
      const markdown = `\n[video](${videoUrl.trim()})\n`;
      editor.insertText(range.index, markdown, 'user');
      editor.setSelection(range.index + markdown.length);
      setVideoUrl('');
      setVideoDialogOpen(false);
    }
  }, [videoUrl]);

  // Update handlers when hooks change
  useEffect(() => {
    imageHandlerRef.current = () => openImageDialog();
  }, [openImageDialog]);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image', 'video'],
        ],
        handlers: {
          image: () => imageHandlerRef.current(),
          video: () => videoHandlerRef.current(),
        },
      },
    }),
    [], // No dependencies - stable object identity
  );

  useEffect(() => {
    // Add styles (check if already added)
    if (!document.querySelector('#quill-styles')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'quill-styles';
      styleTag.textContent = quillStyles;
      document.head.appendChild(styleTag);
    }

    // Add editor reference to handle with copy functionality
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const editorElement = editor.root;
      editorElementRef.current = editorElement as HTMLElement;
    }
  }, []);

  // Copy handler with selection
  const getSelectedHtml = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) return '';

    const range = selection.getRangeAt(0);
    const clonedSelection = range.cloneContents();
    const div = document.createElement('div');
    div.appendChild(clonedSelection);
    return div.innerHTML;
  }, []);

  useCopyHandler(getSelectedHtml, editorElementRef.current);

  return (
    <CopyErrorBoundary>
      <div className='relative w-full space-y-2'>
        <div className='w-full rounded-xl border-0 bg-background'>
          <ReactQuill
            ref={quillRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            theme='snow'
            modules={modules}
            formats={formats}
            className='prose prose-lg prose-slate w-full max-w-none dark:prose-invert prose-h1:text-3xl prose-h1:font-semibold prose-h2:text-2xl prose-h2:font-semibold'
          />
        </div>
      </div>

      <ImageUploadDialog
        isOpen={isDialogOpen}
        onOpenChange={closeDialog}
        onSelectFiles={selectFiles}
        maxFilesAlert={maxFilesAlert}
        onMaxFilesConfirm={handleMaxFilesConfirm}
        onMaxFilesCancel={handleMaxFilesCancel}
        onClose={closeDialog}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        uploadComplete={uploadComplete}
      />

      {/* Video Embed Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>동영상 첨부</DialogTitle>
            <DialogDescription>YouTube 동영상 링크만 가능해요.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Input
                id='video-url'
                type='url'
                placeholder='https://www.youtube.com/watch?v=...'
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && videoUrl.trim()) {
                    e.preventDefault();
                    handleVideoInsert();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                setVideoUrl('');
                setVideoDialogOpen(false);
              }}
            >
              취소
            </Button>
            <Button type='button' onClick={handleVideoInsert} disabled={!videoUrl.trim()}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CopyErrorBoundary>
  );
}
