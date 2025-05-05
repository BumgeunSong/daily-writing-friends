import { useQuery } from '@tanstack/react-query';
import { Edit, Trash2, Share } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PostVisibility } from '@/types/Post';
import { formatDateToKorean } from '@/utils/dateUtils';
import { fetchUserNickname } from '@/utils/userUtils';
import { PostAdjacentButtons } from './PostAdjacentButtons';
import { PostBackButton } from './PostBackButton';
import { PostContent } from './PostContent';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchPost } from '../../../utils/postUtils';
import Comments from '../comment/Comments';
import { PostMetaHelmet } from './PostMetaHelmet';
import { usePostDelete } from '@/hooks/usePostDelete';
export default function PostDetailPage() {
  const { postId, boardId } = useParams<{ postId: string; boardId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const handleDelete = usePostDelete();

  const { data: post, isLoading, error } = useQuery(
    ['post', boardId, postId],
    () => fetchPost(boardId!, postId!),
    { enabled: !!boardId && !!postId }
  );

  const { data: authorNickname } = useQuery(
    ['authorNickname', post?.authorId],
    () => fetchUserNickname(post!.authorId),
    { enabled: !!post?.authorId }
  );

  if (isLoading) return <PostDetailSkeleton />;
  if (error || !post) return <PostDetailError boardId={boardId} />;

  const isAuthor = currentUser?.uid === post.authorId;

  return (
    <div className='mx-auto max-w-4xl px-6 py-8 sm:px-8 lg:px-12'>
      <PostMetaHelmet post={post} boardId={boardId} postId={postId} />
      {boardId && <PostBackButton boardId={boardId} className='mb-6' />}
      <article className='space-y-6'>
        <PostHeader
          post={post}
          authorNickname={authorNickname ?? undefined}
          isAuthor={isAuthor}
          boardId={boardId}
          postId={postId}
          onDelete={handleDelete}
          navigate={navigate}
        />
        <PostContent post={post} isAuthor={isAuthor} />
      </article>
      <div className='mt-12 border-t border-gray-200'></div>
      {boardId && postId && <PostAdjacentButtons boardId={boardId} postId={postId} />}
      <div className='mt-12'>
        {boardId && postId && (
          <Comments
            boardId={boardId}
            postId={postId}
            postAuthorId={post.authorId}
            postAuthorNickname={typeof authorNickname === 'string' ? authorNickname : null}
          />
        )}
      </div>
    </div>
  );
}

// 로딩 UI
function PostDetailSkeleton() {
  return (
    <div className='mx-auto max-w-4xl px-6 py-8 sm:px-8 lg:px-12'>
      <Skeleton className='mb-4 h-12 w-3/4' />
      <Skeleton className='mb-2 h-4 w-full' />
      <Skeleton className='mb-2 h-4 w-full' />
      <Skeleton className='h-4 w-2/3' />
    </div>
  );
}

// 에러 UI
function PostDetailError({ boardId }: { boardId?: string }) {
  return (
    <div className='mx-auto max-w-4xl px-6 py-8 text-center sm:px-8 lg:px-12'>
      <h1 className='mb-4 text-2xl font-bold'>게시물을 찾을 수 없습니다.</h1>
      {boardId && <PostBackButton boardId={boardId} />}
    </div>
  );
}

// 헤더 UI
function PostHeader({
  post,
  authorNickname,
  isAuthor,
  boardId,
  postId,
  onDelete,
  navigate,
}: {
  post: any;
  authorNickname: string | undefined;
  isAuthor: boolean;
  boardId?: string;
  postId?: string;
  onDelete: (boardId: string, postId: string, navigate: (path: string) => void) => void;
  navigate: (path: string) => void;
}) {
  // Web Share API 핸들러
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.title,
        url: window.location.href,
      });
    } else {
      // fallback: 클립보드 복사 등
      window.navigator.clipboard.writeText(window.location.href);
      alert('링크가 클립보드에 복사되었습니다.');
    }
  };
  return (
    <header className='space-y-4'>
      <div className="flex items-center gap-2">
        <h1 className='mb-4 text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl'>
          {post.title}
        </h1>
      </div>
      <div className='flex items-center justify-between text-sm text-gray-500 dark:text-gray-400'>
        <p>
          작성자: {authorNickname || '??'} | 작성일: {post.createdAt ? formatDateToKorean(post.createdAt.toDate()) : '?'}
        </p>
        <div className='flex space-x-2'>
          {/* Share 버튼: 비공개글이 아닐 때만 노출 */}
          {post.visibility !== PostVisibility.PRIVATE && (
            <Button variant='outline' size='sm' onClick={handleShare} aria-label='공유'>
              <Share className='size-4' />
            </Button>
          )}
          {/* 수정/삭제 버튼: 작성자만 노출, 비공개글은 제외 */}
          {isAuthor && post.visibility !== PostVisibility.PRIVATE && (
            <>
              <Link to={`/board/${boardId}/edit/${postId}`}>
                <Button variant='outline' size='sm' aria-label='수정'>
                  <Edit className='size-4' />
                </Button>
              </Link>
              {boardId && postId && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onDelete(boardId, postId, navigate)}
                  aria-label='삭제'
                >
                  <Trash2 className='size-4' />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
