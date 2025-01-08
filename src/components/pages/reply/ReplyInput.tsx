import { Send } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '../../../contexts/AuthContext';

interface ReplyInputProps {
  placeholder?: string;
  initialValue?: string;
  onSubmit: (content: string) => void;
}

const ReplyInput: React.FC<ReplyInputProps> = ({ placeholder, initialValue = '', onSubmit }) => {
  const [newReply, setNewReply] = useState(initialValue);
  const { currentUser } = useAuth();

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newReply.trim()) return;

    try {
      await onSubmit(newReply);
      setNewReply('');
    } catch (error) {
      console.error('답글 추가 오류:', error);
    }
  };

  return (
    <form onSubmit={handleAddReply} className='flex w-full items-center space-x-4'>
      <textarea
        placeholder={placeholder || '댓글을 달아줬다면 답을 해주는 게 인지상정!'}
        value={newReply}
        onChange={(e) => setNewReply(e.target.value)}
        className='flex-1 resize-none rounded border p-2 text-base'
        rows={3} // Adjust the number of rows as needed
      />
      <Button type='submit' size='icon'>
        <Send className='mr-2 size-4' />
      </Button>
    </form>
  );
};

export default ReplyInput;
