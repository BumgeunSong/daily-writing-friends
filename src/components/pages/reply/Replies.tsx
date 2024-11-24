import { collection, onSnapshot } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { addReplyToComment } from '@/utils/commentUtils';
import ReplyInput from './ReplyInput';
import ReplyList from './ReplyList';
import { firestore } from '../../../firebase';

interface RepliesProps {
  boardId: string;
  postId: string;
  commentId: string;
}

const Replies: React.FC<RepliesProps> = ({ boardId, postId, commentId }) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyCount, setReplyCount] = useState<number>(0);
  const { currentUser } = useAuth();

  const handleSubmit = async (content: string) => {
    await addReplyToComment(
      boardId,
      postId,
      commentId,
      content,
      currentUser.uid,
      currentUser.displayName,
      currentUser.photoURL,
    );
  };

  useEffect(() => {
    const repliesRef = collection(firestore, 'posts', postId, 'comments', commentId, 'replies');
    const unsubscribe = onSnapshot(repliesRef, (snapshot) => {
      setReplyCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [postId, commentId]);

  const handleReply = () => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
  };

  return (
    <div className='mt-4 space-y-4'>
      <Button
        variant='ghost'
        size='sm'
        className='h-auto p-0 text-sm font-normal text-muted-foreground hover:text-foreground'
        onClick={handleReply}
      >
        {replyingTo === commentId ? '답글 접기' : `답글 ${replyCount}개 보기`}
      </Button>
      {replyingTo === commentId && (
        <div className='mt-2 space-y-4 border-l-2 border-gray-200 pl-4'>
          <ReplyList boardId={boardId} postId={postId} commentId={commentId} />
          <ReplyInput onSubmit={handleSubmit} />
        </div>
      )}
    </div>
  );
};

export default Replies;
