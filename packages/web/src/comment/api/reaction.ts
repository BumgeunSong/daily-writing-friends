import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  DocumentReference
} from 'firebase/firestore';
import { Reaction } from '@/comment/model/Reaction';
import { firestore } from '@/firebase';

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
  const { content, reactionUser } = params;
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
  const newReactionData = {
    content,
    createdAt: serverTimestamp(),
    reactionUser
  };
  const newReactionRef = await addDoc(reactionsRef, newReactionData);
  return newReactionRef.id;
}

export async function deleteReaction(params: DeleteReactionParams): Promise<void> {
  const { reactionId } = params;
  const entityRef = getEntityRef(params);
  const reactionRef = doc(entityRef, 'reactions', reactionId);
  await deleteDoc(reactionRef);
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
  await deleteDoc(reactionDoc.ref);
}

export async function getReactions(params: GetReactionsParams): Promise<Reaction[]> {
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
