import React, { useEffect, useState } from 'react';
import { firestore } from '../../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Reply } from '@/types/Reply';
import ReplyRow from './ReplyRow';
import { useAuth } from '@/contexts/AuthContext';

interface ReplyListProps {
  postId: string;
  commentId: string;
}

const ReplyList: React.FC<ReplyListProps> = ({ postId, commentId }) => {
  const [replies, setReplies] = useState<Reply[]>([]);
  const { currentUser } = useAuth();



  useEffect(() => {
    const repliesRef = collection(firestore, 'posts', postId, 'comments', commentId, 'replies');
    const repliesQuery = query(repliesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(repliesQuery, (snapshot) => {
      const fetchedReplies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reply[];
      setReplies(fetchedReplies);
    });

    return () => unsubscribe();
  }, [postId, commentId]);

  return (
    <div className="space-y-4">
      {replies.map((reply) => (
        <ReplyRow
          key={reply.id}
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