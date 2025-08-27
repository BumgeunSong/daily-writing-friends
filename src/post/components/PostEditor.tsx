import { forwardRef, useImperativeHandle, useRef } from 'react';
import { EnhancedPostTextEditor } from './EnhancedPostTextEditor';
import type { QuillInstance } from '../types/quillEditor';

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface PostEditorHandle {
  focus: () => void;
}

/**
 * Enhanced Quill-based rich text editor with sticky toolbar and modern features
 */
export const PostEditor = forwardRef<PostEditorHandle, PostEditorProps>(
  ({ value, onChange, placeholder }, ref) => {
    const quillRef = useRef<QuillInstance>(null);

    // Expose focus method through ref
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          const editor = quillRef.current?.getEditor();
          if (editor) {
            editor.focus();
          }
        },
      }),
      [],
    );

    return (
      <EnhancedPostTextEditor 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder}
        stickyToolbar={true}
      />
    );
  },
);

PostEditor.displayName = 'PostEditor';
