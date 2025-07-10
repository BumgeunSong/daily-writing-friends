'use client';

import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { PostUserProfile, type PostAuthorData } from './PostUserProfile';
import type React from 'react';

interface SystemPostCardProps {
  onClickContent?: () => void;
  onClickProfile?: (userId: string) => void;
  isOnlyForCurrentUser: boolean;
  authorData: PostAuthorData;
  title: string;
  content: string;
}

function handleKeyDown(e: React.KeyboardEvent, onClick: (e: any) => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onClick(e);
  }
}

const SystemPostCard: React.FC<SystemPostCardProps> = ({
  onClickContent,
  onClickProfile,
  isOnlyForCurrentUser,
  authorData,
  title,
  content,
}) => {
  const handleContentClick = () => {
    if (onClickContent) {
      onClickContent();
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClickProfile) {
      onClickProfile(authorData.id);
    }
  };

  const badges = isOnlyForCurrentUser
    ? [
        { name: '운영진', emoji: '👑' },
        { name: '나에게만 보이는 글', emoji: '' },
      ]
    : [{ name: '운영진', emoji: '👑' }];

  return (
    <Card className='reading-shadow border-border/50 transition-all duration-200 hover:border-border nav-hover'>
      <CardHeader className='px-3 pb-1 pt-3 md:px-4'>
        <div className='mb-3 flex items-center justify-between'>
          <PostUserProfile
            authorData={authorData}
            isLoading={false}
            onClickProfile={handleProfileClick}
            badges={badges}
          />
        </div>
        <h2 className='flex items-center text-lg font-semibold text-foreground leading-tight md:text-xl'>
          {title}
        </h2>
      </CardHeader>
      <CardContent
        className={`px-3 pb-4 pt-1 min-h-[44px] md:px-4 ${
          onClickContent
            ? 'cursor-pointer reading-focus rounded-lg transition-all duration-200 active:scale-[0.99]'
            : ''
        }`}
        onClick={onClickContent ? handleContentClick : undefined}
        role={onClickContent ? 'button' : undefined}
        tabIndex={onClickContent ? 0 : undefined}
        aria-label={onClickContent ? '시스템 공지 상세로 이동' : undefined}
        onKeyDown={onClickContent ? (e) => handleKeyDown(e, handleContentClick) : undefined}
      >
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
        >
          {content}
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemPostCard;
