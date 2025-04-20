import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  Timestamp
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
    createdAt: Timestamp.now(),
  };
  return setDoc(postRef, post);
}

export const updatePost = async (
  boardId: string,
  postId: string,
  title: string,
  content: string
): Promise<void> => {
  const postRef = doc(firestore, `boards/${boardId}/posts`, postId);
  await updateDoc(postRef, {
    title,
    content,  
    thumbnailImageURL: extractFirstImageUrl(content),
    updatedAt: Timestamp.now(),
  });
};

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
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const firstImage = doc.querySelector('img');
    return firstImage?.src || null;
  } catch (error) {
    console.error('Error extracting image URL:', error);
    return null;
  }
};
