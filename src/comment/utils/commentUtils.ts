import { collection, addDoc, doc, serverTimestamp, updateDoc, deleteDoc, getDocs, query, orderBy, onSnapshot, QueryDocumentSnapshot, DocumentData, where } from 'firebase/firestore';
import { Comment } from '@/comment/model/Comment';
import { firestore } from '@/firebase';

/**
 * 실시간 댓글 구독 (blockedUsers 필터링 지원)
 * @param boardId
 * @param postId
 * @param setComments
 * @param blockedUsers 내 컨텐츠 숨김 유저 uid 배열 (userId not-in)
 */
export function fetchComments(
  boardId: string,
  postId: string,
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>,
  blockedUsers: string[] = []
) {
  const commentsRef = collection(firestore, `boards/${boardId}/posts/${postId}/comments`);
  let commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));
  // Firestore not-in 조건은 10개 이하만 지원
  if (blockedUsers.length > 0 && blockedUsers.length <= 10) {
    commentsQuery = query(commentsRef, where('userId', 'not-in', blockedUsers), orderBy('createdAt', 'asc'));
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

export const addCommentToPost = async (
  boardId: string,
  postId: string,
  content: string,
  userId: string,
  userName: string,
  userProfileImage: string,
) => {
  try {
    const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
    await addDoc(collection(postRef, 'comments'), {
      content,
      userId,
      userName,
      userProfileImage,
      createdAt: serverTimestamp(),
    });
    console.log('Comment added successfully');
  } catch (error) {
    console.error('Error adding comment:', error);
  }
};

export const updateCommentToPost = async (boardId: string, postId: string, commentId: string, content: string) => {
  try {
    const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
    await updateDoc(doc(postRef, 'comments', commentId), { content });
  } catch (error) {
    console.error('Error updating comment:', error);
  }
};

export const deleteCommentToPost = async (boardId: string, postId: string, commentId: string) => {
  try {
    const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
    await deleteDoc(doc(postRef, 'comments', commentId));
  } catch (error) {
    console.error('Error deleting comment:', error);
  }
};

export const addReplyToComment = async (
  boardId: string,
  postId: string,
  commentId: string,
  content: string,
  userId: string,
  userName: string,
  userProfileImage: string,
) => {
  try {
    const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
    await addDoc(collection(postRef, 'comments', commentId, 'replies'), {
      content,
      userId,
      userName,
      userProfileImage,
      createdAt: serverTimestamp(),
    });
    console.log('Reply added successfully');
  } catch (error) {
    console.error('Error adding reply:', error);
  }
};

export const updateReplyToComment = async (
  boardId: string,
  postId: string,
  commentId: string,
  replyId: string,
  content: string,
) => {
  try {
    const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
    await updateDoc(doc(postRef, 'comments', commentId, 'replies', replyId), {
      content,
    });
  } catch (error) {
    console.error('Error updating reply:', error);
  }
};

export const deleteReplyToComment = async (boardId: string, postId: string, commentId: string, replyId: string) => {
  try {
    const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
    await deleteDoc(doc(postRef, 'comments', commentId, 'replies', replyId));
  } catch (error) {
    console.error('Error deleting reply:', error);
  }
};

/**
 * React Query용 한 번만 실행되는 댓글 가져오기 함수 (blockedUsers 필터링 지원)
 * @param boardId
 * @param postId
 * @param blockedUsers
 * @returns Comment[]
 */
export const fetchCommentsOnce = async (boardId: string, postId: string, blockedUsers: string[] = []): Promise<Comment[]> => {
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
    if (blockedUsers.length > 0 && blockedUsers.length <= 10) {
      q = query(commentsRef, where('userId', 'not-in', blockedUsers), orderBy('createdAt', 'asc'));
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
