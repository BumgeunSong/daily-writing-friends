import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CommentRow from './CommentRow';
import { Comment } from '../../../types/Comment';
import { fetchComments } from '@/utils/commentUtils';

interface CommentListProps {
  boardId: string;
  postId: string;
}

const CommentList: React.FC<CommentListProps> = ({ boardId, postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const { currentUser } = useAuth();
  useEffect(() => {
    const unsubscribe = fetchComments(boardId, postId, setComments);
    return () => unsubscribe();
  }, [boardId, postId]);

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

export default CommentList;
