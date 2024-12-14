import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const PostCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 border rounded-md shadow-sm mb-4">
      <Skeleton className="h-6 w-1/2 mb-2" /> {/* Title */}
      <div className="flex items-center mb-4">
        <Skeleton className="h-8 w-8 rounded-full mr-2" /> {/* Avatar */}
        <Skeleton className="h-4 w-1/4" /> {/* Author name */}
      </div>
      <Skeleton className="h-4 w-full mb-2" /> {/* Content line 1 */}
      <Skeleton className="h-4 w-full mb-2" /> {/* Content line 2 */}
      <Skeleton className="h-4 w-3/4 mb-4" /> {/* Content line 3 */}
      <div className="flex items-center">
        <Skeleton className="h-4 w-1/6" /> {/* Comments count */}
      </div>
    </div>
  );
};

export default PostCardSkeleton;
