import { Edit, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { CommentHeader } from '@/comment/components/CommentHeader';
import ReactionList from '@/comment/components/ReactionList';
import ReplyInput from '@/comment/components/ReplyInput';
import { useDeleteReply, useEditReply } from '@/comment/hooks/useCreateReply';
import { sanitizeCommentContent } from '@/post/utils/contentUtils';
import { Button } from '@/shared/ui/button';
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
  const [isEditing, setIsEditing] = useState(false);
  const deleteReply = useDeleteReply(boardId, postId, commentId, reply.id);
  const editReply = useEditReply(boardId, postId, commentId, reply.id);

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
  };

  const handleDelete = async () => {
    if (window.confirm('답글을 삭제하시겠습니까?')) {
      await deleteReply.mutateAsync();
    }
  };

  const handleEditSubmit = async (content: string) => {
    await editReply.mutateAsync(content);
    setIsEditing(false);
  };

  const EditIcon = isEditing ? X : Edit;
  const sanitizedContent = sanitizeCommentContent(reply.content);

  return (
    <div className='group flex flex-col space-y-3 pb-4'>
      <div className='flex items-center justify-between'>
        <CommentHeader userId={reply.userId} createdAt={reply.createdAt} />
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
          <ReplyInput onSubmit={handleEditSubmit} initialValue={reply.content} />
        ) : (
          <div
            className='prose prose-slate whitespace-pre-wrap dark:prose-invert'
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        )}
      </div>

      <ReactionList entity={{ type: 'reply', boardId, postId, commentId, replyId: reply.id }} />
    </div>
  );
};

export default ReplyRow;
