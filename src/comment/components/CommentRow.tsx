import { CommentInput } from '@/comment/components/CommentInput';
import { useDeleteComment, useEditComment } from '@/comment/hooks/useCreateComment';
import { ContentRow } from './shared/ContentRow';
import Replies from './Replies';
import type { Comment } from '@/comment/model/Comment';
import type React from 'react';

interface CommentRowProps {
  boardId: string;
  postId: string;
  comment: Comment;
  isAuthor: boolean;
}

const CommentRow: React.FC<CommentRowProps> = ({
  boardId,
  postId,
  comment,
  isAuthor,
}) => {
  const deleteComment = useDeleteComment(boardId, postId, comment.id);
  const editComment = useEditComment(boardId, postId, comment.id);

  return (
    <ContentRow
      item={comment}
      contentType="comment"
      isAuthor={isAuthor}
      onEdit={(content) => editComment.mutateAsync(content)}
      onDelete={() => deleteComment.mutateAsync()}
      reactionEntity={{ type: 'comment', boardId, postId, commentId: comment.id }}
      deleteConfirmMessage="댓글을 삭제하시겠습니까?"
      renderInput={(props) => (
        <CommentInput
          onSubmit={props.onSubmit}
          initialValue={props.initialValue}
          postId={postId}
          boardId={boardId}
          enableSuggestions={false}
        />
      )}
    >
      <div className="flex flex-col space-y-1">
        <Replies boardId={boardId} postId={postId} commentId={comment.id} />
      </div>
    </ContentRow>
  );
};

export default CommentRow;
