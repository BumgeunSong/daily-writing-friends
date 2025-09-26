import { ReactNode } from 'react';
import { PostBackButton } from './PostBackButton';

interface PostFreewritingHeaderProps {
  rightActions: ReactNode;
}

/**
 * Sticky header component specifically for freewriting page
 * Combines header actions with timer area
 */
export function PostFreewritingHeader({ rightActions }: PostFreewritingHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-background border-b">
      {/* Header Actions */}
      <div className="container mx-auto max-w-4xl px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <PostBackButton />
          </div>
          <div className="flex items-center space-x-3">
            {rightActions}
          </div>
        </div>
      </div>
    </div>
  );
}