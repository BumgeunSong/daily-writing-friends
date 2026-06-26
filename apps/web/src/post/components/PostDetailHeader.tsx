import { Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Post } from '@/post/model/Post';
import { PostVisibility } from '@/post/model/Post';
import { Button } from '@/shared/ui/button';
import { Row } from '@/shared/ui/row';
import { Stack } from '@/shared/ui/stack';
import { formatDateToKorean } from '@/shared/utils/dateUtils';
import type { WritingBadge } from '@/stats/model/WritingStats';
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
  /** Avatar click handler; defaults to a no-op (real app does not navigate). */
  onClickProfile?: () => void;
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
  onClickProfile = noop,
}: PostDetailHeaderProps) {
  return (
    <Stack asChild gap='lg'>
      <header>
        <PostUserProfile
          authorData={authorData}
          isLoading={isAuthorLoading}
          isDonator={isDonator}
          onClickProfile={onClickProfile}
          badges={badges}
          streak={streak}
          isStreakLoading={isStreakLoading}
        />
        <Stack gap='sm'>
          <h1 className='text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl'>
            {post.title}
          </h1>
          <Row align='center' justify='between'>
            <span className='text-xs text-muted-foreground'>
              {post.createdAt ? formatDateToKorean(post.createdAt.toDate()) : '?'}
            </span>
            {isAuthor && post.visibility !== PostVisibility.PRIVATE && boardId && postId && (
              <Row align='center' gap='xs'>
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
              </Row>
            )}
          </Row>
        </Stack>
      </header>
    </Stack>
  );
}
