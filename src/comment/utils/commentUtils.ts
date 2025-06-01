import { collection, getDocs, query, orderBy, onSnapshot, QueryDocumentSnapshot, DocumentData, where } from 'firebase/firestore';
import { Comment } from '@/comment/model/Comment';
import { firestore } from '@/firebase';

/**
 * 실시간 댓글 구독 (blockedBy 서버사이드 필터링 지원)
 * @param boardId
 * @param postId
 * @param setComments
 * @param blockedByUsers 내 blockedBy uid 배열 (userId not-in)
 */
export function fetchComments(
  boardId: string,
  postId: string,
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>,
  blockedByUsers: string[] = []
) {
  const commentsRef = collection(firestore, `boards/${boardId}/posts/${postId}/comments`);
  let commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));
  if (blockedByUsers.length > 0 && blockedByUsers.length <= 10) {
    commentsQuery = query(commentsRef, where('userId', 'not-in', blockedByUsers), orderBy('createdAt', 'asc'));
  }
  // 10개 초과 시 전체 댓글 반환 (제약)
  return onSnapshot(commentsQuery, async (snapshot) => {
    const comments = await Promise.all(snapshot.docs.map((doc) => mapDocToComment(doc)));
    setComments(comments);
  });
};

async function mapDocToComment(docSnap: QueryDocumentSnapshot<DocumentData>): Promise<Comment> {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    content: data.content,
    userId: data.userId,
    userName: data.userName,
    userProfileImage: data.userProfileImage,
    createdAt: data.createdAt,
  };
}

/**
 * React Query용 한 번만 실행되는 댓글 가져오기 함수 (blockedBy 서버사이드 필터링 지원)
 * @param boardId
 * @param postId
 * @param blockedByUsers
 * @returns Comment[]
 */
export const fetchCommentsOnce = async (boardId: string, postId: string, blockedByUsers: string[] = []): Promise<Comment[]> => {
  try {
    const commentsRef = collection(
      firestore, 
      'boards', 
      boardId, 
      'posts', 
      postId, 
      'comments'
    );
    let q = query(commentsRef, orderBy('createdAt', 'asc'));
    if (blockedByUsers.length > 0 && blockedByUsers.length <= 10) {
      q = query(commentsRef, where('userId', 'not-in', blockedByUsers), orderBy('createdAt', 'asc'));
    }
    // 10개 초과 시 전체 댓글 반환 (제약)
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Comment));
  } catch (error) {
    console.error('댓글을 가져오는 중 오류 발생:', error);
    throw new Error('댓글을 불러올 수 없습니다.');
  }
};
