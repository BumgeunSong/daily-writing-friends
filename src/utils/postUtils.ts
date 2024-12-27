import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';

import { firestore } from '../firebase';
import { Post } from '../types/Posts';
import { useQuery } from '@tanstack/react-query';
import { mapDocToPost } from './mapDocToPost';

export const fetchPost = async (boardId: string, postId: string): Promise<Post | null> => {
  const docSnap = await getDoc(doc(firestore, `boards/${boardId}/posts/${postId}`));

  if (!docSnap.exists()) {
    console.log('해당 문서가 없습니다!');
    return null; 
  }

  return mapDocToPost(docSnap);
};

export const usePostTitle = (boardId: string, postId: string) => {
  return useQuery(['postTitle', boardId, postId], async () => {
    const post = await fetchPost(boardId, postId);
    return post?.title;
  });
};

export async function createPost(boardId: string, title: string, content: string, authorId: string, authorName: string) {
  const postRef = doc(collection(firestore, `boards/${boardId}/posts`));
  const post: Post = {
    id: postRef.id,
    boardId,
    title,
    content,
    thumbnailImageURL: extractFirstImageUrl(content),
    authorId,
    authorName,
    countOfComments: 0,
    countOfReplies: 0,
    createdAt: new Date(),
  };
  return setDoc(postRef, post);
}

export async function updatePost(boardId: string, postId: string, content: string): Promise<void> {
  const docRef = doc(firestore, `boards/${boardId}/posts`, postId);
  await updateDoc(docRef, {
    content,
    thumbnailImageURL: extractFirstImageUrl(content),
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

export const extractFirstImageUrl = (content: string): string | null => {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const firstImage = tempDiv.querySelector('img');
    return firstImage?.src || null;
  } catch (error) {
    console.error('Error extracting image URL:', error);
    return null;
  }
};
