import type { ReactNode } from 'react';
import { PostBackButton } from './PostBackButton';

interface PostFreewritingHeaderProps {
  topic?: string;
  timerDisplay: ReactNode;
  rightActions: ReactNode;
}

/**
 * Sticky header component specifically for freewriting page
 * 3-column layout: Back button | Timer | Upload button
 * Optional topic display below header
 */
export function PostFreewritingHeader({
  topic,
  timerDisplay,
  rightActions
}: PostFreewritingHeaderProps) {
  return (
    <div className="sticky top-0 z-40 border-b bg-background">
      <div className="container mx-auto max-w-4xl px-6 py-3">
        {/* Row 1: 3-column layout */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
          {/* Left: Back button */}
          <div className="flex justify-start">
            <PostBackButton />
          </div>

          {/* Center: Timer */}
          <div className="flex justify-center">
            {timerDisplay}
          </div>

          {/* Right: Actions */}
          <div className="flex justify-end">
            {rightActions}
          </div>
        </div>

        {/* Row 2: Topic (conditional) */}
        {topic && (
          <div className="mt-3 border-t pt-3">
            <p className="break-words text-center text-sm text-muted-foreground">
              {topic}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}