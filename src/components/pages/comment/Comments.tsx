import React from 'react';
import CommentList from './CommentList';
import CommentInput from './CommentInput';

interface CommentsProps {
  postId: string;
}

const Comments: React.FC<CommentsProps> = ({ postId }) => {
  return (
    <section className="mt-12 space-y-8">
      <h2 className="text-2xl font-semibold">댓글</h2>
      <CommentList postId={postId} />
      <div className="border-t border-gray-200 my-6" />
      <CommentInput postId={postId} />
    </section>
  );
};

export default Comments;