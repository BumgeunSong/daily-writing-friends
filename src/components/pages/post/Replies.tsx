import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle } from 'lucide-react';
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
    <div className='ml-4'>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 text-muted-foreground hover:text-foreground"
        onClick={handleReply}
      >
        <MessageCircle className="h-2 w-2" />
        {replyingTo === commentId ? '취소' : `댓글 ${replyCount}개`}
      </Button>
      {replyingTo === commentId && (
        <div className='mt-2'>
          <ReplyList postId={postId} commentId={commentId} />
          <ReplyInput postId={postId} commentId={commentId} />
        </div>
      )}
    </div>
  );
};

export default Replies;
