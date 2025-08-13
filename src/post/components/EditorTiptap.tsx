import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Dropcursor from '@tiptap/extension-dropcursor';
import { Progress } from '@/shared/ui/progress';
import { sanitize } from '@/post/utils/sanitizeHtml';
import { useTiptapImageUpload } from '@/post/hooks/useTiptapImageUpload';
import { useCopyHandler } from '@/post/hooks/useCopyHandler';
import { StickyToolbar } from './StickyToolbar';
import { CopyErrorBoundary } from './CopyErrorBoundary';

interface EditorTiptapProps {
  initialHtml?: string;
  initialJson?: any;
  onChange: (output: { html: string; json: any }) => void;
  placeholder?: string;
}

export interface EditorTiptapHandle {
  focus: () => void;
}

export const EditorTiptap = forwardRef<EditorTiptapHandle, EditorTiptapProps>(
  ({ initialHtml, initialJson, onChange, placeholder = '내용을 입력하세요...' }, ref) => {
    const editorElementRef = useRef<HTMLElement | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout>();

    // Initialize TipTap editor
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          // Disable features we don't want
          codeBlock: false,
          code: false,
          horizontalRule: false,
          // Configure heading to only allow h1 and h2
          heading: {
            levels: [1, 2],
          },
        }),
        Link.configure({
          openOnClick: true,
          autolink: true,
          defaultProtocol: 'https',
          protocols: ['http', 'https'],
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer',
          },
          validate: href => /^https?:\/\//.test(href),
        }),
        Image.configure({
          HTMLAttributes: {
            class: 'max-w-full h-auto rounded-lg',
          },
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: 'is-editor-empty',
        }),
        Dropcursor.configure({
          color: '#6B7280',
        }),
      ],
      content: initialJson || initialHtml || '',
      editorProps: {
        attributes: {
          class: 'prose prose-lg max-w-none min-h-[300px] focus:outline-none px-0 py-6',
        },
        handlePaste: (view, event) => {
          // Check if clipboard contains image
          const items = event.clipboardData?.items;
          if (!items) return false;

          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              // Will be handled by our custom paste handler
              return false;
            }
          }
          return false; // Let TipTap handle other paste events
        },
      },
      onUpdate: ({ editor }) => {
        // Debounce onChange calls
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          const html = sanitize(editor.getHTML());
          const json = editor.getJSON();
          onChange({ html, json });
        }, 300);
      },
    });

    // Image upload hook
    const { openFilePicker, handlePaste, isUploading, uploadProgress } = useTiptapImageUpload({
      editor,
    });

    // Handle paste events for images
    useEffect(() => {
      const handleEditorPaste = async (event: ClipboardEvent) => {
        await handlePaste(event);
      };

      const editorElement = editorElementRef.current;
      if (editorElement) {
        editorElement.addEventListener('paste', handleEditorPaste);
        return () => {
          editorElement.removeEventListener('paste', handleEditorPaste);
        };
      }
    }, [handlePaste]);

    // Get selected HTML for copy handler
    const getSelectedHtml = useCallback(() => {
      if (!editor) return '';

      const { from, to } = editor.state.selection;
      
      // If nothing is selected, return empty
      if (from === to) return '';

      // Get HTML of selection
      const selectedNode = editor.state.doc.cut(from, to);
      const tempEditor = document.createElement('div');
      
      // Convert ProseMirror node to HTML
      const html = editor.storage.html || editor.getHTML();
      
      // For now, fallback to full HTML if we can't get selection
      // This can be improved with a proper ProseMirror serializer
      return html;
    }, [editor]);

    // Update editor element reference
    useEffect(() => {
      const timer = setTimeout(() => {
        const editorElement = editor?.view?.dom;
        if (editorElement && editorElement instanceof HTMLElement) {
          editorElementRef.current = editorElement;
        }
      }, 100);

      return () => clearTimeout(timer);
    }, [editor]);

    // Apply copy handler
    useCopyHandler(getSelectedHtml, editorElementRef.current);

    // Cleanup debounce timer
    useEffect(() => {
      return () => {
        clearTimeout(debounceTimerRef.current);
      };
    }, []);

    // Expose focus method
    useImperativeHandle(ref, () => ({
      focus: () => {
        editor?.commands.focus();
      },
    }), [editor]);

    if (!editor) {
      return null;
    }

    return (
      <CopyErrorBoundary>
        <div className="relative w-full">
          {/* Editor content with bottom padding for sticky toolbar */}
          <div className="w-full rounded-xl border-0 bg-background pb-20">
            <EditorContent editor={editor} />
          </div>

          {/* Upload progress overlay */}
          {isUploading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
              <div className="w-4/5 max-w-md space-y-3 p-4">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-center text-sm font-medium text-foreground">
                  이미지 업로드 중... {uploadProgress}%
                </p>
              </div>
            </div>
          )}

          {/* Sticky toolbar at bottom */}
          <StickyToolbar editor={editor} onImageUpload={openFilePicker} />
        </div>
      </CopyErrorBoundary>
    );
  }
);

EditorTiptap.displayName = 'EditorTiptap';

// Add global styles for TipTap
const tiptapStyles = `
/* Placeholder styles */
.ProseMirror p.is-editor-empty:first-child::before {
  color: hsl(var(--muted-foreground));
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  opacity: 0.7;
}

/* Focus and selection styles */
.ProseMirror:focus {
  outline: none;
}

.ProseMirror ::selection {
  background-color: hsl(var(--selection));
}

/* Typography adjustments to match Quill */
.ProseMirror {
  font-family: var(--font-sans);
  font-size: 1.125rem;
  line-height: 1.5;
  color: hsl(var(--foreground));
}

.ProseMirror p {
  margin-bottom: 0.5rem;
}

.ProseMirror p:last-child {
  margin-bottom: 0;
}

.ProseMirror strong {
  font-weight: 600;
}

.ProseMirror a {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.ProseMirror a:hover {
  color: hsl(var(--primary) / 0.8);
}

.ProseMirror h1 {
  font-size: 1.875rem;
  font-weight: 600;
  margin-top: 2.5rem;
  margin-bottom: 1.5rem;
}

.ProseMirror h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1.25rem;
}

.ProseMirror blockquote {
  border-left: 3px solid hsl(var(--border));
  margin: 1.5rem 0;
  padding-left: 1rem;
  font-style: italic;
}

.ProseMirror ul,
.ProseMirror ol {
  padding-left: 1.5rem;
  margin: 1rem 0;
}

.ProseMirror li {
  margin: 0.25rem 0;
}

.ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

/* Mobile-specific adjustments */
@media (max-width: 640px) {
  .ProseMirror {
    font-size: 1rem;
  }
  
  .ProseMirror h1 {
    font-size: 1.5rem;
  }
  
  .ProseMirror h2 {
    font-size: 1.25rem;
  }
}
`;

// Inject styles when component mounts
if (typeof document !== 'undefined') {
  const styleElement = document.getElementById('tiptap-styles');
  if (!styleElement) {
    const style = document.createElement('style');
    style.id = 'tiptap-styles';
    style.textContent = tiptapStyles;
    document.head.appendChild(style);
  }
}