import { ReactNode } from 'react';
import { PostBackButton } from './PostBackButton';

interface PostEditorHeaderProps {
  rightActions: ReactNode;
}

/**
 * Sticky header for post editor pages
 * Provides consistent layout: PostBackButton (left) + actions (right)
 */
export function PostEditorHeader({ rightActions }: PostEditorHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-background border-b">
      <div className="container mx-auto max-w-4xl px-6 py-3">
        <div className="flex items-center justify-between">
          <PostBackButton />
          <div className="flex items-center space-x-3">
            {rightActions}
          </div>
        </div>
      </div>
    </div>
  );
}