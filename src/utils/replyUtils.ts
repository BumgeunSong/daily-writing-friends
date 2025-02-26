import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Reply } from '@/types/Reply';
import { firestore } from '@/firebase';

export function fetchReplies(boardId: string, postId: string, commentId: string, setReplies: (replies: Reply[]) => void) {
  const repliesRef = collection(firestore, `boards/${boardId}/posts/${postId}/comments/${commentId}/replies`);
  const repliesQuery = query(repliesRef, orderBy('createdAt', 'asc'));
  const unsubscribe = onSnapshot(repliesQuery, (snapshot) => {
    const fetchedReplies = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Reply[];
    
    setReplies(fetchedReplies);
  });
  return unsubscribe;
}

export function fetchReplyCount(boardId: string, postId: string, commentId: string, setReplyCount: (count: number) => void) {
  const repliesRef = collection(firestore, `boards/${boardId}/posts/${postId}/comments/${commentId}/replies`);
  const unsubscribe = onSnapshot(repliesRef, (snapshot) => {
    setReplyCount(snapshot.size);
  });
  return unsubscribe;
}
    