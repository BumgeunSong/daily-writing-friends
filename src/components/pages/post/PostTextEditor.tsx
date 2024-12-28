import ReactQuill from 'react-quill-new';
import { Progress } from '@/components/ui/progress';
import 'react-quill-new/dist/quill.snow.css';
import { useQuillModules } from '@/hooks/useQuillModules';

interface PostTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function PostTextEditor({ 
  value, 
  onChange, 
  placeholder = '내용을 입력하세요...', 
}: PostTextEditorProps) {
  const {
    quillRef,
    modules,
    formats,
    isUploading,
    uploadProgress
  } = useQuillModules();

  return (
    <div className='space-y-2'>
      {isUploading && (
        <div className='relative w-full'>
          <Progress value={uploadProgress} className="h-1" />
          <p className='text-sm text-muted-foreground mt-1 text-center'>
            이미지 업로드 중... {uploadProgress}%
          </p>
        </div>
      )}
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
    </div>
  );
}

