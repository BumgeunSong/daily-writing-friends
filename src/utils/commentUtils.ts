import { collection, addDoc, doc, serverTimestamp, updateDoc, deleteDoc, getDocs, query, orderBy, onSnapshot, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Comment } from '../types/Comment';
import { firestore } from '../firebase';

export function fetchComments(
  boardId: string,
  postId: string,
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>,
) {
  const commentsRef = collection(firestore, `boards/${boardId}/posts/${postId}/comments`);
  const commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));
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
