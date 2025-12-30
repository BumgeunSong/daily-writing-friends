import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/utils/cn';

interface PostingStreakBadgeProps {
  streak?: boolean[];
  isLoading?: boolean;
}

export function PostingStreakBadge({ streak, isLoading }: PostingStreakBadgeProps) {
  if (isLoading) {
    return (
      <Badge
        variant="secondary"
        className="flex items-center gap-1 rounded-full border-border/30 bg-secondary/80 px-2 py-0.5"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-2 rounded-full" />
        ))}
      </Badge>
    );
  }

  if (!streak || streak.length === 0) {
    return null;
  }

  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1 rounded-full border-border/20 bg-secondary/60 px-2.5 py-1.5 backdrop-blur-sm"
    >
      {streak.map((posted, index) => (
        <div
          key={index}
          className={cn(
            'size-2 rounded-full transition-all duration-300',
            posted
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4),0_0_3px_rgba(52,211,153,0.6),inset_0_0_2px_rgba(255,255,255,0.5)]'
              : 'bg-muted-foreground/20 shadow-[inset_0_0_2px_rgba(0,0,0,0.2)]',
          )}
        />
      ))}
    </Badge>
  );
}
