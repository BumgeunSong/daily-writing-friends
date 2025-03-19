import React, { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CommentRow from './CommentRow';
import CommentSkeleton from './CommentSkeleton';
import { Comment } from '@/types/Comment';
import { useQuery } from '@tanstack/react-query';
import { fetchCommentsOnce } from '@/utils/commentUtils';

interface CommentListProps {
  boardId: string;
  postId: string;
}

// 실제 댓글 목록 컴포넌트
const CommentListContent: React.FC<CommentListProps> = ({ boardId, postId }) => {
  const { currentUser } = useAuth();

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', boardId, postId],
    queryFn: () => fetchCommentsOnce(boardId, postId),
    suspense: true,
  });

  if (comments.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">아직 댓글이 없습니다. 첫 댓글을 작성해보세요!</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {comments.map((comment) => (
        <CommentRow
          key={comment.id}
          boardId={boardId}
          postId={postId}
          comment={comment}
          isAuthor={comment.userId === currentUser?.uid}
        />
      ))}
    </div>
  );
};

// 스켈레톤 로딩 UI
const CommentListFallback: React.FC = () => {
  return (
    <div className='space-y-6'>
      {[...Array(3)].map((_, index) => (
        <CommentSkeleton key={index} />
      ))}
    </div>
  );
};

// 메인 컴포넌트
const CommentList: React.FC<CommentListProps> = ({ boardId, postId }) => {
  return (
    <Suspense fallback={<CommentListFallback />}>
      <CommentListContent boardId={boardId} postId={postId} />
    </Suspense>
  );
};

export default CommentList;
