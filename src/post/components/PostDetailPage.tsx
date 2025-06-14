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
    <div className='min-h-screen bg-background'>
      <PostMetaHelmet post={post} boardId={boardId} postId={postId} />
      <main className="container mx-auto px-6 py-2 max-w-4xl">
        <PostBackButton className='mb-4' />
        <article className='space-y-4'>
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
        <div className='mt-8 border-t border-border'></div>
        {boardId && postId && <PostAdjacentButtons boardId={boardId} postId={postId} />}
        <div className='mt-8'>
          {boardId && postId && (
            <Comments
              boardId={boardId}
              postId={postId}
              postAuthorId={post.authorId}
              postAuthorNickname={typeof authorNickname === 'string' ? authorNickname : null}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// 로딩 UI
function PostDetailSkeleton() {
  return (
    <div className='min-h-screen bg-background'>
      <main className="container mx-auto px-6 py-2 max-w-4xl">
        <Skeleton className='mb-4 h-12 w-3/4' />
        <Skeleton className='mb-2 h-4 w-full' />
        <Skeleton className='mb-2 h-4 w-full' />
        <Skeleton className='h-4 w-2/3' />
      </main>
    </div>
  );
}

// 에러 UI
function PostDetailError({ boardId }: { boardId?: string }) {
  return (
    <div className='min-h-screen bg-background'>
      <main className="container mx-auto px-6 py-2 max-w-4xl text-center">
        <h1 className='mb-4 text-xl md:text-2xl font-semibold text-foreground'>게시물을 찾을 수 없습니다.</h1>
        {boardId && <PostBackButton />}
      </main>
    </div>
  );
}
