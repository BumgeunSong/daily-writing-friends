import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Reply } from '@/types/Reply';
import ReplyRow from './ReplyRow';
import { useQuery } from '@tanstack/react-query';
import { fetchRepliesOnce } from '@/utils/replyUtils';

interface ReplyListProps {
  boardId: string;
  postId: string;
  commentId: string;
}

const ReplyList: React.FC<ReplyListProps> = ({ boardId, postId, commentId }) => {
  const { currentUser } = useAuth();

  const { data: replies = [] } = useQuery<Reply[]>({
    queryKey: ['replies', boardId, postId, commentId],
    queryFn: () => fetchRepliesOnce(boardId, postId, commentId),
    suspense: true,
  });
  // 답글 목록 렌더링
  return (
    <div className='space-y-4'>
      {replies.map((reply) => (
        <ReplyRow
          key={reply.id}
          boardId={boardId}
          postId={postId}
          commentId={commentId}
          reply={reply}
          isAuthor={reply.userId === currentUser?.uid}
        />
      ))}
    </div>
  );
};

export default ReplyList;
