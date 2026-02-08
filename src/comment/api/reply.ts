import {
  collection,
  getDocs,
  getCountFromServer,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { Reply } from '@/comment/model/Reply';
import { firestore } from '@/firebase';
import { trackedFirebase } from '@/shared/api/trackedFirebase';
import { dualWrite } from '@/shared/api/dualWrite';
import { getSupabaseClient, getReadSource } from '@/shared/api/supabaseClient';
import { buildNotInQuery } from '@/user/api/user';
import {
  fetchRepliesFromSupabase,
  fetchReplyCountFromSupabase,
  fetchReplyByIdFromSupabase,
} from '@/shared/api/supabaseReads';

/**
 * 답글 추가 (순수 데이터 mutation 함수)
 */
export async function createReply(
  boardId: string,
  postId: string,
  commentId: string,
  content: string,
  userId: string,
  userName: string,
  userProfileImage: string,
) {
  const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
  const createdAt = Timestamp.now();
  const docRef = await trackedFirebase.addDoc(collection(postRef, 'comments', commentId, 'replies'), {
    content,
    userId,
    userName,
    userProfileImage,
    createdAt,
  });

  // Dual-write to Supabase
  await dualWrite({
    entityType: 'reply',
    operationType: 'create',
    entityId: docRef.id,
    supabaseWrite: async () => {
      const supabase = getSupabaseClient();
      await supabase.from('replies').insert({
        id: docRef.id,
        comment_id: commentId,
        post_id: postId,
        user_id: userId,
        user_name: userName,
        user_profile_image: userProfileImage,
        content,
        created_at: createdAt.toDate().toISOString(),
      });
    },
  });
}

/**
 * 답글 수정 (순수 데이터 mutation 함수)
 */
export async function updateReplyToComment(
  boardId: string,
  postId: string,
  commentId: string,
  replyId: string,
  content: string,
) {
  const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
  await trackedFirebase.updateDoc(doc(postRef, 'comments', commentId, 'replies', replyId), { content });

  // Dual-write to Supabase
  await dualWrite({
    entityType: 'reply',
    operationType: 'update',
    entityId: replyId,
    supabaseWrite: async () => {
      const supabase = getSupabaseClient();
      await supabase.from('replies').update({ content }).eq('id', replyId);
    },
  });
}

/**
 * 답글 삭제 (순수 데이터 mutation 함수)
 */
export async function deleteReplyToComment(
  boardId: string,
  postId: string,
  commentId: string,
  replyId: string,
) {
  const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
  await trackedFirebase.deleteDoc(doc(postRef, 'comments', commentId, 'replies', replyId));

  // Dual-write to Supabase
  await dualWrite({
    entityType: 'reply',
    operationType: 'delete',
    entityId: replyId,
    supabaseWrite: async () => {
      const supabase = getSupabaseClient();
      await supabase.from('replies').delete().eq('id', replyId);
    },
  });
}

/**
 * 답글 목록을 한 번만 가져오는 함수 (blockedByUsers 서버사이드 필터링 지원)
 */
export async function fetchRepliesOnce(
  boardId: string,
  postId: string,
  commentId: string,
  blockedByUsers: string[] = [],
): Promise<Reply[]> {
  const readSource = getReadSource();
  if (readSource === 'supabase') {
    return fetchRepliesFromSupabase(commentId, blockedByUsers);
  }

  const repliesRef = collection(
    firestore,
    'boards',
    boardId,
    'posts',
    postId,
    'comments',
    commentId,
    'replies',
  );
  const q = buildNotInQuery(repliesRef, 'userId', blockedByUsers, ['createdAt', 'asc']);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Reply,
  );
}

/**
 * 답글 개수 한 번만 가져오기 (blockedByUsers 서버사이드 필터링 지원)
 */
export async function fetchReplyCountOnce(
  boardId: string,
  postId: string,
  commentId: string,
  blockedByUsers: string[] = [],
): Promise<number> {
  const readSource = getReadSource();
  if (readSource === 'supabase') {
    return fetchReplyCountFromSupabase(commentId, blockedByUsers);
  }

  const repliesRef = collection(
    firestore,
    'boards',
    boardId,
    'posts',
    postId,
    'comments',
    commentId,
    'replies',
  );
  const q = buildNotInQuery(repliesRef, 'userId', blockedByUsers, ['createdAt', 'asc']);
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

/**
 * 답글 단일 조회
 */
export async function fetchReplyById(
  boardId: string,
  postId: string,
  commentId: string,
  replyId: string,
): Promise<Reply | null> {
  const readSource = getReadSource();
  if (readSource === 'supabase') {
    return fetchReplyByIdFromSupabase(replyId);
  }

  const replyRef = doc(
    firestore,
    'boards',
    boardId,
    'posts',
    postId,
    'comments',
    commentId,
    'replies',
    replyId,
  );
  const snapshot = await getDoc(replyRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Reply;
}
