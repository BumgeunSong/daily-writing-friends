import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { PostTextEditor } from './PostTextEditor'; // Quill editor
import { NativeTextEditor } from './NativeTextEditor'; // Native textarea editor

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface PostEditorHandle {
  focus: () => void;
  save?: () => void;
}

/**
 * Wrapper component that toggles between Quill and Native editors
 * based on remote config flag
 */
export const PostEditor = forwardRef<PostEditorHandle, PostEditorProps>(
  ({ value, onChange, placeholder }, ref) => {
    const { value: nativeEditorEnabled } = useRemoteConfig('native_editor_enabled');
    const nativeEditorRef = useRef<HTMLTextAreaElement>(null);

    // Expose focus method through ref
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          if (nativeEditorEnabled && nativeEditorRef.current) {
            nativeEditorRef.current.focus();
          }
          // Quill editor doesn't have a focus method in current implementation
        },
        save: () => {
          // Native editor has save functionality, Quill doesn't need it
        },
      }),
      [nativeEditorEnabled],
    );

    // Use Native editor if enabled
    if (nativeEditorEnabled) {
      return (
        <NativeTextEditor
          ref={nativeEditorRef}
          initialContent={value}
          onSave={(content) => {
            // Auto-save functionality handled internally
            onChange(content);
          }}
          placeholder={placeholder}
          variant="inline"
        />
      );
    }

    // Use Quill editor (default)
    return <PostTextEditor value={value} onChange={onChange} placeholder={placeholder} />;
  },
);

PostEditor.displayName = 'PostEditor';
