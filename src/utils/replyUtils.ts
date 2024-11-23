import { collection, onSnapshot } from 'firebase/firestore';
import { Reply } from '@/types/Reply';
import { firestore } from '@/firebase';

export function fetchReplies(boardId: string, postId: string, commentId: string, setReplies: (replies: Reply[]) => void) {
  const repliesRef = collection(firestore, `boards/${boardId}/posts/${postId}/comments/${commentId}/replies`);
  const unsubscribe = onSnapshot(repliesRef, (snapshot) => {
    const fetchedReplies = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Reply[];
    setReplies(fetchedReplies);
  });
  return unsubscribe;
}
    