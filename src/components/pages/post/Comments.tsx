import React, { useState, useEffect } from 'react';
import { Comment } from '../../../types/Comment';
import { firestore } from '../../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import CommentList from './CommentList';
import CommentInput from './CommentInput';

interface CommentsProps {
  postId: string;
}

const Comments: React.FC<CommentsProps> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    const postRef = collection(firestore, 'posts', postId, 'comments');
    const commentsQuery = query(postRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(fetchedComments);
    });

    return () => unsubscribe();
  }, [postId]);

  return (
    <Card className="mt-8">
      <CardHeader>
        <h2 className="text-xl font-semibold">댓글</h2>
      </CardHeader>
      <CardContent>
        <CommentList comments={comments} />
      </CardContent>
      <CardFooter>
        <CommentInput postId={postId} />
      </CardFooter>
    </Card>
  );
};

export default Comments;
