import admin from '../shared/admin';
import { toSeoulDate, isWorkingDay } from '../shared/dateUtils';
import { formatDateString } from './streakUtils';

/**
 * Interface for posting data used in streak calculations
 */
export interface PostingData {
  createdAt: Date;
  userId: string;
}

/**
 * Streak calculation result
 */
export interface StreakCalculationResult {
  currentStreak: number;
  longestStreak: number;
  lastContributionDate: string | null;
}

/**
 * Convert date to YYYY-MM-DD key for streak calculations
 */
export function getDateKey(date: Date): string {
  return formatDateString(toSeoulDate(date));
}

/**
 * Get the previous date
 */
export function getPreviousDate(date: Date, days = 1): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() - days);
  return newDate;
}

/**
 * Generator that yields working days going backward from a start date
 */
function* workingDaysBackward(startDate: Date): Generator<Date> {
  let currentDate = new Date(startDate);

  while (true) {
    if (isWorkingDay(currentDate)) {
      yield new Date(currentDate);
    }
    currentDate = getPreviousDate(currentDate);
  }
}

/**
 * Take items from an iterable while a condition is true
 */
function takeWhile<T>(iterable: Iterable<T>, predicate: (item: T) => boolean): T[] {
  const result: T[] = [];
  for (const item of iterable) {
    if (!predicate(item)) {
      break;
    }
    result.push(item);
  }
  return result;
}

/**
 * Build a set of posting days from posting data
 */
export function buildPostingDaysSet(postings: PostingData[]): Set<string> {
  return new Set(
    postings
      .filter((posting) => posting.createdAt && !isNaN(posting.createdAt.getTime()))
      .map((posting) => getDateKey(posting.createdAt)),
  );
}

/**
 * Calculate current streak based on posting data
 * Uses the same logic as frontend: working days only, backward from today/yesterday
 */
export function calculateCurrentStreak(postings: PostingData[]): number {
  const postingDays = buildPostingDaysSet(postings);
  const today = toSeoulDate(new Date());

  // Start from today if it's a working day and has a posting, otherwise start from yesterday
  const startDay =
    isWorkingDay(today) && postingDays.has(getDateKey(today)) ? today : getPreviousDate(today);

  // Count consecutive working days with postings, going backward
  const streakDays = takeWhile(workingDaysBackward(startDay), (date) =>
    postingDays.has(getDateKey(date)),
  );

  return streakDays.length;
}

/**
 * Calculate the longest streak from all posting data
 * This is computationally expensive and should be used sparingly
 */
export function calculateLongestStreak(postings: PostingData[]): number {
  if (postings.length === 0) return 0;

  const postingDays = buildPostingDaysSet(postings);
  let longestStreak = 0;
  let currentStreakCount = 0;

  // Sort postings by date (oldest first)
  const sortedPostings = [...postings].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  // Find the earliest posting date
  const earliestDate = sortedPostings[0].createdAt;
  const today = toSeoulDate(new Date());

  // Iterate through all working days from earliest posting to today
  let currentDate = toSeoulDate(earliestDate);

  while (currentDate <= today) {
    if (isWorkingDay(currentDate)) {
      const dateKey = getDateKey(currentDate);

      if (postingDays.has(dateKey)) {
        currentStreakCount++;
        longestStreak = Math.max(longestStreak, currentStreakCount);
      } else {
        currentStreakCount = 0;
      }
    }

    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return longestStreak;
}

/**
 * Fetch all postings for a user and return as PostingData array
 */
export async function fetchUserPostings(userId: string): Promise<PostingData[]> {
  const postingsRef = admin.firestore().collection('users').doc(userId).collection('postings');

  const snapshot = await postingsRef.orderBy('createdAt', 'desc').get();

  return snapshot.docs.map((doc) => ({
    createdAt: doc.data().createdAt.toDate(),
    userId: userId,
  }));
}

/**
 * Calculate both current and longest streaks for a user
 * This is the main function to use for updating StreakInfo
 */
export async function calculateUserStreaks(userId: string): Promise<StreakCalculationResult> {
  const postings = await fetchUserPostings(userId);

  if (postings.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastContributionDate: null,
    };
  }

  const currentStreak = calculateCurrentStreak(postings);
  const longestStreak = calculateLongestStreak(postings);

  // Find the most recent posting date
  const mostRecentPosting = postings.reduce((latest, posting) =>
    posting.createdAt > latest.createdAt ? posting : latest,
  );

  return {
    currentStreak,
    longestStreak,
    lastContributionDate: getDateKey(mostRecentPosting.createdAt),
  };
}

/**
 * Optimized streak calculation for when we know a new posting was just added
 * This avoids recalculating the longest streak unless the current streak is now longer
 */
export async function calculateStreaksAfterNewPosting(
  userId: string,
  _previousCurrentStreak: number,
  previousLongestStreak: number,
): Promise<StreakCalculationResult> {
  const postings = await fetchUserPostings(userId);

  if (postings.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastContributionDate: null,
    };
  }

  const currentStreak = calculateCurrentStreak(postings);

  // Only recalculate longest streak if current streak might have exceeded it
  let longestStreak = previousLongestStreak;
  if (currentStreak > previousLongestStreak) {
    longestStreak = Math.max(currentStreak, calculateLongestStreak(postings));
  }

  const mostRecentPosting = postings.reduce((latest, posting) =>
    posting.createdAt > latest.createdAt ? posting : latest,
  );

  return {
    currentStreak,
    longestStreak,
    lastContributionDate: getDateKey(mostRecentPosting.createdAt),
  };
}
