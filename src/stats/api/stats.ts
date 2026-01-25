import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Posting } from '@/post/model/Posting';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { mapDocumentToPosting } from '@/shared/utils/postingUtils';
import { createUserInfo } from '@/stats/utils/userInfoUtils';
import { fetchUserCommentingsByDateRange, fetchUserReplyingsByDateRange } from '@/user/api/commenting';
import { fetchUser } from '@/user/api/user';
import { User } from '@/user/model/User';
import { getReadSource } from '@/shared/api/supabaseClient';
import {
  fetchPostingsFromSupabase,
  fetchPostingsByDateRangeFromSupabase,
  SupabasePosting,
} from '@/shared/api/supabaseReads';
import { compareShadowResults, logShadowMismatch } from '@/shared/api/shadowReads';

// Re-export for backward compatibility
export { createUserInfo };

// Helper: Convert Supabase result to Posting format
function toPosting(item: SupabasePosting): Posting {
  return {
    board: item.board,
    post: item.post,
    createdAt: Timestamp.fromDate(item.createdAt),
    isRecovered: item.isRecovered,
  };
}

// Firestore implementations
async function fetchPostingDataFromFirestore(userId: string): Promise<Posting[]> {
  const postingsRef = collection(firestore, 'users', userId, 'postings');
  const q = query(postingsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => mapDocumentToPosting(doc));
}

async function fetchPostingDataForContributionsFromFirestore(
  userId: string,
  start: Date,
  end: Date
): Promise<Posting[]> {
  const postingsRef = collection(firestore, 'users', userId, 'postings');
  const q = query(
    postingsRef,
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<=', Timestamp.fromDate(end)),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => mapDocumentToPosting(doc));
}

/**
 * Fetches posting data for a specific user
 */
export async function fetchPostingData(userId: string): Promise<Posting[]> {
  const readSource = getReadSource();

  if (readSource === 'supabase') {
    const supabaseData = await fetchPostingsFromSupabase(userId);
    return supabaseData.map(toPosting);
  }

  if (readSource === 'shadow') {
    const firestoreData = await fetchPostingDataFromFirestore(userId);

    // Shadow comparison in background - Supabase failure should not affect Firestore result
    fetchPostingsFromSupabase(userId)
      .then((supabaseData) => {
        const result = compareShadowResults(
          firestoreData,
          supabaseData,
          (item) => item.post.id
        );
        if (!result.match) {
          logShadowMismatch('postings', userId, result);
        }
      })
      .catch((error) => {
        console.error('Shadow read failed for postings:', error);
      });

    return firestoreData;
  }

  return fetchPostingDataFromFirestore(userId);
}

/**
 * Fetches commenting data (comments + replies) for a specific user within a date range
 */
export async function fetchCommentingData(userId: string, numberOfDays: number = 20) {
  const workingDays = getRecentWorkingDays(numberOfDays);
  const dateRange = getDateRange(workingDays);

  const [commentings, replyings] = await Promise.all([
    fetchUserCommentingsByDateRange(userId, dateRange.start, dateRange.end),
    fetchUserReplyingsByDateRange(userId, dateRange.start, dateRange.end),
  ]);

  return { commentings, replyings };
}

/**
 * Calculates date range from working days array
 */
export function getDateRange(workingDays: Date[]): { start: Date; end: Date } {
  const start = new Date(workingDays[0]);
  start.setHours(0, 0, 0, 0);
  const end = new Date(workingDays[workingDays.length - 1]);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Fetches posting data for contributions (limited to recent working days)
 */
export async function fetchPostingDataForContributions(
  userId: string,
  numberOfDays: number = 20
): Promise<Posting[]> {
  const workingDays = getRecentWorkingDays(numberOfDays);
  const dateRange = getDateRange(workingDays);

  const readSource = getReadSource();

  if (readSource === 'supabase') {
    const supabaseData = await fetchPostingsByDateRangeFromSupabase(
      userId,
      dateRange.start,
      dateRange.end
    );
    return supabaseData.map(toPosting);
  }

  if (readSource === 'shadow') {
    const firestoreData = await fetchPostingDataForContributionsFromFirestore(
      userId,
      dateRange.start,
      dateRange.end
    );

    // Shadow comparison in background - Supabase failure should not affect Firestore result
    fetchPostingsByDateRangeFromSupabase(userId, dateRange.start, dateRange.end)
      .then((supabaseData) => {
        const result = compareShadowResults(
          firestoreData,
          supabaseData,
          (item) => item.post.id
        );
        if (!result.match) {
          logShadowMismatch('postingsForContributions', userId, result);
        }
      })
      .catch((error) => {
        console.error('Shadow read failed for postingsForContributions:', error);
      });

    return firestoreData;
  }

  return fetchPostingDataForContributionsFromFirestore(userId, dateRange.start, dateRange.end);
}

/**
 * Fetches user data with error handling
 */
export async function fetchUserSafely(userId: string): Promise<User | null> {
  try {
    return await fetchUser(userId);
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return null;
  }
}
