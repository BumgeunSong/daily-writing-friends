import {
  collection,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { Comment } from '@/comment/model/Comment';
import { firestore } from '@/firebase';
import { trackedFirebase } from '@/shared/api/trackedFirebase';
import { dualWrite } from '@/shared/api/dualWrite';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { buildNotInQuery } from '@/user/api/user';

/**
 * 댓글 추가 (순수 데이터 mutation 함수)
 */
export async function createComment(
  boardId: string,
  postId: string,
  content: string,
  userId: string,
  userName: string,
  userProfileImage: string,
) {
  const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
  const createdAt = Timestamp.now();
  const docRef = await trackedFirebase.addDoc(collection(postRef, 'comments'), {
    content,
    userId,
    userName,
    userProfileImage,
    createdAt,
  });

  // Dual-write to Supabase
  await dualWrite({
    entityType: 'comment',
    operationType: 'create',
    entityId: docRef.id,
    supabaseWrite: async () => {
      const supabase = getSupabaseClient();
      await supabase.from('comments').insert({
        id: docRef.id,
        post_id: postId,
        user_id: userId,
        user_name: userName,
        user_profile_image: userProfileImage,
        content,
        count_of_replies: 0,
        created_at: createdAt.toDate().toISOString(),
      });
    },
  });
}

/**
 * 댓글 수정 (순수 데이터 mutation 함수)
 */
export async function updateCommentToPost(
  boardId: string,
  postId: string,
  commentId: string,
  content: string,
) {
  const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
  await trackedFirebase.updateDoc(doc(postRef, 'comments', commentId), { content });

  // Dual-write to Supabase
  await dualWrite({
    entityType: 'comment',
    operationType: 'update',
    entityId: commentId,
    supabaseWrite: async () => {
      const supabase = getSupabaseClient();
      await supabase.from('comments').update({ content }).eq('id', commentId);
    },
  });
}

/**
 * 댓글 삭제 (순수 데이터 mutation 함수)
 */
export async function deleteCommentToPost(boardId: string, postId: string, commentId: string) {
  const postRef = doc(firestore, `boards/${boardId}/posts/${postId}`);
  await trackedFirebase.deleteDoc(doc(postRef, 'comments', commentId));

  // Dual-write to Supabase
  await dualWrite({
    entityType: 'comment',
    operationType: 'delete',
    entityId: commentId,
    supabaseWrite: async () => {
      const supabase = getSupabaseClient();
      await supabase.from('comments').delete().eq('id', commentId);
    },
  });
}

/**
 * 댓글 목록을 한 번만 가져오는 함수 (blockedByUsers 서버사이드 필터링 지원)
 */
export async function fetchCommentsOnce(
  boardId: string,
  postId: string,
  blockedByUsers: string[] = [],
): Promise<Comment[]> {
  const commentsRef = collection(firestore, 'boards', boardId, 'posts', postId, 'comments');
  const q = buildNotInQuery(commentsRef, 'userId', blockedByUsers, ['createdAt', 'asc']);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Comment,
  );
}

/**
 * 댓글 단일 조회
 */
export async function fetchCommentById(
  boardId: string,
  postId: string,
  commentId: string,
): Promise<Comment | null> {
  const commentRef = doc(firestore, 'boards', boardId, 'posts', postId, 'comments', commentId);
  const snapshot = await getDoc(commentRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Comment;
}
