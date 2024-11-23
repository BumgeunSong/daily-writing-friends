import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { Reply } from '@/types/Reply';
import ReplyRow from './ReplyRow';
import { firestore } from '../../../firebase';

interface ReplyListProps {
  boardId: string;
  postId: string;
  commentId: string;
}

const ReplyList: React.FC<ReplyListProps> = ({ boardId, postId, commentId }) => {
  const [replies, setReplies] = useState<Reply[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    const repliesRef = collection(firestore, `boards/${boardId}/posts/${postId}/comments/${commentId}/replies`);
    const repliesQuery = query(repliesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(repliesQuery, (snapshot) => {
      const fetchedReplies = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Reply[];
      setReplies(fetchedReplies);
    });

    return () => unsubscribe();
  }, [boardId, postId, commentId]);

  return (
    <div className='space-y-4'>
      {replies.map((reply) => (
        <ReplyRow
          key={reply.id}
          boardId={boardId}
          reply={reply}
          isAuthor={currentUser?.uid === reply.userId}
          commentId={commentId}
          postId={postId}
        />
      ))}
    </div>
  );
};

export default ReplyList;
