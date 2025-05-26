import { useReplies } from '@/comment/hooks/useReplies';
import { Reply } from '@/comment/model/Reply';
import React from 'react';
import ReplyRow from './ReplyRow';

interface ReplyListProps {
  boardId: string;
  postId: string;
  commentId: string;
  currentUserId?: string;
}

const ReplyList: React.FC<ReplyListProps> = ({ boardId, postId, commentId, currentUserId }) => {
  const { replies } = useReplies(boardId, postId, commentId);

  return (
    <div className='space-y-4'>
      {replies.map((reply: Reply) => (
        <ReplyRow
          key={reply.id}
          boardId={boardId}
          postId={postId}
          commentId={commentId}
          reply={reply}
          isAuthor={reply.userId === currentUserId}
        />
      ))}
    </div>
  );
};

export default ReplyList;
