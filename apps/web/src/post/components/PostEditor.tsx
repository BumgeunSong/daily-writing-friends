import type { ProseMirrorDoc } from '@/post/model/Post';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { EditorTiptap } from './EditorTiptap';
import { PostTextEditor } from './PostTextEditor';

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onUploadingChange?: (isUploading: boolean) => void;
  onContentJsonChange?: (json: ProseMirrorDoc) => void;
  forceEditor?: 'tiptap' | 'quill';
}

export function PostEditor({
  value,
  onChange,
  placeholder,
  onUploadingChange,
  onContentJsonChange,
  forceEditor,
}: PostEditorProps) {
  const { value: flagEnabled } = useRemoteConfig('tiptap_editor_enabled');
  const useTiptap = forceEditor === 'tiptap' || (forceEditor !== 'quill' && flagEnabled);

  if (useTiptap) {
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

  return (
    <PostTextEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onUploadingChange={onUploadingChange}
    />
  );
}
