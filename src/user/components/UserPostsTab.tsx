import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import { Skeleton } from '@shared/ui/skeleton';
import { formatDate } from '@shared/utils/dateUtils';
import { useUserPosts } from '@/user/hooks/useUserPosts';

interface UserPostsTabProps {
  userId: string;
}

export default function UserPostsTab({ userId }: UserPostsTabProps) {
  const [ref, inView] = useInView();

  // 사용자의 게시글 가져오기
  const {
    data: postsPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUserPosts(userId);

  // 모든 페이지의 게시글을 하나의 배열로 합치기
  const allPosts = postsPages?.pages.flatMap(page => page) || [];

  // 마지막 항목이 보일 때 다음 페이지 로드
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // 게시글 카드 렌더링
  const renderPostCard = (post: any, index: number) => {
    const isLastItem = index === allPosts.length - 1;

    return (
      <div 
        key={post.id} 
        className="rounded-md border p-4 transition-colors hover:border-primary"
        ref={isLastItem ? ref : undefined}
      >
        <Link to={`/board/${post.boardId}/post/${post.id}`}>
          <h3 className="font-medium">{post.title}</h3>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{post.boardTitle}</span>
            <span>{formatDate(post.createdAt?.toDate())}</span>
          </div>
        </Link>
      </div>
    );
  };

  // 로딩 스켈레톤 렌더링
  const renderSkeletons = () => {
    return Array(3).fill(null).map((_, i) => (
      <div key={i} className="rounded-md border p-4">
        <Skeleton className="mb-2 h-5 w-3/4" />
        <div className="mt-2 flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        renderSkeletons()
      ) : allPosts.length > 0 ? (
        <>
          {allPosts.map((post, index) => renderPostCard(post, index))}
          {isFetchingNextPage && (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">더 불러오는 중...</p>
            </div>
          )}
          {!hasNextPage && allPosts.length > 0 && (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">모든 글을 불러왔습니다.</p>
            </div>
          )}
        </>
      ) : (
        <div className="py-10 text-center">
          <p className="text-muted-foreground">작성한 글이 없습니다.</p>
        </div>
      )}
    </div>
  );
} 