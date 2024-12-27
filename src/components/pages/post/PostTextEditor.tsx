import { useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../firebase';
import { useToast } from '@/hooks/use-toast';
import 'react-quill-new/dist/quill.snow.css';

interface PostTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  postId?: string; // 이미지 저장 경로를 위한 postId
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

/* Placeholder styling */
.ql-editor.ql-blank::before {
  color: hsl(var(--muted-foreground));
  font-style: normal;
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

const imageHandler = async (postId: string, quillRef: any, toast: any) => {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/*');
  input.click();

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      // 파일 크기 체크 (예: 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "오류",
          description: "파일 크기는 5MB를 초과할 수 없습니다.",
          variant: "destructive",
        });
        return;
      }

      // 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        toast({
          title: "오류",
          description: "이미지 파일만 업로드할 수 있습니다.",
          variant: "destructive",
        });
        return;
      }

      // 파일명 생성
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `postImages/${postId}/${fileName}`);

      // 파일 업로드
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 에디터에 이미지 삽입
      const editor = quillRef.current?.getEditor();
      const range = editor?.getSelection(true);
      editor?.insertEmbed(range?.index, 'image', downloadURL);

      toast({
        title: "성공",
        description: "이미지가 업로드되었습니다.",
      });

    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "오류",
        description: "이미지 업로드에 실패했습니다.",
        variant: "destructive",
      });
    }
  };
};

const formats = [
  'bold', 'underline', 'strike',
  'blockquote', 'header',
  'list', 'link', 'image'
];

export function PostTextEditor({ 
  value, 
  onChange, 
  placeholder = '내용을 입력하세요...', 
  postId = 'temp' 
}: PostTextEditorProps) {
  const quillRef = useRef<any>(null);
  const { toast } = useToast();

  // modules를 useMemo로 메모이제이션
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
          image: () => imageHandler(postId, quillRef, toast),
        },
      },
    }),
    [postId, toast] // postId와 toast가 변경될 때만 재생성
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
  );
}

