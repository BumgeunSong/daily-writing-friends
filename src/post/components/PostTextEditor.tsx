import { useEffect, useRef, useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import { toast } from 'sonner';
import { Progress } from '@/shared/ui/progress';
import 'react-quill-new/dist/quill.snow.css';
import { useImageUpload } from '@/post/hooks/useImageUpload';
import { useCopyHandler } from '@/post/hooks/useCopyHandler';
import { CopyErrorBoundary } from './CopyErrorBoundary';

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
  const quillRef = useRef<any>(null);
  const editorElementRef = useRef<HTMLElement | null>(null);
  const { imageHandler, isUploading, uploadProgress } = useImageUpload({ insertImage: (url: string) => {
    const editor = quillRef.current?.getEditor();
    const range = editor?.getSelection(true);
    editor?.insertEmbed(range?.index, 'image', url);
  } });  

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'blockquote', 'header',
    'list', 'link', 'image'
  ];

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote'],
          [{ 'header': 1 }, { 'header': 2 }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'image'],
        ],
        handlers: {
          image: imageHandler,
        },
      },
    }),
    [imageHandler]
  );

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = quillStyles;
    document.head.appendChild(styleTag);

    return () => {
      styleTag.remove();
    };
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
        
        {isUploading && (
          <div className='absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm'>
            <div className='w-4/5 max-w-md space-y-3 p-4'>
              <Progress value={uploadProgress} className="h-2" />
              <p className='text-center text-sm font-medium text-foreground'>
                이미지 업로드 중... {uploadProgress}%
              </p>
            </div>
          </div>
        )}
      </div>
    </CopyErrorBoundary>
  );
}

