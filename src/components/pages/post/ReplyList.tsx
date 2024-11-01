import React, { useEffect, useState } from 'react';
import { firestore } from '../../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Reply } from '@/types/Reply';

interface ReplyListProps {
  postId: string;
  commentId: string;
}

const ReplyList: React.FC<ReplyListProps> = ({ postId, commentId }) => {
  const [replies, setReplies] = useState<Reply[]>([]);

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
        <div key={reply.id} className="flex items-start space-x-4 mt-2">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <p className="font-semibold">{reply.userName}</p>
              <span className="text-xs text-muted-foreground">
                {reply.createdAt?.toDate().toLocaleString()}
              </span>
            </div>
            <p className="text-sm mt-1">{reply.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReplyList;
