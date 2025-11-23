import { type Editor } from '@tiptap/react';
import { EditorToolbar } from './EditorToolbar';
import { useIsMobile } from '../../shared/hooks/useWindowSize';

interface ResponsiveEditorToolbarProps {
  editor: Editor;
  onImageUpload: () => void;
}

/**
 * Responsive toolbar wrapper component
 * Renders inline toolbar on desktop and sticky toolbar on mobile
 * Automatically adjusts when window size changes
 */
export function ResponsiveEditorToolbar({ editor, onImageUpload }: ResponsiveEditorToolbarProps) {
  // 윈도우 크기 변경을 실시간으로 감지하여 모바일 여부 판단
  const isMobile = useIsMobile(768);

  return (
    <EditorToolbar
      editor={editor}
      onImageUpload={onImageUpload}
      variant={isMobile ? 'sticky' : 'inline'}
    />
  );
}
