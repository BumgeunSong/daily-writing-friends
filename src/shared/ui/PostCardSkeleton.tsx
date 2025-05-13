import React from 'react';
import { Skeleton } from '@shared/ui/skeleton';

const PostCardSkeleton: React.FC = () => {
  return (
    <div className="mb-4 rounded-md border p-4 shadow-sm">
      <Skeleton className="mb-2 h-6 w-1/2" /> {/* Title */}
      <div className="mb-4 flex items-center">
        <Skeleton className="mr-2 size-8 rounded-full" /> {/* Avatar */}
        <Skeleton className="h-4 w-1/4" /> {/* Author name */}
      </div>
      <Skeleton className="mb-2 h-4 w-full" /> {/* Content line 1 */}
      <Skeleton className="mb-2 h-4 w-full" /> {/* Content line 2 */}
      <Skeleton className="mb-4 h-4 w-3/4" /> {/* Content line 3 */}
      <div className="flex items-center">
        <Skeleton className="h-4 w-1/6" /> {/* Comments count */}
      </div>
    </div>
  );
};

export default PostCardSkeleton;
