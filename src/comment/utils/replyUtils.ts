import { collection, onSnapshot, query, orderBy, getDocs, getCountFromServer } from 'firebase/firestore';
import { Reply } from '@/comment/model/Reply';
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

// React Query용 한 번만 실행되는 답글 가져오기 함수
export const fetchRepliesOnce = async (boardId: string, postId: string, commentId: string): Promise<Reply[]> => {
  try {
    const repliesRef = collection(
      firestore, 
      'boards', 
      boardId, 
      'posts', 
      postId, 
      'comments',
      commentId,
      'replies'
    );
    
    const q = query(repliesRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Reply));
  } catch (error) {
    console.error('답글을 가져오는 중 오류 발생:', error);
    throw new Error('답글을 불러올 수 없습니다.');
  }
};

// React Query용 한 번만 실행되는 답글 개수 가져오기 함수
export const fetchReplyCountOnce = async (boardId: string, postId: string, commentId: string): Promise<number> => {
  try {
    const repliesRef = collection(
      firestore, 
      'boards', 
      boardId, 
      'posts', 
      postId, 
      'comments',
      commentId,
      'replies'
    );
    
    const snapshot = await getCountFromServer(repliesRef);
    return snapshot.data().count;
  } catch (error) {
    console.error('답글 개수를 가져오는 중 오류 발생:', error);
    return 0;
  }
};
    