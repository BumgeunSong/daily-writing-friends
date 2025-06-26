import React from 'react';
import CommentRow from '@/comment/components/CommentRow';
import { useComments } from '@/comment/hooks/useComments';
import { Comment } from '@/comment/model/Comment';

interface CommentListProps {
  boardId: string;
  postId: string;
  currentUserId?: string;
}

// 실제 댓글 목록 컴포넌트
const CommentListContent: React.FC<CommentListProps> = ({ boardId, postId, currentUserId }) => {
  const { comments } = useComments(boardId, postId);

  // 댓글 목록 렌더링
  return (
    <div className='space-y-6'>
      {comments.map((comment: Comment) => (
        <CommentRow
          key={comment.id}
          boardId={boardId}
          postId={postId}
          comment={comment}
          isAuthor={comment.userId === currentUserId}
        />
      ))}
    </div>
  );
};

// 메인 컴포넌트
const CommentList: React.FC<CommentListProps> = ({ boardId, postId, currentUserId }) => {
  return (
    <div className='space-y-6'>
      <CommentListContent boardId={boardId} postId={postId} currentUserId={currentUserId} />
    </div>
  );
};

export default CommentList;
