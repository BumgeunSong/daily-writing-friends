import { collection, getDocs, query, where } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Commenting } from '@/user/model/Commenting';
import { Replying } from '@/user/model/Replying';
import { getReadSource } from '@/shared/api/supabaseClient';
import {
  fetchCommentingsByDateRangeFromSupabase,
  fetchReplyingsByDateRangeFromSupabase,
  SupabaseCommenting,
  SupabaseReplying,
} from '@/shared/api/supabaseReads';
import { compareShadowResults, logShadowMismatch } from '@/shared/api/shadowReads';

// 특정 유저의 commentings 서브컬렉션 전체 fetch
export async function fetchUserCommentings(userId: string): Promise<Commenting[]> {
  const ref = collection(firestore, 'users', userId, 'commentings');
  const snap = await getDocs(ref);
  return snap.docs.map((doc) => doc.data() as Commenting);
}

// 특정 유저의 replyings 서브컬렉션 전체 fetch
export async function fetchUserReplyings(userId: string): Promise<Replying[]> {
  const ref = collection(firestore, 'users', userId, 'replyings');
  const snap = await getDocs(ref);
  return snap.docs.map((doc) => doc.data() as Replying);
}

// Helper: Convert Supabase result to Commenting format (for type compatibility)
function toCommenting(item: SupabaseCommenting): Commenting {
  return {
    board: item.board,
    post: item.post,
    comment: item.comment,
    createdAt: Timestamp.fromDate(item.createdAt),
  };
}

// Helper: Convert Supabase result to Replying format
function toReplying(item: SupabaseReplying): Replying {
  return {
    board: item.board,
    post: item.post,
    comment: item.comment,
    reply: item.reply,
    createdAt: Timestamp.fromDate(item.createdAt),
  };
}

// Firestore implementation
async function fetchCommentingsFromFirestore(
  userId: string,
  start: Date,
  end: Date
): Promise<Commenting[]> {
  const ref = collection(firestore, 'users', userId, 'commentings');
  const q = query(
    ref,
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<', Timestamp.fromDate(end))
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => doc.data() as Commenting);
}

async function fetchReplyingsFromFirestore(
  userId: string,
  start: Date,
  end: Date
): Promise<Replying[]> {
  const ref = collection(firestore, 'users', userId, 'replyings');
  const q = query(
    ref,
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<', Timestamp.fromDate(end))
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => doc.data() as Replying);
}

// 날짜 범위로 commentings 조회 (with read source switching)
export async function fetchUserCommentingsByDateRange(
  userId: string,
  start: Date,
  end: Date
): Promise<Commenting[]> {
  const readSource = getReadSource();

  if (readSource === 'supabase') {
    const supabaseData = await fetchCommentingsByDateRangeFromSupabase(userId, start, end);
    return supabaseData.map(toCommenting);
  }

  if (readSource === 'shadow') {
    const [firestoreData, supabaseData] = await Promise.all([
      fetchCommentingsFromFirestore(userId, start, end),
      fetchCommentingsByDateRangeFromSupabase(userId, start, end),
    ]);

    const result = compareShadowResults(
      firestoreData,
      supabaseData,
      (item) => ('comment' in item ? item.comment.id : (item as SupabaseCommenting).comment.id)
    );

    if (!result.match) {
      logShadowMismatch('commentings', userId, result);
    }

    return firestoreData; // Return Firestore data during shadow mode
  }

  // Default: Firestore
  return fetchCommentingsFromFirestore(userId, start, end);
}

// 날짜 범위로 replyings 조회 (with read source switching)
export async function fetchUserReplyingsByDateRange(
  userId: string,
  start: Date,
  end: Date
): Promise<Replying[]> {
  const readSource = getReadSource();

  if (readSource === 'supabase') {
    const supabaseData = await fetchReplyingsByDateRangeFromSupabase(userId, start, end);
    return supabaseData.map(toReplying);
  }

  if (readSource === 'shadow') {
    const [firestoreData, supabaseData] = await Promise.all([
      fetchReplyingsFromFirestore(userId, start, end),
      fetchReplyingsByDateRangeFromSupabase(userId, start, end),
    ]);

    const result = compareShadowResults(
      firestoreData,
      supabaseData,
      (item) => ('reply' in item ? item.reply.id : (item as SupabaseReplying).reply.id)
    );

    if (!result.match) {
      logShadowMismatch('replyings', userId, result);
    }

    return firestoreData;
  }

  return fetchReplyingsFromFirestore(userId, start, end);
}
