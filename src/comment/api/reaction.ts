import {
  collection,
  doc,
  query,
  where,
  getDocs,
  Timestamp,
  DocumentReference
} from 'firebase/firestore';
import { Reaction } from '@/comment/model/Reaction';
import { firestore } from '@/firebase';
import { trackedFirebase } from '@/shared/api/trackedFirebase';
import { dualWrite } from '@/shared/api/dualWrite';
import { getSupabaseClient, getReadSource } from '@/shared/api/supabaseClient';
import { fetchReactionsFromSupabase } from '@/shared/api/supabaseReads';

export interface CreateReactionParams {
  boardId: string;
  postId: string;
  commentId: string;
  replyId?: string;
  content: string;
  reactionUser: {
    userId: string;
    userName: string;
    userProfileImage: string;
  };
}

export interface DeleteReactionParams {
  boardId: string;
  postId: string;
  commentId: string;
  replyId?: string;
  reactionId: string;
}

export interface GetReactionsParams {
  boardId: string;
  postId: string;
  commentId: string;
  replyId?: string;
}

function getEntityRef(params: {
  boardId: string;
  postId: string;
  commentId: string;
  replyId?: string;
}): DocumentReference {
  const { boardId, postId, commentId, replyId } = params;
  let entityPath = `boards/${boardId}/posts/${postId}/comments/${commentId}`;
  if (replyId) {
    entityPath += `/replies/${replyId}`;
  }
  return doc(firestore, entityPath);
}

export async function createReaction(params: CreateReactionParams): Promise<string> {
  const { content, reactionUser, commentId, replyId } = params;
  const entityRef = getEntityRef(params);
  const reactionsRef = collection(entityRef, 'reactions');
  const existingQuery = query(
    reactionsRef,
    where('content', '==', content),
    where('reactionUser.userId', '==', reactionUser.userId)
  );
  const existingSnapshot = await getDocs(existingQuery);
  if (!existingSnapshot.empty) {
    return existingSnapshot.docs[0].id;
  }
  const createdAt = Timestamp.now();
  const newReactionData = {
    content,
    createdAt,
    reactionUser
  };
  const newReactionRef = await trackedFirebase.addDoc(reactionsRef, newReactionData);

  // Dual-write to Supabase
  await dualWrite({
    entityType: 'reaction',
    operationType: 'create',
    entityId: newReactionRef.id,
    supabaseWrite: async () => {
      const supabase = getSupabaseClient();
      await supabase.from('reactions').insert({
        id: newReactionRef.id,
        comment_id: replyId ? null : commentId,
        reply_id: replyId || null,
        user_id: reactionUser.userId,
        user_name: reactionUser.userName,
        user_profile_image: reactionUser.userProfileImage,
        reaction_type: content,
        created_at: createdAt.toDate().toISOString(),
      });
    },
  });

  return newReactionRef.id;
}

export async function deleteReaction(params: DeleteReactionParams): Promise<void> {
  const { reactionId } = params;
  const entityRef = getEntityRef(params);
  const reactionRef = doc(entityRef, 'reactions', reactionId);
  await trackedFirebase.deleteDoc(reactionRef);

  // Dual-write to Supabase
  await dualWrite({
    entityType: 'reaction',
    operationType: 'delete',
    entityId: reactionId,
    supabaseWrite: async () => {
      const supabase = getSupabaseClient();
      await supabase.from('reactions').delete().eq('id', reactionId);
    },
  });
}

export async function deleteUserReaction(
  params: GetReactionsParams,
  userId: string,
  content: string
): Promise<void> {
  const entityRef = getEntityRef(params);
  const reactionsRef = collection(entityRef, 'reactions');
  const userReactionQuery = query(
    reactionsRef,
    where('reactionUser.userId', '==', userId),
    where('content', '==', content)
  );
  const snapshot = await getDocs(userReactionQuery);
  if (snapshot.empty) {
    return;
  }
  const reactionDoc = snapshot.docs[0];
  await trackedFirebase.deleteDoc(reactionDoc.ref);

  // Dual-write to Supabase
  await dualWrite({
    entityType: 'reaction',
    operationType: 'delete',
    entityId: reactionDoc.id,
    supabaseWrite: async () => {
      const supabase = getSupabaseClient();
      await supabase.from('reactions').delete().eq('id', reactionDoc.id);
    },
  });
}

export async function getReactions(params: GetReactionsParams): Promise<Reaction[]> {
  const readSource = getReadSource();
  if (readSource === 'supabase') {
    return fetchReactionsFromSupabase({
      commentId: params.commentId,
      replyId: params.replyId,
    });
  }

  const entityRef = getEntityRef(params);
  const reactionsRef = collection(entityRef, 'reactions');
  const snapshot = await getDocs(reactionsRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    content: doc.data().content,
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    reactionUser: doc.data().reactionUser
  }));
}
