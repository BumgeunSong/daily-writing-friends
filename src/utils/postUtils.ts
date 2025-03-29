import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  getDocs,
  query,
  orderBy,
  startAfter,
  where,
  limit
} from 'firebase/firestore';

import { firestore } from '../firebase';
import { Post } from '../types/Posts';
import { useQuery } from '@tanstack/react-query';
import { mapDocToPost } from './mapDocToPost';
import { cachePostDetail, getCachedPostDetail, isOnline } from './offlineUtils';

export const fetchPost = async (boardId: string, postId: string): Promise<Post | null> => {
  // 오프라인 상태 확인
  if (!isOnline()) {
    // 캐시에서 게시물 가져오기 시도
    const cachedPost = await getCachedPostDetail(boardId, postId);
    if (cachedPost) {
      return cachedPost;
    }
    // 캐시된 데이터가 없으면 에러 발생
    throw new Error('오프라인 상태이며 캐시된 게시물이 없습니다.');
  }

  // 온라인 상태면 서버에서 데이터 가져오기
  const docSnap = await getDoc(doc(firestore, `boards/${boardId}/posts/${postId}`));

  if (!docSnap.exists()) {
    console.log('해당 문서가 없습니다!');
    return null; 
  }

  const post = await mapDocToPost(docSnap);
  
  // 가져온 게시물을 캐시에 저장
  if (post) {
    await cachePostDetail(boardId, postId, post);
  }
  
  return post;
};

export async function fetchPosts(boardId: string, selectedAuthorId: string | null, limitCount: number, after?: Date): Promise<Post[]> {
  let q = query(
      collection(firestore, `boards/${boardId}/posts`),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
  );

  if (selectedAuthorId) {
      q = query(q, where('authorId', '==', selectedAuthorId));
  }

  if (after) {
      q = query(q, startAfter(after));
  }

  const snapshot = await getDocs(q);
  const postsData = await Promise.all(snapshot.docs.map((doc) => mapDocToPost(doc)));
  return postsData;
}

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
    updatedAt: serverTimestamp(),
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
