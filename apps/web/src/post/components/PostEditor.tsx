import { useRef } from 'react';
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
  const { value: flagEnabled, isLoading } = useRemoteConfig('tiptap_editor_enabled');

  // Lock in the editor choice on first resolved render to prevent mid-session remounts.
  // Default to 'quill' while loading to avoid a blank flash.
  const lockedEditorRef = useRef<'tiptap' | 'quill'>('quill');
  if (!isLoading && lockedEditorRef.current === 'quill' && flagEnabled) {
    lockedEditorRef.current = 'tiptap';
  }
  const editorChoice = forceEditor ?? lockedEditorRef.current;

  if (editorChoice === 'tiptap') {
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
