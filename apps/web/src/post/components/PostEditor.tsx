import { forwardRef, useImperativeHandle } from 'react';
import { PostTextEditor } from './PostTextEditor'; // Quill editor

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onUploadingChange?: (isUploading: boolean) => void;
}

export interface PostEditorHandle {
  focus: () => void;
}

/**
 * Wrapper component for the Quill editor
 */
export const PostEditor = forwardRef<PostEditorHandle, PostEditorProps>(
  ({ value, onChange, placeholder, onUploadingChange }, ref) => {
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          // Quill editor doesn't have a focus method in current implementation
        },
      }),
      [],
    );

    return <PostTextEditor value={value} onChange={onChange} placeholder={placeholder} onUploadingChange={onUploadingChange} />;
  },
);

PostEditor.displayName = 'PostEditor';
