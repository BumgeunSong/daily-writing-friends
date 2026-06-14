import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useLayoutEffect } from 'react';
import { useNavigate, useParams } from '@/shared/navigation';

// Comments below the fold — lazy chunk lets LCP candidate paint first.
const Comments = lazy(() => import('@/comment/components/Comments'));
import { usePostDelete } from '@/post/hooks/usePostDelete';
import { postQueryKey } from '@/post/utils/postQueryKeys';
import { fetchPost } from '@/post/utils/postUtils';
import { useAuth } from '@/shared/hooks/useAuth';
import { Skeleton } from '@/shared/ui/skeleton';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { useUser } from '@/user/hooks/useUser';
import { PostAdjacentButtons } from './PostAdjacentButtons';
import { PostBackButton } from './PostBackButton';
import { PostContent } from './PostContent';
import { PostDetailHeader } from './PostDetailHeader';
import { PostLikeButton } from './PostLikeButton';
import { PostMetaHelmet } from './PostMetaHelmet';

export default function PostDetailPage() {
  const { postId, boardId } = useParams<{ postId: string; boardId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const handleDelete = usePostDelete();

  const {
    data: post,
    isLoading,
    error,
  } = useQuery(postQueryKey(boardId!, postId!), () => fetchPost(boardId!, postId!), {
    enabled: !!boardId && !!postId,
  });

  // PostCard에서 이미 캐시된 author 데이터 활용
  const { userData: authorData } = useUser(post?.authorId ?? null);
  const authorNickname = getUserDisplayName(authorData);

  // PostDetail은 진입 시 항상 상단부터 보여야 한다. BoardPage(긴 피드) → PostDetail(짧은 글)
  // 전환 시 브라우저가 이전 scrollY를 새 문서의 max로 클램프하므로, 그대로 두면 글의 하단
  // (또는 중간)부터 보인다. mutation phase 안에서 동기적으로 0으로 맞춰 view-transition
  // 새 스냅샷이 상단을 캡처하게 한다 — useEffect는 paint 이후라 잠깐 클램프된 위치가
  // 보였다가 점프하므로 부적합. postId 의존성은 PostAdjacentButtons로 같은 컴포넌트가
  // 재사용되는 경우(다음/이전 글) 대비.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [postId]);

  if (isLoading) return <PostDetailSkeleton />;
  if (error || !post) return <PostDetailError boardId={boardId} />;

  const isAuthor = currentUser?.uid === post.authorId;

  return (
    <div className='min-h-screen bg-background'>
      <PostMetaHelmet post={post} boardId={boardId} postId={postId} />
      <main className='container mx-auto max-w-4xl overflow-x-hidden px-6 py-2'>
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

        <div className='mt-6 flex items-center justify-between border-t border-border py-4'>
          {boardId && postId && (
            <PostLikeButton boardId={boardId} postId={postId} authorId={post.authorId} />
          )}
          {boardId && postId && <PostAdjacentButtons boardId={boardId} postId={postId} />}
        </div>
        <div className='my-4 border-t border-border' />
        <div>
          {boardId && postId && (
            <Suspense fallback={null}>
              <Comments
                boardId={boardId}
                postId={postId}
                postAuthorId={post.authorId}
                postAuthorNickname={typeof authorNickname === 'string' ? authorNickname : null}
                postVisibility={post.visibility}
              />
            </Suspense>
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
      <main className='container mx-auto max-w-4xl px-6 py-2'>
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
      <main className='container mx-auto max-w-4xl px-6 py-2 text-center'>
        <h1 className='mb-4 text-xl font-semibold text-foreground md:text-2xl'>
          게시물을 찾을 수 없습니다.
        </h1>
        {boardId && <PostBackButton />}
      </main>
    </div>
  );
}
