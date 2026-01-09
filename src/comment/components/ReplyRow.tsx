import ReplyInput from '@/comment/components/ReplyInput';
import { useDeleteReply, useEditReply } from '@/comment/hooks/useCreateReply';
import { ContentRow } from './shared/ContentRow';
import type { Reply } from '@/comment/model/Reply';
import type React from 'react';

interface ReplyRowProps {
  reply: Reply;
  boardId: string;
  commentId: string;
  postId: string;
  isAuthor: boolean;
}

const ReplyRow: React.FC<ReplyRowProps> = ({ boardId, reply, commentId, postId, isAuthor }) => {
  const deleteReply = useDeleteReply(boardId, postId, commentId, reply.id);
  const editReply = useEditReply(boardId, postId, commentId, reply.id);

  return (
    <ContentRow
      item={reply}
      contentType="reply"
      isAuthor={isAuthor}
      onEdit={(content) => editReply.mutateAsync(content)}
      onDelete={() => deleteReply.mutateAsync()}
      reactionEntity={{ type: 'reply', boardId, postId, commentId, replyId: reply.id }}
      deleteConfirmMessage="답글을 삭제하시겠습니까?"
      renderInput={(props) => (
        <ReplyInput onSubmit={props.onSubmit} initialValue={props.initialValue} />
      )}
    />
  );
};

export default ReplyRow;
