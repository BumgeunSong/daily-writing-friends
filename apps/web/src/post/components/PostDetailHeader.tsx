import { Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Post } from '@/post/model/Post';
import { PostVisibility } from '@/post/model/Post';
import { userProfilePath } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/button';
import { Row } from '@/shared/ui/row';
import { Stack } from '@/shared/ui/stack';
import { formatDateToKorean } from '@/shared/utils/dateUtils';
import type { WritingBadge } from '@/stats/model/WritingStats';
import type { PostAuthorData } from './PostUserProfile';
import { PostUserProfile } from './PostUserProfile';

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
  /**
   * Omit to navigate to the author's profile by default, pass a handler to
   * override it, or pass `null` to render the author as inert markup (e.g.
   * the preview's synthetic authors).
   */
  onClickProfile?: (() => void) | null;
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
  onClickProfile,
}: PostDetailHeaderProps) {
  const goToProfile =
    onClickProfile === null ? null : onClickProfile ?? (() => navigate(userProfilePath(authorData.id)));

  return (
    <Stack asChild gap='lg'>
      <header>
        <PostUserProfile
          authorData={authorData}
          isLoading={isAuthorLoading}
          isDonator={isDonator}
          onClickProfile={goToProfile}
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
