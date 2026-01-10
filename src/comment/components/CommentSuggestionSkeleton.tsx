import { cn } from '@/lib/utils';

interface CommentSuggestionSkeletonProps {
  count?: number;
}

export function CommentSuggestionSkeleton({ count = 4 }: CommentSuggestionSkeletonProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'flex flex-col p-3 rounded-lg border',
            'min-w-[150px] max-w-[200px]',
            'animate-pulse'
          )}
        >
          {/* Icon and type skeleton */}
          <div className="mb-2 flex items-center gap-2">
            <div className="size-5 rounded bg-gray-200" />
            <div className="h-3 w-12 rounded bg-gray-200" />
          </div>

          {/* Text skeleton */}
          <div className="flex-1 space-y-2">
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-4/5 rounded bg-gray-200" />
            <div className="h-3 w-3/4 rounded bg-gray-200" />
          </div>

          {/* Action hint skeleton */}
          <div className="mt-2 border-t border-gray-100 pt-2">
            <div className="h-2 w-16 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}