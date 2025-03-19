import React, { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Reply } from '@/types/Reply';
import ReplyRow from './ReplyRow';
import { useQuery } from '@tanstack/react-query';
import { fetchRepliesOnce } from '@/utils/replyUtils';
import ReplySkeleton from './ReplySkeleton';

interface ReplyListProps {
  boardId: string;
  postId: string;
  commentId: string;
}

// 실제 답글 목록 컴포넌트
const ReplyListContent: React.FC<ReplyListProps> = ({ boardId, postId, commentId }) => {
  const { currentUser } = useAuth();

  const { data: replies = [] } = useQuery<Reply[]>({
    queryKey: ['replies', boardId, postId, commentId],
    queryFn: () => fetchRepliesOnce(boardId, postId, commentId),
    suspense: true,
  });

  if (replies.length === 0) {
    return (
      <div className="py-2 text-center">
        <p className="text-sm text-muted-foreground">아직 답글이 없습니다. 첫 답글을 작성해보세요!</p>
      </div>
    );
  }

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

// 스켈레톤 로딩 UI
const ReplyListFallback: React.FC = () => {
  return (
    <div className='space-y-4'>
      {[...Array(2)].map((_, index) => (
        <ReplySkeleton key={index} />
      ))}
    </div>
  );
};

// 메인 컴포넌트
const ReplyList: React.FC<ReplyListProps> = (props) => {
  return (
    <Suspense fallback={<ReplyListFallback />}>
      <ReplyListContent {...props} />
    </Suspense>
  );
};

export default ReplyList;
