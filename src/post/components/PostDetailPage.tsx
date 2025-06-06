import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import Comments from '@/comment/components/Comments';
import { usePostDelete } from '@/post/hooks/usePostDelete';
import { fetchPost } from '@/post/utils/postUtils';
import { useAuth } from '@/shared/hooks/useAuth';
import { Skeleton } from '@/shared/ui/skeleton';
import { useUserNickname } from '@/user/hooks/useUserNickname';
import { PostAdjacentButtons } from './PostAdjacentButtons';
import { PostBackButton } from './PostBackButton';
import { PostContent } from './PostContent';
import { PostDetailHeader } from './PostDetailHeader';
import { PostMetaHelmet } from './PostMetaHelmet';

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

  const { nickname: authorNickname } = useUserNickname(post?.authorId ?? null);

  if (isLoading) return <PostDetailSkeleton />;
  if (error || !post) return <PostDetailError boardId={boardId} />;

  const isAuthor = currentUser?.uid === post.authorId;

  return (
    <div className='mx-auto max-w-4xl px-6 py-8 sm:px-8 lg:px-12'>
      <PostMetaHelmet post={post} boardId={boardId} postId={postId} />
      <PostBackButton className='mb-6' />
      <article className='space-y-6'>
        <PostDetailHeader
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
      {boardId && <PostBackButton />}
    </div>
  );
}
