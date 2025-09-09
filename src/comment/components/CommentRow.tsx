import { Edit, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { CommentInput } from '@/comment/components/CommentInput';
import ReactionList from '@/comment/components/ReactionList';
import { useDeleteComment, useEditComment } from '@/comment/hooks/useCreateComment';
import { sanitizeCommentContent } from '@/post/utils/contentUtils';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { useUser } from '@/user/hooks/useUser';
import Replies from './Replies';
import type { Comment } from '@/comment/model/Comment';
import type React from 'react';

interface CommentRowProps {
  boardId: string;
  postId: string;
  comment: Comment;
  isAuthor: boolean;
}

const CommentRow: React.FC<CommentRowProps> = ({ boardId, postId, comment, isAuthor }) => {
  const [isEditing, setIsEditing] = useState(false);
  const deleteComment = useDeleteComment(boardId, postId, comment.id);
  const editComment = useEditComment(boardId, postId, comment.id);

  const { userData: userProfile } = useUser(comment.userId);

  const handleEditToggle = async () => {
    setIsEditing((prev) => !prev);
  };

  const handleDelete = async () => {
    if (window.confirm('댓글을 삭제하시겠습니까?')) {
      await deleteComment.mutateAsync();
    }
  };

  const handleEditSubmit = async (content: string) => {
    await editComment.mutateAsync(content);
    setIsEditing(false);
  };

  const EditIcon = isEditing ? X : Edit;
  const sanitizedContent = sanitizeCommentContent(comment.content);

  return (
    <div className='flex flex-col space-y-3 pb-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-3'>
          <Avatar className='size-6'>
            <AvatarImage
              src={userProfile?.profilePhotoURL || undefined}
              alt={getUserDisplayName(userProfile) || 'User'}
              className='object-cover'
            />
            <AvatarFallback className='text-sm'>
              {getUserDisplayName(userProfile)?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <p className='text-base font-semibold leading-none'>{getUserDisplayName(userProfile)}</p>
          <span className='text-sm text-muted-foreground'>
            {comment.createdAt?.toDate().toLocaleString()}
          </span>
        </div>
        {isAuthor && (
          <div className='flex items-center space-x-1'>
            <Button variant='ghost' size='sm' onClick={handleEditToggle} className='h-6 px-2'>
              <EditIcon className='size-4' />
            </Button>
            <Button variant='destructive' size='sm' onClick={handleDelete} className='h-6 px-2'>
              <Trash2 className='size-4' />
            </Button>
          </div>
        )}
      </div>
      <div className='text-base'>
        {isEditing ? (
          <CommentInput 
            onSubmit={handleEditSubmit} 
            initialValue={comment.content}
            postId={postId}
            boardId={boardId}
            enableSuggestions={false}
          />
        ) : (
          <div
            className='prose prose-slate whitespace-pre-wrap dark:prose-invert'
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        )}
      </div>
      <ReactionList entity={{ type: 'comment', boardId, postId, commentId: comment.id }} />
      <div className='flex flex-col space-y-1'>
        <Replies boardId={boardId} postId={postId} commentId={comment.id} />
      </div>
    </div>
  );
};

export default CommentRow;
