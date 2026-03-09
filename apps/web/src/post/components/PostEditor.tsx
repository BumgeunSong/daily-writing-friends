import { PostTextEditor } from './PostTextEditor';

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onUploadingChange?: (isUploading: boolean) => void;
}

export function PostEditor({ value, onChange, placeholder, onUploadingChange }: PostEditorProps) {
  return <PostTextEditor value={value} onChange={onChange} placeholder={placeholder} onUploadingChange={onUploadingChange} />;
}
