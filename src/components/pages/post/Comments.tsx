import React from 'react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import CommentList from './CommentList';
import CommentInput from './CommentInput';

interface CommentsProps {
  postId: string;
}

const Comments: React.FC<CommentsProps> = ({ postId }) => {
  
  return (
    <Card className="mt-8">
      <CardHeader>
        <h2 className="text-xl font-semibold">댓글</h2>
      </CardHeader>
      <CardContent>
        <CommentList postId={postId} />
      </CardContent>
      <CardFooter>
        <CommentInput postId={postId} />
      </CardFooter>
    </Card>
  );
};

export default Comments;
