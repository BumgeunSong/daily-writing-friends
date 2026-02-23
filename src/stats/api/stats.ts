import { Timestamp } from 'firebase/firestore';
import type { Posting } from '@/post/model/Posting';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { createUserInfo } from '@/stats/utils/userInfoUtils';
import { fetchUserCommentingsByDateRange, fetchUserReplyingsByDateRange } from '@/user/api/commenting';
import { fetchUser } from '@/user/api/user';
import type { User } from '@/user/model/User';
import type {
  SupabasePosting} from '@/shared/api/supabaseReads';
import {
  fetchPostingsFromSupabase,
  fetchPostingsByDateRangeFromSupabase
} from '@/shared/api/supabaseReads';

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

/**
 * Fetches posting data for a specific user
 */
export async function fetchPostingData(userId: string): Promise<Posting[]> {
  const supabaseData = await fetchPostingsFromSupabase(userId);
  return supabaseData.map(toPosting);
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

  const supabaseData = await fetchPostingsByDateRangeFromSupabase(
    userId,
    dateRange.start,
    dateRange.end
  );
  return supabaseData.map(toPosting);
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
