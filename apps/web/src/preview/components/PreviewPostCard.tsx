import { useNavigate } from '@/shared/navigation';
import { PostCardContent } from '@/post/components/PostCardContent';
import { PostCardFooter } from '@/post/components/PostCardFooter';
import { PostCardHeader } from '@/post/components/PostCardHeader';
import { PostCardThumbnail } from '@/post/components/PostCardThumbnail';
import type { PostAuthorData } from '@/post/components/PostUserProfile';
import { Card } from '@/shared/ui/card';
import type { PreviewPost } from '@/preview/data/previewPosts';
import type React from 'react';

interface PreviewPostCardProps {
  post: PreviewPost;
}

function handleKeyDown(e: React.KeyboardEvent, onActivate: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onActivate();
  }
}

/**
 * Static, read-only twin of {@link PostCard}. Reuses the exact same presentational
 * shells (`PostCardHeader`/`Content`/`Thumbnail`/`Footer`) but feeds them values
 * from a hand-curated {@link PreviewPost} instead of the Supabase-backed
 * `usePostCard` orchestrator.
 *
 * Navigation isolation (design doc §4): the card routes only to the in-preview
 * detail page — never to a real `/user/:id` profile. The author avatar is not a
 * separate target; a tap on it falls through to the card and opens the post,
 * which is what a visitor expects.
 *
 * Reused-prop defaults follow §5: `isDonator=false`, `isPrivate=false`,
 * `streak=undefined`, `isStreakLoading=false`, `badges=[]`.
 */
export const PreviewPostCard: React.FC<PreviewPostCardProps> = ({ post }) => {
  const navigate = useNavigate();

  const authorData: PostAuthorData = {
    id: post.author.id,
    displayName: post.author.displayName,
    profileImageURL: post.author.profileImageURL,
  };

  const handleCardClick = () => {
    navigate(`/preview/post/${post.id}`);
  };

  return (
    <Card
      className="reading-shadow nav-hover reading-focus cursor-pointer border-border/50 transition-[transform,border-color] duration-200 hover:border-border active:scale-[0.99]"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label="게시글 상세로 이동"
      onKeyDown={(e) => handleKeyDown(e, handleCardClick)}
    >
      {/* Mobile layout: vertical stack */}
      <div className="block lg:hidden">
        <PostCardHeader
          title={post.title}
          isPrivate={false}
          authorData={authorData}
          isAuthorLoading={false}
          isDonator={false}
          badges={[]}
          streak={undefined}
          isStreakLoading={false}
          isMobile={true}
        />
        <PostCardContent
          contentPreview={post.contentPreview}
          thumbnailImageURL={post.thumbnailImageURL}
          isPrivate={false}
          isMobile={true}
        />
      </div>

      {/* Desktop layout: side-by-side */}
      <div className="hidden lg:block">
        <div className="flex">
          <div className="flex flex-1 flex-col">
            <PostCardHeader
              title={post.title}
              isPrivate={false}
              authorData={authorData}
              isAuthorLoading={false}
              isDonator={false}
              badges={[]}
              streak={undefined}
              isStreakLoading={false}
              isMobile={false}
            />
            <PostCardContent
              contentPreview={post.contentPreview}
              thumbnailImageURL={post.thumbnailImageURL}
              isPrivate={false}
              isMobile={false}
              isDesktop={true}
            />
          </div>

          <PostCardThumbnail thumbnailImageURL={post.thumbnailImageURL} isPrivate={false} />
        </div>
      </div>

      <PostCardFooter
        countOfComments={post.countOfComments}
        countOfReplies={post.countOfReplies}
        weekDaysFromFirstDay={post.weekDaysFromFirstDay ?? undefined}
      />
    </Card>
  );
};
