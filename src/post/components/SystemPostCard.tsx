'use client';

import { Crown } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { PostUserProfile, type PostAuthorData } from './PostUserProfile';
import type React from 'react';

interface SystemPostCardProps {
  onClickContent: () => void;
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
    onClickContent();
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClickProfile && authorData.id) {
      onClickProfile(authorData.id);
    }
  };

  return (
    <Card className='reading-shadow border-accent/30 bg-gradient-to-br from-accent/5 to-accent/10 transition-all duration-200 hover:border-accent/50 hover:shadow-lg'>
      <CardHeader className='px-3 pb-1 pt-3 md:px-4'>
        <div className='mb-3 flex items-center justify-between'>
          <PostUserProfile
            authorData={authorData}
            isLoading={false}
            onClickProfile={handleProfileClick}
            badges={[
              { name: '운영진', emoji: '👑' },
              { name: '나에게만 보이는 글', emoji: '' },
            ]}
          />
          <div className='flex items-center gap-2'>
            {isOnlyForCurrentUser && (
              <Badge variant='secondary' className='text-xs font-medium'>
                나에게만 보이는 글
              </Badge>
            )}
            <Crown className='size-4 text-accent' aria-label='시스템 공지' />
          </div>
        </div>
        <h2 className='flex items-center text-lg font-semibold text-foreground leading-tight md:text-xl'>
          {title}
        </h2>
      </CardHeader>
      <CardContent
        className='px-3 pb-4 pt-1 cursor-pointer min-h-[44px] reading-focus rounded-lg transition-all duration-200 active:scale-[0.99] md:px-4'
        onClick={handleContentClick}
        role='button'
        tabIndex={0}
        aria-label='시스템 공지 상세로 이동'
        onKeyDown={(e) => handleKeyDown(e, handleContentClick)}
      >
        <div className='text-sm text-foreground/85 leading-relaxed'>{content}</div>
      </CardContent>
    </Card>
  );
};

export default SystemPostCard;
