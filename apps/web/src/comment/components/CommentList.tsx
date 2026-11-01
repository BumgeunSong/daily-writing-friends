import type React from 'react';
import CommentRow from '@/comment/components/CommentRow';
import { useComments } from '@/comment/hooks/useComments';
import { usePrefetchCommentReactions } from '@/comment/hooks/usePrefetchCommentReactions';
import type { Comment } from '@/comment/model/Comment';
import type { PostVisibility } from '@/post/model/Post';

interface CommentListProps {
  boardId: string;
  postId: string;
  currentUserId?: string;
  postVisibility?: PostVisibility;
}

const CommentList: React.FC<CommentListProps> = ({
  boardId,
  postId,
  currentUserId,
  postVisibility,
}) => {
  const { comments } = useComments(boardId, postId);

  // Gate rendering until the batch resolves to prevent an N+1 race with useReactions()
  const { isSuccess: isReactionsCacheReady } = usePrefetchCommentReactions(boardId, postId, comments);

  if (!isReactionsCacheReady) return null;

  return (
    <div className='dwf-content-stagger space-y-6'>
      {comments.map((comment: Comment) => (
        <CommentRow
          key={comment.id}
          boardId={boardId}
          postId={postId}
          comment={comment}
          isAuthor={comment.userId === currentUserId}
          postVisibility={postVisibility}
        />
      ))}
    </div>
  );
};

export default CommentList;
