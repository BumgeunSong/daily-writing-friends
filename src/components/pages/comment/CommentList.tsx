import { onSnapshot, orderBy, query, collection } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { firestore } from '@/firebase';
import CommentRow from './CommentRow';
import { Comment } from '../../../types/Comment';

interface CommentListProps {
  boardId: string;
  postId: string;
}

const CommentList: React.FC<CommentListProps> = ({ boardId, postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    const postRef = collection(firestore, `boards/${boardId}/posts/${postId}/comments`);
    const commentsQuery = query(postRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
      setComments(fetchedComments);
    });

    return () => unsubscribe();
  }, [boardId, postId]);

  return (
    <div className='space-y-6'>
      {comments.map((comment) => (
        <CommentRow
          key={comment.id}
          boardId={boardId}
          postId={postId}
          comment={comment}
          isAuthor={comment.userId === currentUser?.uid}
        />
      ))}
    </div>
  );
};

export default CommentList;
