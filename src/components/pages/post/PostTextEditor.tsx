import React, { useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

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
  padding: 1rem;
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

/* 툴바 스타일링 */
.ql-toolbar {
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  border-color: hsl(var(--border));
  background-color: hsl(var(--muted));
  padding: 0.5rem;
}

.ql-container {
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  border-color: hsl(var(--border));
}

.ql-toolbar button {
  height: 2rem;
  width: 2rem;
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

/* 플레이스홀더 스타일링 */
.ql-editor.ql-blank::before {
  color: hsl(var(--muted-foreground));
  font-style: normal;
}

/* prose 스타일 매칭 */
.ql-editor {
  max-width: none;
  prose-lg: {
    font-size: 1.125rem;
    line-height: 1.75;
  }
}

/* 목록 스타일링 */
.ql-editor ol, 
.ql-editor ul {
  padding-left: 1rem;  /* 기본값 2.5em에서 1rem으로 줄임 */
}

.ql-editor li {
  padding-left: 0.5rem;  /* 기본값 1.5em에서 0.5rem으로 줄임 */
}

/* 중첩된 목록의 들여쓰기 조정 */
.ql-editor li.ql-indent-1 {
  padding-left: 1.5rem;  /* 기본값 4.5em에서 1.5rem으로 줄임 */
}

/* 순서 있는 목록의 번호 위치 조정 */
.ql-editor ol li {
  counter-reset: list-1 list-2 list-3 list-4 list-5 list-6 list-7 list-8 list-9;
  counter-increment: list-0;
}

.ql-editor ol li:before {
  left: -1rem;  /* 번호 위치 조정 */
}

/* 순서 없는 목록의 불릿 위치 조정 */
.ql-editor ul li:before {
  left: -1rem;  /* 불릿 위치 조정 */
}
`;

const modules = {
  toolbar: [
    ['bold', 'underline', 'strike'],
    ['blockquote'],
    [{ 'header': 1 }, { 'header': 2 }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link']
  ]
};

const formats = [
  'bold', 'underline', 'strike',
  'blockquote', 'header',
  'list',
  'link'
];

export function PostTextEditor({ value, onChange, placeholder = '내용을 입력하세요...' }: PostTextEditorProps) {
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
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        theme="snow"
        modules={modules}
        formats={formats}
      />
    </div>
  );
}
