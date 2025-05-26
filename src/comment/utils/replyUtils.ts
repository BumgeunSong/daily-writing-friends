import { collection, onSnapshot, query, orderBy, getDocs, getCountFromServer, where } from 'firebase/firestore';
import { Reply } from '@/comment/model/Reply';
import { firestore } from '@/firebase';

/**
 * 실시간 답글 구독 (blockedUsers 필터링 지원)
 * @param boardId
 * @param postId
 * @param commentId
 * @param setReplies
 * @param blockedUsers 내 컨텐츠 숨김 유저 uid 배열 (userId not-in)
 */
export function fetchReplies(
  boardId: string,
  postId: string,
  commentId: string,
  setReplies: (replies: Reply[]) => void,
  blockedUsers: string[] = []
) {
  const repliesRef = collection(firestore, `boards/${boardId}/posts/${postId}/comments/${commentId}/replies`);
  let repliesQuery = query(repliesRef, orderBy('createdAt', 'asc'));
  // Firestore not-in 조건은 10개 이하만 지원
  if (blockedUsers.length > 0 && blockedUsers.length <= 10) {
    repliesQuery = query(repliesRef, where('userId', 'not-in', blockedUsers), orderBy('createdAt', 'asc'));
  }
  // 10개 초과 시 전체 답글 반환 (제약)
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

/**
 * React Query용 한 번만 실행되는 답글 가져오기 함수 (blockedUsers 필터링 지원)
 * @param boardId
 * @param postId
 * @param commentId
 * @param blockedUsers
 * @returns Reply[]
 */
export const fetchRepliesOnce = async (
  boardId: string,
  postId: string,
  commentId: string,
  blockedUsers: string[] = []
): Promise<Reply[]> => {
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
    let q = query(repliesRef, orderBy('createdAt', 'asc'));
    if (blockedUsers.length > 0 && blockedUsers.length <= 10) {
      q = query(repliesRef, where('userId', 'not-in', blockedUsers), orderBy('createdAt', 'asc'));
    }
    // 10개 초과 시 전체 답글 반환 (제약)
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
    