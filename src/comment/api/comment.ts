import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Comment } from '@/comment/model/Comment';
import { buildNotInQuery } from '@/user/api/user';

/**
 * 댓글 목록을 한 번만 가져오는 함수 (blockedByUsers 서버사이드 필터링 지원)
 */
export async function fetchCommentsOnce(
  boardId: string,
  postId: string,
  blockedByUsers: string[] = []
): Promise<Comment[]> {
  const commentsRef = collection(
    firestore,
    'boards',
    boardId,
    'posts',
    postId,
    'comments'
  );
  const q = buildNotInQuery(commentsRef, 'userId', blockedByUsers, ['createdAt', 'asc']);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Comment));
}
