import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Reply } from '@/comment/model/Reply';
import { buildNotInQuery } from '@/user/api/user';

/**
 * 답글 목록을 한 번만 가져오는 함수 (blockedByUsers 서버사이드 필터링 지원)
 */
export async function fetchRepliesOnce(
  boardId: string,
  postId: string,
  commentId: string,
  blockedByUsers: string[] = []
): Promise<Reply[]> {
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
  const q = buildNotInQuery(repliesRef, 'userId', blockedByUsers, ['createdAt', 'asc']);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reply));
}

/**
 * 답글 개수 한 번만 가져오기 (blockedByUsers 서버사이드 필터링 지원)
 */
export async function fetchReplyCountOnce(
  boardId: string,
  postId: string,
  commentId: string,
  blockedByUsers: string[] = []
): Promise<number> {
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
  const q = buildNotInQuery(repliesRef, 'userId', blockedByUsers, ['createdAt', 'asc']);
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}
