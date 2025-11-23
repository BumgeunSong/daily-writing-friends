'use client';

import { type Post } from '@/post/model/Post';
import { Card } from '@/shared/ui/card';
import { usePostCard } from '@/post/hooks/usePostCard';
import { PostCardHeader } from './PostCardHeader';
import { PostCardContent } from './PostCardContent';
import { PostCardFooter } from './PostCardFooter';
import { PostCardThumbnail } from './PostCardThumbnail';
import type React from 'react';

interface PostCardProps {
  post: Post;
  onClick: (postId: string) => void;
  onClickProfile?: (userId: string) => void;
  isKnownBuddy: boolean;
}

function handleKeyDown(e: React.KeyboardEvent, onClick: (e: any) => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onClick(e);
  }
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick, onClickProfile }) => {
  const { authorData, isAuthorLoading, badges, isPrivate, contentPreview, statPageEnabled } =
    usePostCard(post);

  const handleCardClick = () => {
    onClick(post.id);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClickProfile && post.authorId) {
      onClickProfile(post.authorId);
    }
  };

  return (
    <Card
      className='reading-shadow nav-hover reading-focus cursor-pointer border-border/50 transition-all duration-200 hover:border-border active:scale-[0.99]'
      onClick={handleCardClick}
      role='button'
      tabIndex={0}
      aria-label='게시글 상세로 이동'
      onKeyDown={(e) => handleKeyDown(e, handleCardClick)}
    >
      {/* Mobile layout: vertical stack */}
      <div className='block lg:hidden'>
        <PostCardHeader
          title={post.title}
          isPrivate={isPrivate}
          authorData={authorData}
          isAuthorLoading={isAuthorLoading}
          badges={badges}
          statPageEnabled={statPageEnabled}
          onClickProfile={handleProfileClick}
          isMobile={true}
        />
        <PostCardContent
          contentPreview={contentPreview}
          thumbnailImageURL={post.thumbnailImageURL}
          isPrivate={isPrivate}
          isMobile={true}
        />
      </div>

      {/* Desktop layout: side-by-side */}
      <div className='hidden lg:block'>
        <div className='flex'>
          {/* Main content area */}
          <div className='flex flex-col flex-1'>
            <PostCardHeader
              title={post.title}
              isPrivate={isPrivate}
              authorData={authorData}
              isAuthorLoading={isAuthorLoading}
              badges={badges}
              statPageEnabled={statPageEnabled}
              onClickProfile={handleProfileClick}
              isMobile={false}
            />
            <PostCardContent
              contentPreview={contentPreview}
              thumbnailImageURL={post.thumbnailImageURL}
              isPrivate={isPrivate}
              isMobile={false}
              isDesktop={true}
            />
          </div>

          {/* Desktop thumbnail */}
          <PostCardThumbnail thumbnailImageURL={post.thumbnailImageURL} isPrivate={isPrivate} />
        </div>
      </div>

      <PostCardFooter
        countOfComments={post.countOfComments}
        countOfReplies={post.countOfReplies}
        weekDaysFromFirstDay={post.weekDaysFromFirstDay}
      />
    </Card>
  );
};

export default PostCard;
