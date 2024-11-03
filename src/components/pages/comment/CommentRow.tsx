import React, { useEffect, useState } from 'react';
import { Comment } from '../../../types/Comment';
import Replies from '../reply/Replies';
import { fetchUserNickname } from '../../../utils/userUtils';
interface CommentRowProps {
  postId: string;
  comment: Comment;
}

const CommentRow: React.FC<CommentRowProps> = ({ postId, comment }) => {
  const [userNickName, setUserNickName] = useState<string | null>(null);

  useEffect(() => {
    fetchUserNickname(comment.userId).then(setUserNickName);
  }, [comment.userId]); 

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-start space-x-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <p className="font-semibold">{userNickName || '??'}</p>
            <span className="text-xs text-muted-foreground">
              {comment.createdAt?.toDate().toLocaleString()}
            </span>
          </div>
          <p className="text-sm mt-2">{comment.content}</p>
          <Replies postId={postId} commentId={comment.id} />
        </div>
      </div>
    </div>
  );
};

export default CommentRow;
