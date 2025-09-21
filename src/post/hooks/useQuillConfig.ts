import { useMemo } from 'react';
import type { ReactQuill } from 'react-quill-new';

interface QuillHandlers {
  onImageInsert: () => void;
  onVideoInsert: () => void;
}

export const QUILL_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'blockquote',
  'list',
  'link',
  'image',
] as const;

const TOOLBAR_CONFIG = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image', 'video'],
] as const;

export function useQuillConfig({ onImageInsert, onVideoInsert }: QuillHandlers) {
  const modules = useMemo(
    () => ({
      toolbar: {
        container: TOOLBAR_CONFIG,
        handlers: {
          image: onImageInsert,
          video: onVideoInsert,
        },
      },
    }),
    [onImageInsert, onVideoInsert]
  );

  return {
    modules,
    formats: QUILL_FORMATS,
  };
}

export type QuillRef = React.RefObject<ReactQuill>;