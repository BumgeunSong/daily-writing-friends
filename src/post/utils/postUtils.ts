import { useQuery } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

import { firestore } from '@/firebase';
import { Post, PostVisibility, ProseMirrorDoc } from '@/post/model/Post';

/**
 * Firebase 문서를 Post 객체로 변환하는 유틸리티 함수
 * 문서 데이터에 ID가 없거나 스냅샷 ID와 다를 경우 스냅샷 ID로 덮어씀
 */
export function mapDocumentToPost(snapshot: DocumentSnapshot | QueryDocumentSnapshot): Post {
  const data = snapshot.data() as Omit<Post, 'id'>;
  return {
    ...data,
    id: snapshot.id, // 스냅샷 ID를 항상 사용
  };
}

export const fetchPost = async (boardId: string, postId: string): Promise<Post | null> => {
  const docSnap = await getDoc(doc(firestore, `boards/${boardId}/posts/${postId}`));

  if (!docSnap.exists()) {
    console.log('해당 문서가 없습니다!');
    return null;
  }

  return mapDocumentToPost(docSnap);
};

export const usePostTitle = (boardId: string, postId: string) => {
  return useQuery(['postTitle', boardId, postId], async () => {
    const post = await fetchPost(boardId, postId);
    return post?.title;
  });
};

export async function createPost(
  boardId: string,
  title: string,
  content: string,
  authorId: string,
  authorName: string,
  visibility?: PostVisibility,
  contentJson?: ProseMirrorDoc,
) {
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
    visibility: visibility || PostVisibility.PUBLIC,
  };

  // Only include contentJson if it's defined
  if (contentJson !== undefined) {
    post.contentJson = contentJson;
  }

  return setDoc(postRef, post);
}

export const updatePost = async (
  boardId: string,
  postId: string,
  title: string,
  content: string,
  contentJson?: ProseMirrorDoc,
): Promise<void> => {
  const postRef = doc(firestore, `boards/${boardId}/posts`, postId);
  const updateData: any = {
    title,
    content,
    thumbnailImageURL: extractFirstImageUrl(content),
    updatedAt: Timestamp.now(),
  };

  // Only update contentJson if provided
  if (contentJson !== undefined) {
    updateData.contentJson = contentJson;
  }

  await updateDoc(postRef, updateData);
};

export const fetchAdjacentPosts = async (boardId: string, currentPostId: string) => {
  const postsRef = collection(firestore, `boards/${boardId}/posts`);
  const q = query(postsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  const posts = snapshot.docs.map((doc) => ({ id: doc.id }));
  const currentIndex = posts.findIndex((post) => post.id === currentPostId);

  return {
    prevPost: currentIndex < posts.length - 1 ? posts[currentIndex + 1].id : null,
    nextPost: currentIndex > 0 ? posts[currentIndex - 1].id : null,
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
