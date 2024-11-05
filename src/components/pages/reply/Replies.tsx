import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import ReplyInput from './ReplyInput';
import ReplyList from './ReplyList';
import { firestore } from '../../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface RepliesProps {
  postId: string;
  commentId: string;
}

const Replies: React.FC<RepliesProps> = ({ postId, commentId }) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyCount, setReplyCount] = useState<number>(0);

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
        variant="ghost"
        size="sm"
        className="text-sm text-muted-foreground hover:text-foreground p-0 h-auto font-normal"
        onClick={handleReply}
      >
        {replyingTo === commentId ? '답글 접기' : `답글 ${replyCount}개 보기`}
      </Button>
      {replyingTo === commentId && (
        <div className='space-y-4 border-l-2 border-gray-200 pl-4 mt-2'>
          <ReplyList postId={postId} commentId={commentId} />
          <ReplyInput postId={postId} commentId={commentId} />
        </div>
      )}
    </div>
  );
};

export default Replies;