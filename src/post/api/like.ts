import {
  collection,
  doc,
  query,
  where,
  getDocs,
  Timestamp,
  DocumentReference,
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { trackedFirebase } from '@/shared/api/trackedFirebase';
import { dualWrite, throwOnError } from '@/shared/api/dualWrite';
import { getSupabaseClient } from '@/shared/api/supabaseClient';

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
  const { likeUser, postId } = params;
  const postRef = getPostRef(params);
  const likesRef = collection(postRef, 'likes');

  // Check if user already liked (prevent duplicates)
  const existingQuery = query(likesRef, where('userId', '==', likeUser.userId));
  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    return existingSnapshot.docs[0].id;
  }

  const createdAt = Timestamp.now();
  const newLikeData = {
    userId: likeUser.userId,
    userName: likeUser.userName,
    userProfileImage: likeUser.userProfileImage,
    createdAt,
  };

  const newLikeRef = await trackedFirebase.addDoc(likesRef, newLikeData);

  // Dual-write to Supabase
  await dualWrite({
    entityType: 'like',
    operationType: 'create',
    entityId: newLikeRef.id,
    supabaseWrite: async () => {
      const supabase = getSupabaseClient();
      throwOnError(await supabase.from('likes').insert({
        id: newLikeRef.id,
        post_id: postId,
        user_id: likeUser.userId,
        user_name: likeUser.userName,
        user_profile_image: likeUser.userProfileImage,
        created_at: createdAt.toDate().toISOString(),
      }));
    },
  });

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

  // Dual-write to Supabase
  await dualWrite({
    entityType: 'like',
    operationType: 'delete',
    entityId: likeDoc.id,
    supabaseWrite: async () => {
      const supabase = getSupabaseClient();
      throwOnError(await supabase.from('likes').delete().eq('id', likeDoc.id));
    },
  });
}
