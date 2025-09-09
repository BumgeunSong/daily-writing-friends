import { useMutation } from '@tanstack/react-query';
import { Send, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { CommentSuggestions } from './CommentSuggestions';
import type React from 'react';

interface CommentInputProps {
  initialValue?: string;
  placeholder?: string;
  onSubmit: (content: string) => Promise<void>;
  postId?: string;
  boardId?: string;
  enableSuggestions?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  initialValue = '',
  placeholder,
  onSubmit,
  postId,
  boardId,
  enableSuggestions = true,
}) => {
  const [newComment, setNewComment] = useState(initialValue);
  const { currentUser } = useAuth();

  const mutation = useMutation({
    mutationFn: (content: string) => onSubmit(content),
    onSuccess: () => setNewComment(''),
  });

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim() || mutation.isLoading) return;

    mutation.mutate(newComment);
  };

  return (
    <div className='w-full space-y-4'>
      {/* Comment Suggestions */}
      {enableSuggestions && postId && boardId && (
        <CommentSuggestions
          postId={postId}
          boardId={boardId}
          onSuggestionSelect={setNewComment}
          enabled={enableSuggestions}
        />
      )}

      {/* Comment Input Form */}
      <form onSubmit={handleAddComment} className='flex w-full items-center space-x-4'>
        <Textarea
          placeholder={placeholder || '재밌게 읽었다면 댓글로 글값을 남겨볼까요?'}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className='flex-1 resize-none text-base'
        />
        <Button type='submit' variant='default' size='icon' disabled={mutation.isLoading}>
          {mutation.isLoading ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <Send className='size-4' />
          )}
        </Button>
      </form>
    </div>
  );
};
