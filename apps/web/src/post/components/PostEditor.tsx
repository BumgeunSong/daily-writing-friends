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

  // Lock in the editor choice on first resolved render to prevent mid-session remounts
  const lockedEditorRef = useRef<'tiptap' | 'quill' | null>(null);
  if (!isLoading && lockedEditorRef.current === null) {
    lockedEditorRef.current = flagEnabled ? 'tiptap' : 'quill';
  }
  const editorChoice = forceEditor ?? lockedEditorRef.current;

  // Show nothing while Remote Config loads (unless forceEditor bypasses it)
  if (!editorChoice) {
    return null;
  }

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
