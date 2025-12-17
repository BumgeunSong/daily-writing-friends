import {
  collection,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  DocumentReference,
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { trackedFirebase } from '@/shared/api/trackedFirebase';

export interface CreateLikeParams {
  boardId: string;
  postId: string;
  likeUser: {
    userId: string;
    userName: string;
    userProfileImage: string;
  };
}

export interface GetLikesParams {
  boardId: string;
  postId: string;
}

function getPostRef(params: { boardId: string; postId: string }): DocumentReference {
  return doc(firestore, `boards/${params.boardId}/posts/${params.postId}`);
}

export async function createLike(params: CreateLikeParams): Promise<string> {
  const { likeUser } = params;
  const postRef = getPostRef(params);
  const likesRef = collection(postRef, 'likes');

  // Check if user already liked (prevent duplicates)
  const existingQuery = query(likesRef, where('userId', '==', likeUser.userId));
  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    return existingSnapshot.docs[0].id;
  }

  const newLikeData = {
    userId: likeUser.userId,
    userName: likeUser.userName,
    userProfileImage: likeUser.userProfileImage,
    createdAt: serverTimestamp(),
  };

  const newLikeRef = await trackedFirebase.addDoc(likesRef, newLikeData);
  return newLikeRef.id;
}

export async function deleteUserLike(params: GetLikesParams, userId: string): Promise<void> {
  const postRef = getPostRef(params);
  const likesRef = collection(postRef, 'likes');

  const userLikeQuery = query(likesRef, where('userId', '==', userId));

  const snapshot = await getDocs(userLikeQuery);
  if (snapshot.empty) {
    return;
  }

  const likeDoc = snapshot.docs[0];
  await trackedFirebase.deleteDoc(likeDoc.ref);
}
