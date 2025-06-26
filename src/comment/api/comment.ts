import { collection, getDocs, addDoc, doc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { Comment } from '@/comment/model/Comment';
import { firestore } from '@/firebase';
import { buildNotInQuery } from '@/user/api/user';

/**
 * 댓글 추가 (순수 데이터 mutation 함수)
 */
export async function createComment(
  boardId: string,
  postId: string,
  content: string,
  userId: string,
  userName: string,
  userProfileImage: string,
) {
  const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
  await addDoc(collection(postRef, 'comments'), {
    content,
    userId,
    userName,
    userProfileImage,
    createdAt: serverTimestamp(),
  });
}

/**
 * 댓글 수정 (순수 데이터 mutation 함수)
 */
export async function updateCommentToPost(
  boardId: string,
  postId: string,
  commentId: string,
  content: string,
) {
  const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
  await updateDoc(doc(postRef, 'comments', commentId), { content });
}

/**
 * 댓글 삭제 (순수 데이터 mutation 함수)
 */
export async function deleteCommentToPost(
  boardId: string,
  postId: string,
  commentId: string,
) {
  const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
  await deleteDoc(doc(postRef, 'comments', commentId));
}

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
