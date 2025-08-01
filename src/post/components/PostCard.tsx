'use client';

import { MessageCircle, Lock } from 'lucide-react';
import { type Post, PostVisibility } from '@/post/model/Post';
import { getContentPreview } from '@/post/utils/contentUtils';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/shared/ui/card';
import { useUser } from '@/user/hooks/useUser';
import { usePostProfileBadges } from '@/stats/hooks/usePostProfileBadges';
import { PostAuthorData, PostUserProfile } from './PostUserProfile';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
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
  const { userData: authorData, isLoading: isAuthorLoading } = useUser(post.authorId);
  const { value: statPageEnabled } = useRemoteConfig('stat_page_enabled');
  const { data: badges } = usePostProfileBadges(post.authorId);
  const isPrivate = post.visibility === PostVisibility.PRIVATE;
  const contentPreview = !isPrivate ? getContentPreview(post.content) : null;

  const handleCardClick = () => {
    onClick(post.id);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClickProfile && post.authorId) {
      onClickProfile(post.authorId);
    }
  };

  const postAuthorData: PostAuthorData = {
    id: post.authorId,
    displayName: authorData?.nickname || authorData?.realName || '',
    profileImageURL: authorData?.profilePhotoURL || '',
  };

  return (
    <Card
      className='reading-shadow border-border/50 transition-all duration-200 hover:border-border nav-hover cursor-pointer reading-focus active:scale-[0.99]'
      onClick={handleCardClick}
      role='button'
      tabIndex={0}
      aria-label='게시글 상세로 이동'
      onKeyDown={(e) => handleKeyDown(e, handleCardClick)}
    >
      <CardHeader className='px-3 pb-1 pt-3 md:px-4'>
        <div className='mb-3 flex items-center'>
          <PostUserProfile
            authorData={postAuthorData}
            isLoading={isAuthorLoading}
            onClickProfile={handleProfileClick}
            badges={statPageEnabled ? badges : undefined}
          />
        </div>
        <h2 className='flex items-center text-lg font-semibold text-foreground leading-tight md:text-xl'>
          {isPrivate && (
            <Lock className='mr-1.5 size-4 shrink-0 text-muted-foreground' aria-label='비공개 글' />
          )}
          {post.title}
        </h2>
      </CardHeader>
      <CardContent className='px-3 pb-3 pt-1 min-h-[44px] md:px-4'>
        {!isPrivate && contentPreview && (
          <div
            className='
prose prose-sm line-clamp-3 
text-reading-sm
text-foreground/85
dark:prose-invert
prose-p:my-1.5
prose-ol:my-1.5
prose-ul:my-1.5
prose-headings:text-foreground
prose-strong:text-foreground/90
prose-a:text-ring
max-w-none'
            dangerouslySetInnerHTML={{ __html: contentPreview }}
          />
        )}
        {!isPrivate && post.thumbnailImageURL && (
          <div className='mt-4 aspect-video w-full overflow-hidden rounded-lg bg-muted reading-shadow'>
            <img
              src={post.thumbnailImageURL || '/placeholder.svg'}
              alt='게시글 썸네일'
              className='w-full h-full object-cover'
            />
          </div>
        )}
      </CardContent>
      <CardFooter className='flex justify-between border-t border-border/50 px-3 pb-3 pt-3 min-h-[44px] md:px-4'>
        <div className='flex items-center text-muted-foreground'>
          <MessageCircle className='mr-1.5 size-4' />
          <p className='text-sm font-medium'>{post.countOfComments + post.countOfReplies}</p>
        </div>
        {post.weekDaysFromFirstDay !== undefined && (
          <Badge
            className='h-6 border-border bg-secondary/80 px-2.5 py-1 text-xs font-medium text-muted-foreground reading-shadow'
            variant='outline'
          >
            {post.weekDaysFromFirstDay + 1}일차
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
};

export default PostCard;
