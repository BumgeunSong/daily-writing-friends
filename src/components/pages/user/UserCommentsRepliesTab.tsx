import { useInView } from 'react-intersection-observer';
import { useUserCommentsReplies, UserComment } from '@/hooks/useUserCommentsReplies';
import { formatDate } from '@/utils/dateUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

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
  const renderCommentCard = (comment: UserComment, index: number) => {
    const isLastItem = index === allComments.length - 1;

    return (
      <div 
        key={comment.id} 
        className="p-4 border rounded-md hover:border-primary transition-colors"
        ref={isLastItem ? ref : undefined}
      >
        <Link to={`/board/${comment.boardId}/post/${comment.postId}`}>
          <h3 className="font-medium text-sm">{comment.postTitle}</h3>
          <p className="text-sm mt-2 line-clamp-2">
            {comment.isReply && <span className="text-primary">↳ </span>}
            {comment.content}
          </p>
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>{comment.boardTitle}</span>
            <span>{formatDate(comment.createdAt)}</span>
          </div>
        </Link>
      </div>
    );
  };

  // 로딩 스켈레톤 렌더링
  const renderSkeletons = () => {
    return Array(3).fill(null).map((_, i) => (
      <div key={i} className="p-4 border rounded-md">
        <Skeleton className="h-4 w-1/2 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3 mb-2" />
        <div className="flex justify-between items-center mt-2">
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
        <div className="text-center py-10">
          <p className="text-muted-foreground">작성한 댓글이 없습니다.</p>
        </div>
      )}
    </div>
  );
} 