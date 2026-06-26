import { PreviewPostCard } from '@/preview/components/PreviewPostCard';
import { PREVIEW_POSTS } from '@/preview/data/previewPosts';
import type React from 'react';

/**
 * Renders the handpicked {@link PREVIEW_POSTS} as static cards. Mirrors
 * `RecentPostCardList`'s spacing, but drops the infinite query, batch fetch,
 * skeletons, and empty/error states — the preview list is fixed content.
 */
export const PreviewPostCardList: React.FC = () => {
  return (
    <div className="space-y-4">
      {PREVIEW_POSTS.map((post) => (
        <PreviewPostCard key={post.id} post={post} />
      ))}
    </div>
  );
};
