import DOMPurify from 'dompurify';
import { Edit, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { deleteCommentToPost, updateCommentToPost } from '@/utils/commentUtils';
import { sanitizeCommentContent } from '@/utils/contentUtils';
import CommentInput from './CommentInput';
import { Comment } from '../../../types/Comment';
import { fetchUserNickname } from '../../../utils/userUtils';
import Replies from '../reply/Replies';

interface CommentRowProps {
  boardId: string;
  postId: string;
  comment: Comment;
  isAuthor: boolean;
}

const CommentRow: React.FC<CommentRowProps> = ({ boardId, postId, comment, isAuthor }) => {
  const [userNickName, setUserNickName] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleEditToggle = async () => {
    setIsEditing((prev) => !prev);
  };

  const handleDelete = async () => {
    if (window.confirm('댓글을 삭제하시겠습니까?')) {
      await deleteCommentToPost(boardId, postId, comment.id);
    }
  };

  const handleEditSubmit = async (content: string) => {
    await updateCommentToPost(boardId, postId, comment.id, content);
    setIsEditing(false);
  };

  useEffect(() => {
    fetchUserNickname(comment.userId).then(setUserNickName);
  }, [comment.userId]);

  const EditIcon = isEditing ? X : Edit;
  const sanitizedContent = sanitizeCommentContent(comment.content);

  return (
    <div className='flex flex-col space-y-4'>
      <div className='flex items-start space-x-4'>
        <div className='flex-1'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <p className='text-lg font-semibold'>{userNickName || '??'}</p>
              <span className='text-sm text-muted-foreground'>
                {comment.createdAt?.toDate().toLocaleString()}
              </span>
            </div>
            {isAuthor && (
              <div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleEditToggle}
                  className='text-primary'
                >
                  <EditIcon className='size-4' />
                </Button>
                <Button variant='outline' size='sm' className='text-red-500' onClick={handleDelete}>
                  <Trash2 className='size-4' />
                </Button>
              </div>
            )}
          </div>
          <div className='prose mt-2 text-base'>
            {isEditing ? (
              <CommentInput onSubmit={handleEditSubmit} initialValue={comment.content} />
            ) : (
              <div
                className='whitespace-pre-wrap'
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            )}
          </div>
        </div>
      </div>
      <Replies boardId={boardId} postId={postId} commentId={comment.id} />
    </div>
  );
};

export default CommentRow;
