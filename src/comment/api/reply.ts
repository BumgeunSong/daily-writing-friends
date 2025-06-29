import {
  collection,
  getDocs,
  getCountFromServer,
  addDoc,
  doc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Reply } from '@/comment/model/Reply';
import { buildNotInQuery } from '@/user/api/user';

/**
 * 답글 추가 (순수 데이터 mutation 함수)
 */
export async function createReply(
  boardId: string,
  postId: string,
  commentId: string,
  content: string,
  userId: string,
  userName: string,
  userProfileImage: string,
) {
  const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
  await addDoc(collection(postRef, 'comments', commentId, 'replies'), {
    content,
    userId,
    userName,
    userProfileImage,
    createdAt: serverTimestamp(),
  });
}

/**
 * 답글 수정 (순수 데이터 mutation 함수)
 */
export async function updateReplyToComment(
  boardId: string,
  postId: string,
  commentId: string,
  replyId: string,
  content: string,
) {
  const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
  await updateDoc(doc(postRef, 'comments', commentId, 'replies', replyId), { content });
}

/**
 * 답글 삭제 (순수 데이터 mutation 함수)
 */
export async function deleteReplyToComment(
  boardId: string,
  postId: string,
  commentId: string,
  replyId: string,
) {
  const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
  await deleteDoc(doc(postRef, 'comments', commentId, 'replies', replyId));
}

/**
 * 답글 목록을 한 번만 가져오는 함수 (blockedByUsers 서버사이드 필터링 지원)
 */
export async function fetchRepliesOnce(
  boardId: string,
  postId: string,
  commentId: string,
  blockedByUsers: string[] = [],
): Promise<Reply[]> {
  const repliesRef = collection(
    firestore,
    'boards',
    boardId,
    'posts',
    postId,
    'comments',
    commentId,
    'replies',
  );
  const q = buildNotInQuery(repliesRef, 'userId', blockedByUsers, ['createdAt', 'asc']);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Reply,
  );
}

/**
 * 답글 개수 한 번만 가져오기 (blockedByUsers 서버사이드 필터링 지원)
 */
export async function fetchReplyCountOnce(
  boardId: string,
  postId: string,
  commentId: string,
  blockedByUsers: string[] = [],
): Promise<number> {
  const repliesRef = collection(
    firestore,
    'boards',
    boardId,
    'posts',
    postId,
    'comments',
    commentId,
    'replies',
  );
  const q = buildNotInQuery(repliesRef, 'userId', blockedByUsers, ['createdAt', 'asc']);
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

/**
 * 답글 단일 조회
 */
export async function fetchReplyById(
  boardId: string,
  postId: string,
  commentId: string,
  replyId: string,
): Promise<Reply | null> {
  const replyRef = doc(
    firestore,
    'boards',
    boardId,
    'posts',
    postId,
    'comments',
    commentId,
    'replies',
    replyId,
  );
  const snapshot = await getDoc(replyRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Reply;
}
