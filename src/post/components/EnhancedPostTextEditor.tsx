import { useEffect, useRef, useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import { toast } from 'sonner';
import 'react-quill-new/dist/quill.snow.css';
import { useImageUpload } from '@/post/hooks/useImageUpload';
import { useCopyHandler } from '@/post/hooks/useCopyHandler';
import { useQuillPasteHandler } from '@/post/hooks/useQuillPasteHandler';
import { CopyErrorBoundary } from './CopyErrorBoundary';
import { QuillStickyToolbar } from './QuillStickyToolbar';
import type { 
  EnhancedQuillProps, 
  QuillModulesConfig, 
  QuillFormat,
  QuillInstance 
} from '../types/quillEditor';

const enhancedQuillStyles = `
.enhanced-quill-editor {
  position: relative;
  width: 100%;
}

/* Hide default toolbar - we'll use our custom one */
.enhanced-quill-editor .ql-toolbar {
  display: none;
}

.enhanced-quill-editor .ql-container {
  font-family: var(--font-sans);
  font-size: 1.125rem;
  line-height: 1.5;
  min-height: 300px;
  width: 100%;
  max-width: none;
  border: none;
  border-radius: 0.75rem;
}

.enhanced-quill-editor .ql-editor {
  padding: 1.5rem;
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));
  width: 100%;
  max-width: none;
  border: none;
  border-radius: 0.75rem;
  min-height: 300px;
}

/* Mobile adjustments */
@media (max-width: 767px) {
  .enhanced-quill-editor .ql-editor {
    padding: 1rem;
    min-height: 400px; /* More space on mobile */
    padding-bottom: 120px; /* Space for sticky toolbar */
  }
}

.enhanced-quill-editor .ql-editor p {
  margin-bottom: 0.5rem;
}

.enhanced-quill-editor .ql-editor p:last-child {
  margin-bottom: 0;
}

.enhanced-quill-editor .ql-editor strong {
  font-weight: 600;
}

.enhanced-quill-editor .ql-editor a {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.enhanced-quill-editor .ql-editor a:hover {
  color: hsl(var(--primary) / 0.8);
}

/* Heading styles */
.enhanced-quill-editor .ql-editor h1 {
  font-size: 1.875rem;
  font-weight: 600;
  margin-top: 2.5rem;
  margin-bottom: 1.5rem;
}

.enhanced-quill-editor .ql-editor h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1.25rem;
}

/* Blockquote styles */
.enhanced-quill-editor .ql-editor blockquote {
  border-left: 4px solid hsl(var(--border));
  padding-left: 1rem;
  margin: 1.5rem 0;
  font-style: italic;
  color: hsl(var(--muted-foreground));
}

/* List styling */
.enhanced-quill-editor .ql-editor ol, 
.enhanced-quill-editor .ql-editor ul {
  padding-left: 1.5rem;
  margin: 1rem 0;
}

.enhanced-quill-editor .ql-editor li {
  padding-left: 0.5rem;
  margin-bottom: 0.25rem;
}

.enhanced-quill-editor .ql-editor li.ql-indent-1 {
  padding-left: 1.5rem;
}

/* Placeholder styling */
.enhanced-quill-editor .ql-editor.ql-blank::before {
  color: hsl(var(--muted-foreground));
  font-style: normal;
  pointer-events: none;
  opacity: 0.7;
  left: 1.5rem;
  right: 1.5rem;
}

@media (max-width: 767px) {
  .enhanced-quill-editor .ql-editor.ql-blank::before {
    left: 1rem;
    right: 1rem;
  }
}

/* Focus handling */
.enhanced-quill-editor .ql-container:focus-within .ql-editor.ql-blank::before,
.enhanced-quill-editor .ql-editor.ql-blank:focus::before {
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* Image styling */
.enhanced-quill-editor .ql-editor img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

/* Selection styling */
.enhanced-quill-editor .ql-editor ::selection {
  background-color: hsl(var(--primary) / 0.2);
}
`;

export function EnhancedPostTextEditor({ 
  value, 
  onChange, 
  placeholder = '내용을 입력하세요...',
  stickyToolbar = true,
}: EnhancedQuillProps) {
  const quillRef = useRef<QuillInstance>(null);
  const editorElementRef = useRef<HTMLElement | null>(null);

  // Image upload functionality
  const { imageHandler, isUploading, uploadProgress } = useImageUpload({ 
    insertImage: (url: string) => {
      const editor = quillRef.current?.getEditor();
      const range = editor?.getSelection(true);
      if (editor && range) {
        editor.insertEmbed(range.index, 'image', url);
        // Move cursor after the image
        editor.setSelection(range.index + 1);
      }
    } 
  });

  // Enhanced paste handler for images
  const handleImagePaste = useCallback(async (file: File) => {
    // Create a temporary input element to trigger our existing image handler
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    // Create a mock FileList
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;

    // Create a mock change event
    const changeEvent = new Event('change', { bubbles: true });
    Object.defineProperty(changeEvent, 'target', {
      value: input,
      enumerable: true,
    });

    // Trigger our existing image upload handler
    if (input.onchange) {
      input.onchange(changeEvent as any);
    }
  }, []);

  // Use paste handler
  useQuillPasteHandler({ 
    onImagePaste: handleImagePaste, 
    quillRef 
  });

  // Supported formats - keep it clean and focused
  const formats: QuillFormat[] = [
    'bold', 'italic', 'underline', 'strike',
    'blockquote', 'header',
    'list', 'link', 'image'
  ];

  // Quill modules configuration - hide default toolbar
  const modules: QuillModulesConfig = useMemo(
    () => ({
      toolbar: false, // We'll use our custom sticky toolbar
      clipboard: {
        matchVisual: false, // Preserve formatting when pasting
      },
    }),
    []
  );

  // Inject styles
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = enhancedQuillStyles;
    document.head.appendChild(styleTag);

    return () => {
      styleTag.remove();
    };
  }, []);

  // Get selected HTML for copy functionality
  const getSelectedHtml = useCallback(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return '';
    
    const selection = editor.getSelection();
    if (!selection || selection.length === 0) return '';
    
    return editor.getSemanticHTML(selection.index, selection.length);
  }, []);

  // Update editor element reference
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

  // Apply custom copy handler
  useCopyHandler(getSelectedHtml, editorElementRef.current);

  return (
    <CopyErrorBoundary>
      <div className="enhanced-quill-editor">
        {/* Custom Sticky Toolbar */}
        {stickyToolbar && (
          <QuillStickyToolbar
            quillRef={quillRef}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            onImageUpload={imageHandler}
          />
        )}

        {/* Quill Editor */}
        <div className="rounded-xl border bg-background">
          <ReactQuill
            ref={quillRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            theme="snow"
            modules={modules}
            formats={formats}
            className="prose prose-lg prose-slate w-full max-w-none dark:prose-invert"
          />
        </div>

        {/* Upload overlay for full-screen indication */}
        {isUploading && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
            <div className="w-4/5 max-w-md space-y-3 p-4 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm font-medium text-foreground">
                이미지 업로드 중... {uploadProgress}%
              </p>
            </div>
          </div>
        )}
      </div>
    </CopyErrorBoundary>
  );
}