'use client';

import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { PostUserProfile, type PostAuthorData } from './PostUserProfile';
import type React from 'react';

const SYSTEM_BADGES = {
  ADMIN: { name: '운영진', emoji: '👑' },
  PRIVATE: { name: '나에게만 보이는 글', emoji: '' },
} as const;

const CONTENT_PROSE_CLASSES = `
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
max-w-none`.trim();

const CLICKABLE_CONTENT_CLASSES =
  'cursor-pointer reading-focus rounded-lg transition-all duration-200 active:scale-[0.99]';

interface SystemPostCardProps {
  onClickContent?: () => void;
  onClickProfile?: (userId: string) => void;
  isOnlyForCurrentUser: boolean;
  authorData: PostAuthorData;
  title: string;
  content: string;
}

export const SystemPostCard: React.FC<SystemPostCardProps> = ({
  onClickContent,
  onClickProfile,
  isOnlyForCurrentUser,
  authorData,
  title,
  content,
}) => {
  const { handleContentClick, handleProfileClick } = useSystemPostCardHandlers(
    authorData.id,
    onClickContent,
    onClickProfile,
  );

  const badges = getSystemBadges(isOnlyForCurrentUser);
  const contentProps = getContentProps(onClickContent, handleContentClick);

  return (
    <Card className='reading-shadow nav-hover border-border/50 transition-all duration-200 hover:border-border'>
      <CardHeader className='px-3 pb-1 pt-3 md:px-4'>
        <div className='mb-3 flex items-center justify-between'>
          <PostUserProfile
            authorData={authorData}
            isLoading={false}
            onClickProfile={handleProfileClick}
            badges={badges}
          />
        </div>
        <h2 className='flex items-center text-lg font-semibold leading-tight text-foreground md:text-xl'>
          {title}
        </h2>
      </CardHeader>
      <CardContent {...contentProps}>
        <div className={CONTENT_PROSE_CLASSES}>{content}</div>
      </CardContent>
    </Card>
  );
};

function useSystemPostCardHandlers(
  userId: string,
  onClickContent?: () => void,
  onClickProfile?: (userId: string) => void,
) {
  const handleContentClick = () => {
    onClickContent?.();
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClickProfile) {
      onClickProfile(userId);
    }
  };

  return { handleContentClick, handleProfileClick };
}

function handleKeyDown(e: React.KeyboardEvent, onClick: (e: React.KeyboardEvent) => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onClick(e);
  }
}

function getSystemBadges(isOnlyForCurrentUser: boolean) {
  return isOnlyForCurrentUser
    ? [SYSTEM_BADGES.ADMIN, SYSTEM_BADGES.PRIVATE]
    : [SYSTEM_BADGES.ADMIN];
}

function getContentProps(onClickContent?: () => void, handleContentClick?: () => void) {
  const isClickable = Boolean(onClickContent);

  return {
    className: `px-3 pb-4 pt-1 min-h-[44px] md:px-4 ${isClickable ? CLICKABLE_CONTENT_CLASSES : ''}`,
    onClick: isClickable ? handleContentClick : undefined,
    role: isClickable ? 'button' : undefined,
    tabIndex: isClickable ? 0 : undefined,
    'aria-label': isClickable ? '시스템 공지 상세로 이동' : undefined,
    onKeyDown:
      isClickable && handleContentClick
        ? (e: React.KeyboardEvent) => handleKeyDown(e, handleContentClick)
        : undefined,
  };
}
