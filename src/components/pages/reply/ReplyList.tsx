import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Reply } from '@/types/Reply';
import ReplyRow from './ReplyRow';
import { fetchReplies } from '@/utils/replyUtils';

interface ReplyListProps {
  boardId: string;
  postId: string;
  commentId: string;
}

const ReplyList: React.FC<ReplyListProps> = ({ boardId, postId, commentId }) => {
  const [replies, setReplies] = useState<Reply[]>([]);
  const { currentUser } = useAuth();
  useEffect(() => {
    const unsubscribe = fetchReplies(boardId, postId, commentId, setReplies);
    return () => unsubscribe();
  }, [boardId, postId, commentId]);

  return (
    <div className='space-y-4'>
      {replies.map((reply) => (
        <ReplyRow
          key={reply.id}
          boardId={boardId}
          reply={reply}
          isAuthor={currentUser?.uid === reply.userId}
          commentId={commentId}
          postId={postId}
        />
      ))}
    </div>
  );
};

export default ReplyList;
