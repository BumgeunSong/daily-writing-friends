import React from 'react';
import { Comment } from '../../../types/Comment';

interface CommentListProps {
  comments: Comment[];
}

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex items-start space-x-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <p className="font-semibold">{comment.userName}</p>
              <span className="text-xs text-muted-foreground">
                {comment.createdAt?.toDate().toLocaleString()}
              </span>
            </div>
            <p className="text-sm mt-1">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommentList;
