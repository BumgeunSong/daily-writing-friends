import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Comment } from '@/types/Comment';
import { fetchCommentsOnce } from '@/utils/commentUtils';
import CommentRow from './CommentRow';

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

  // 댓글 목록 렌더링
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

// 메인 컴포넌트
const CommentList: React.FC<CommentListProps> = ({ boardId, postId }) => {
  return (
    <div className='space-y-6'>
      <CommentListContent boardId={boardId} postId={postId} />
    </div>
  );
};

export default CommentList;
