import { forwardRef } from 'react';
import type { ProseMirrorDoc } from '@/post/model/Post';
import { EditorTiptap, type EditorTiptapHandle } from './EditorTiptap';

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  onTyping?: () => void;
  placeholder?: string;
  onUploadingChange?: (isUploading: boolean) => void;
  onContentJsonChange?: (json: ProseMirrorDoc) => void;
}

export type PostEditorHandle = EditorTiptapHandle;

export const PostEditor = forwardRef<PostEditorHandle, PostEditorProps>(
  ({ value, onChange, onTyping, placeholder, onUploadingChange, onContentJsonChange }, ref) => {
    return (
      <EditorTiptap
        ref={ref}
        initialHtml={value}
        onChange={({ html, json }) => {
          onChange(html);
          onContentJsonChange?.(json);
        }}
        onTyping={onTyping}
        placeholder={placeholder}
        onUploadingChange={onUploadingChange}
      />
    );
  },
);

PostEditor.displayName = 'PostEditor';
