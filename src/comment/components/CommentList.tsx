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

// 실제 댓글 목록 컴포넌트
const CommentListContent: React.FC<CommentListProps> = ({
  boardId,
  postId,
  currentUserId,
  postVisibility,
}) => {
  const { comments } = useComments(boardId, postId);

  // Batch-prefetch reactions for all comments (seeds individual caches)
  // Gate rendering until batch resolves to prevent N+1 race with useReactions()
  const { isSuccess: isReactionsCacheReady } = usePrefetchCommentReactions(boardId, postId, comments);

  if (!isReactionsCacheReady) return null;

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
          postVisibility={postVisibility}
        />
      ))}
    </div>
  );
};

// 메인 컴포넌트
const CommentList: React.FC<CommentListProps> = ({
  boardId,
  postId,
  currentUserId,
  postVisibility,
}) => {
  return (
    <div className='space-y-6'>
      <CommentListContent
        boardId={boardId}
        postId={postId}
        currentUserId={currentUserId}
        postVisibility={postVisibility}
      />
    </div>
  );
};

export default CommentList;
