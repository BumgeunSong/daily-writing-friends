import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle } from 'lucide-react';
import ReplyInput from './ReplyInput';
import ReplyList from './ReplyList';

interface RepliesProps {
  postId: string;
  commentId: string;
}

const Replies: React.FC<RepliesProps> = ({ postId, commentId }) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleReply = () => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
  };

  return (
    <div className='ml-2'>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 text-muted-foreground hover:text-foreground"
        onClick={handleReply}
      >
        <MessageCircle className="h-2 w-2" />
        {replyingTo === commentId ? '취소' : '답글'}
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
