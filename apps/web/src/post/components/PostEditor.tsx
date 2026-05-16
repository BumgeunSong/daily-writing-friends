import type { ProseMirrorDoc } from '@/post/model/Post';
import { EditorTiptap } from './EditorTiptap';

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onUploadingChange?: (isUploading: boolean) => void;
  onContentJsonChange?: (json: ProseMirrorDoc) => void;
}

export function PostEditor({
  value,
  onChange,
  placeholder,
  onUploadingChange,
  onContentJsonChange,
}: PostEditorProps) {
  return (
    <EditorTiptap
      initialHtml={value}
      onChange={({ html, json }) => {
        onChange(html);
        onContentJsonChange?.(json);
      }}
      placeholder={placeholder}
      onUploadingChange={onUploadingChange}
    />
  );
}
