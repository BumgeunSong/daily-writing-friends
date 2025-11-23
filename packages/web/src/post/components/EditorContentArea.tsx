import { EditorContent, type Editor } from '@tiptap/react';
import { cn } from '@/shared/utils/cn';

interface EditorContentAreaProps {
  editor: Editor;
  isMobile?: boolean;
}

/**
 * Editor content area component
 * Handles the actual content editing area with proper padding for mobile/desktop
 */
export function EditorContentArea({ editor, isMobile = false }: EditorContentAreaProps) {
  return (
    <div className={cn(
      "w-full rounded-xl border-0 bg-background",
      isMobile ? "pb-20" : "pb-0"
    )}>
      <EditorContent editor={editor} />
    </div>
  );
}