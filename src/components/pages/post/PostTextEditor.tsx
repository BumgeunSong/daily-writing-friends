import { useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import 'react-quill-new/dist/quill.snow.css';
import { useImageUpload } from '@/hooks/useImageUpload';

interface PostTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const quillStyles = `
.ql-container {
  font-family: var(--font-sans);
  font-size: 1.125rem;
  line-height: 1.75;
  min-height: 300px;
}

.ql-editor {
  padding: 1.5rem;
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));
}

.ql-editor p {
  margin-bottom: 1.25rem;
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

/* Toolbar styling */
.ql-toolbar {
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  border-color: hsl(var(--border));
  background-color: hsl(var(--muted));
  padding: 0.75rem;
}

.ql-container {
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  border-color: hsl(var(--border));
}

.ql-toolbar button {
  height: 2.5rem;
  width: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
}

.ql-toolbar button:hover {
  background-color: hsl(var(--muted-foreground) / 0.1);
}

.ql-toolbar .ql-active {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

/* Placeholder styling - 모바일 환경에서도 작동하도록 수정 */
.ql-editor.ql-blank::before {
  color: hsl(var(--muted-foreground));
  font-style: normal;
  pointer-events: none; /* 플레이스홀더가 터치 이벤트를 방해하지 않도록 함 */
  opacity: 0.7; /* 약간 투명하게 설정 */
}

/* 포커스 상태나 터치 시 플레이스홀더 숨기기 */
.ql-container:focus-within .ql-editor.ql-blank::before,
.ql-editor.ql-blank:focus::before {
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* Matching prose styles */
.ql-editor {
  max-width: none;
  font-size: 1.125rem;
  line-height: 1.75;
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
  const { toast } = useToast();
  const { imageHandler, isUploading, uploadProgress } = useImageUpload({ insertImage: (url: string) => {
    const editor = quillRef.current?.getEditor();
    const range = editor?.getSelection(true);
    editor?.insertEmbed(range?.index, 'image', url);
  } });  

  const formats = [
    'bold', 'underline', 'strike',
    'blockquote', 'header',
    'list', 'link', 'image'
  ];

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          ['bold', 'underline', 'strike'],
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
    [toast]
  );

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = quillStyles;
    document.head.appendChild(styleTag);

    return () => {
      styleTag.remove();
    };
  }, []);

  return (
    <div className='space-y-2 relative'>
      <div className='rounded-lg border border-border bg-background'>
        <ReactQuill
          ref={quillRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          theme="snow"
          modules={modules}
          formats={formats}
          className="prose prose-lg prose-slate dark:prose-invert prose-h1:text-3xl prose-h1:font-semibold prose-h2:text-2xl prose-h2:font-semibold"
        />
      </div>
      
      {isUploading && (
        <div className='absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg z-10'>
          <div className='w-4/5 max-w-md'>
            <Progress value={uploadProgress} className="h-2" />
            <p className='text-sm font-medium text-center mt-3'>
              이미지 업로드 중... {uploadProgress}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

