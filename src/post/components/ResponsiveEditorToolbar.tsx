import { type Editor } from '@tiptap/react';
import { EditorToolbar } from './EditorToolbar';

interface ResponsiveEditorToolbarProps {
  editor: Editor;
  onImageUpload: () => void;
}

/**
 * Responsive toolbar wrapper component
 * Renders inline toolbar on desktop and sticky toolbar on mobile
 */
export function ResponsiveEditorToolbar({ editor, onImageUpload }: ResponsiveEditorToolbarProps) {
  // Check if we're on mobile based on the parent element's visibility
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  return (
    <EditorToolbar 
      editor={editor} 
      onImageUpload={onImageUpload}
      variant={isMobile ? "sticky" : "inline"}
    />
  );
}