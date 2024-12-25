import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  getDocs,
  DocumentData,
  QueryDocumentSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';

import { firestore } from '../firebase';
import { Post } from '../types/Posts';
import { useQuery } from '@tanstack/react-query';

export const fetchPost = async (boardId: string, postId: string): Promise<Post | null> => {
  const docSnap = await getDoc(doc(firestore, `boards/${boardId}/posts/${postId}`));

  if (!docSnap.exists()) {
    console.log('해당 문서가 없습니다!');
    return null;
  }

  return mapDocToPost(docSnap, boardId);
};

async function mapDocToPost(docSnap: QueryDocumentSnapshot<DocumentData>, boardId: string): Promise<Post> {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    boardId: data.boardId,
    title: data.title,
    content: data.content,
    authorId: data.authorId,
    authorName: data.authorName,
    comments: await getCommentsCount(boardId, docSnap.id),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate(),
    weekDaysFromFirstDay: data.weekDaysFromFirstDay
  };
}

async function getCommentsCount(boardId: string, postId: string): Promise<number> {
  const commentsSnapshot = await getDocs(collection(firestore, `boards/${boardId}/posts/${postId}/comments`));
  const commentsCount = await Promise.all(
    commentsSnapshot.docs.map(async (comment) => {
      const repliesSnapshot = await getDocs(
        collection(firestore, `boards/${boardId}/posts/${postId}/comments/${comment.id}/replies`),
      );
      return Number(comment.exists()) + repliesSnapshot.docs.length;
    }),
  );
  return commentsCount.reduce((acc, curr) => acc + curr, 0);
}

export const usePostTitle = (boardId: string, postId: string) => {
  return useQuery(['postTitle', boardId, postId], async () => {
    const post = await fetchPost(boardId, postId);
    return post?.title;
  });
};

export async function createPost(boardId: string, title: string, content: string, authorId: string, authorName: string) {
  const postRef = doc(collection(firestore, `boards/${boardId}/posts`));
  return setDoc(postRef, {
    title,
    boardId,
    content,
    authorId,
    authorName,
    createdAt: serverTimestamp(),
  });
}

export async function updatePost(boardId: string, postId: string, content: string): Promise<void> {
  const docRef = doc(firestore, `boards/${boardId}/posts`, postId);
  await updateDoc(docRef, {
    content,
    updatedAt: serverTimestamp(),
  });
}

export const fetchAdjacentPosts = async (boardId: string, currentPostId: string) => {
  const postsRef = collection(firestore, `boards/${boardId}/posts`);
  const q = query(postsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  const posts = snapshot.docs.map(doc => ({ id: doc.id }));
  const currentIndex = posts.findIndex(post => post.id === currentPostId);
  
  return {
    prevPost: currentIndex < posts.length - 1 ? posts[currentIndex + 1].id : null,
    nextPost: currentIndex > 0 ? posts[currentIndex - 1].id : null
  };
};