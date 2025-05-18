import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import { useUserCommentsReplies, UserCommentReply } from '@/user/hooks/useUserCommentsReplies';
import { Skeleton } from '@/shared/ui/skeleton';
import { formatDate } from '@/shared/utils/dateUtils';

interface UserCommentsRepliesTabProps {
  userId: string;
}

export default function UserCommentsRepliesTab({ userId }: UserCommentsRepliesTabProps) {
  const [ref, inView] = useInView();

  // 사용자의 댓글 가져오기
  const {
    data: commentsPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUserCommentsReplies(userId);

  // 모든 페이지의 댓글을 하나의 배열로 합치기
  const allComments = commentsPages?.pages.flatMap(page => page) || [];

  // 마지막 항목이 보일 때 다음 페이지 로드
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // 댓글 카드 렌더링
  const renderCommentCard = (comment: UserCommentReply, index: number) => {
    const isLastItem = index === allComments.length - 1;

    return (
      <div 
        key={`${comment.type}-${comment.createdAt.toMillis()}`} 
        className="rounded-md border p-4 transition-colors hover:border-primary"
        ref={isLastItem ? ref : undefined}
      >
        <Link to={comment.url}>
          <h3 className="text-sm font-medium">{comment.postTitle}</h3>
          <p className="mt-2 line-clamp-2 text-sm">
            {comment.type === 'reply' && <span className="text-primary">↳ </span>}
            {comment.content}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{comment.type === 'comment' ? '댓글' : '답글'}</span>
            <span>{formatDate(comment.createdAt.toDate())}</span>
          </div>
        </Link>
      </div>
    );
  };

  // 로딩 스켈레톤 렌더링
  const renderSkeletons = () => {
    return Array(3).fill(null).map((_, i) => (
      <div key={i} className="rounded-md border p-4">
        <Skeleton className="mb-2 h-4 w-1/2" />
        <Skeleton className="mb-1 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-2/3" />
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
      ) : allComments.length > 0 ? (
        <>
          {allComments.map((comment, index) => renderCommentCard(comment, index))}
          {isFetchingNextPage && (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">더 불러오는 중...</p>
            </div>
          )}
          {!hasNextPage && allComments.length > 0 && (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">모든 댓글을 불러왔습니다.</p>
            </div>
          )}
        </>
      ) : (
        <div className="py-10 text-center">
          <p className="text-muted-foreground">작성한 댓글이 없습니다.</p>
        </div>
      )}
    </div>
  );
} 