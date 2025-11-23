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
          <div className="flex items-center gap-2 mb-2">
            <div className="size-5 rounded bg-gray-200" />
            <div className="w-12 h-3 bg-gray-200 rounded" />
          </div>

          {/* Text skeleton */}
          <div className="flex-1 space-y-2">
            <div className="w-full h-3 bg-gray-200 rounded" />
            <div className="w-4/5 h-3 bg-gray-200 rounded" />
            <div className="w-3/4 h-3 bg-gray-200 rounded" />
          </div>

          {/* Action hint skeleton */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="w-16 h-2 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}