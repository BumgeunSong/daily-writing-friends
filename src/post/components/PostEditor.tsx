import { forwardRef } from 'react';
import { PostTextEditor } from './PostTextEditor';

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface PostEditorHandle {
  focus: () => void;
}

/**
 * Editor component using Quill.js
 */
export const PostEditor = forwardRef<PostEditorHandle, PostEditorProps>(
  ({ value, onChange, placeholder }, ref) => {
    // Note: Quill editor doesn't currently expose a focus method
    // The ref is kept for API compatibility but doesn't implement focus

    return <PostTextEditor value={value} onChange={onChange} placeholder={placeholder} />;
  },
);

PostEditor.displayName = 'PostEditor';
