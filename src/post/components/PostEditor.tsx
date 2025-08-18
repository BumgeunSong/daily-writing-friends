import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { PostTextEditor } from './PostTextEditor'; // Quill editor
import { EditorTiptap, type EditorTiptapHandle } from './EditorTiptap'; // TipTap editor
import { ProseMirrorDoc } from '@/post/model/Post';

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // For TipTap dual-write strategy
  contentJson?: ProseMirrorDoc;
  onJsonChange?: (json: ProseMirrorDoc) => void;
}

export interface PostEditorHandle {
  focus: () => void;
}

/**
 * Wrapper component that toggles between Quill and TipTap editors
 * based on remote config flag
 */
export const PostEditor = forwardRef<PostEditorHandle, PostEditorProps>(
  ({ value, onChange, placeholder, contentJson, onJsonChange }, ref) => {
    const { value: tiptapEnabled } = useRemoteConfig('tiptap_editor_enabled');
    const tiptapRef = useRef<EditorTiptapHandle>(null);

    // Expose focus method through ref
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          if (tiptapEnabled && tiptapRef.current) {
            tiptapRef.current.focus();
          }
          // Quill editor doesn't have a focus method in current implementation
        },
      }),
      [tiptapEnabled],
    );

    // Use TipTap editor if enabled
    if (tiptapEnabled) {
      return (
        <EditorTiptap
          ref={tiptapRef}
          initialHtml={value}
          initialJson={contentJson}
          onChange={({ html, json }) => {
            onChange(html);
            onJsonChange?.(json);
          }}
          placeholder={placeholder}
        />
      );
    }

    // Use Quill editor (default)
    return <PostTextEditor value={value} onChange={onChange} placeholder={placeholder} />;
  },
);

PostEditor.displayName = 'PostEditor';
