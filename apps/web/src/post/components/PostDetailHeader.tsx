import { Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Post } from '@/post/model/Post';
import { PostVisibility } from '@/post/model/Post';
import type { WritingBadge } from '@/stats/model/WritingStats';
import { Button } from '@/shared/ui/button';
import { formatDateToKorean } from '@/shared/utils/dateUtils';
import type { PostAuthorData } from './PostUserProfile';
import { PostUserProfile } from './PostUserProfile';

const noop = () => {};

interface PostDetailHeaderProps {
  post: Post;
  authorData: PostAuthorData;
  isAuthorLoading: boolean;
  isDonator: boolean;
  badges?: WritingBadge[];
  streak?: boolean[];
  isStreakLoading?: boolean;
  isAuthor: boolean;
  boardId?: string;
  postId?: string;
  onDelete: (boardId: string, postId: string, navigate: (path: string) => void) => void;
  navigate: (path: string) => void;
}

export function PostDetailHeader({
  post,
  authorData,
  isAuthorLoading,
  isDonator,
  badges,
  streak,
  isStreakLoading,
  isAuthor,
  boardId,
  postId,
  onDelete,
  navigate,
}: PostDetailHeaderProps) {
  return (
    <header>
      <div className='mb-6'>
        <PostUserProfile
          authorData={authorData}
          isLoading={isAuthorLoading}
          isDonator={isDonator}
          onClickProfile={noop}
          badges={badges}
          streak={streak}
          isStreakLoading={isStreakLoading}
        />
      </div>

      <h1 className='mb-2 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl'>
        {post.title}
      </h1>

      <div className='flex items-center justify-between'>
        <span className='text-xs text-muted-foreground'>
          {post.createdAt ? formatDateToKorean(post.createdAt.toDate()) : '?'}
        </span>
        {isAuthor && post.visibility !== PostVisibility.PRIVATE && boardId && postId && (
          <div className='flex space-x-1'>
            <Button variant='ghost' size='icon' aria-label='수정' asChild>
              <Link to={`/board/${boardId}/edit/${postId}`}>
                <Edit className='size-4' />
              </Link>
            </Button>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => onDelete(boardId, postId, navigate)}
              aria-label='삭제'
            >
              <Trash2 className='size-4' />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
