import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';

interface SnapRowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Horizontal snap-scroll row for swipeable card carousels (peek posts, community
 * voices, testimonials). Owns the scroll + snap + hidden-scrollbar tokens so every
 * carousel on the intro page shares one interaction model. Items set their own
 * `snap-start` / `snap-center` and width.
 */
export function SnapRow({ children, className }: SnapRowProps) {
  return (
    <div
      className={cn(
        'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}
