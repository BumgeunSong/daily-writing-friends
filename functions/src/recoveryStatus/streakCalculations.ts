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
 * Optimized version that limits search range and uses efficient algorithm
 */
export function calculateLongestStreak(postings: PostingData[]): number {
  if (postings.length === 0) return 0;

  // Limit search to last 2 years to prevent excessive computation
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  // Filter postings to last 2 years and sort by date
  const recentPostings = postings
    .filter((posting) => posting.createdAt >= twoYearsAgo)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  if (recentPostings.length === 0) return 0;

  let longestStreak = 0;
  let currentStreakCount = 0;

  // Get all working days with postings, sorted chronologically and deduplicated
  const workingDaysWithPostings = recentPostings
    .map((posting) => toSeoulDate(posting.createdAt))
    .filter((date) => isWorkingDay(date))
    .map((date) => getDateKey(date))
    .filter((dateKey, index, array) => array.indexOf(dateKey) === index) // Deduplicate
    .sort();

  if (workingDaysWithPostings.length === 0) return 0;

  // Find consecutive sequences
  for (let i = 0; i < workingDaysWithPostings.length; i++) {
    if (i === 0) {
      currentStreakCount = 1;
    } else {
      const currentDate = new Date(workingDaysWithPostings[i]);
      const previousDate = new Date(workingDaysWithPostings[i - 1]);

      // Check if dates are consecutive working days
      const daysDiff = Math.floor(
        (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff === 1) {
        // Consecutive days
        currentStreakCount++;
      } else {
        // Check if there are working days between them
        let tempDate = new Date(previousDate);
        tempDate.setDate(tempDate.getDate() + 1);
        let hasGap = false;

        while (tempDate < currentDate) {
          if (isWorkingDay(tempDate)) {
            hasGap = true;
            break;
          }
          tempDate.setDate(tempDate.getDate() + 1);
        }

        if (hasGap) {
          // Gap found, reset streak
          longestStreak = Math.max(longestStreak, currentStreakCount);
          currentStreakCount = 1;
        } else {
          // No gap, continue streak
          currentStreakCount++;
        }
      }
    }

    longestStreak = Math.max(longestStreak, currentStreakCount);
  }

  return longestStreak;
}

/**
 * Ultra-optimized longest streak calculation for very large datasets
 * Uses sliding window approach and early termination
 */
export function calculateLongestStreakOptimized(postings: PostingData[]): number {
  if (postings.length === 0) return 0;

  // Limit to last 1 year for ultra-fast performance
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const recentPostings = postings
    .filter((posting) => posting.createdAt >= oneYearAgo)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  if (recentPostings.length === 0) return 0;

  // Convert to working days only and sort
  const workingDays = recentPostings
    .map((posting) => toSeoulDate(posting.createdAt))
    .filter((date) => isWorkingDay(date))
    .map((date) => getDateKey(date))
    .sort();

  if (workingDays.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  // Use sliding window to find consecutive sequences
  for (let i = 1; i < workingDays.length; i++) {
    const currentDate = new Date(workingDays[i]);
    const previousDate = new Date(workingDays[i - 1]);

    // Calculate days difference
    const daysDiff = Math.floor(
      (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff === 1) {
      // Consecutive working days
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      // Check for gaps in working days
      let hasWorkingDayGap = false;
      let tempDate = new Date(previousDate);
      tempDate.setDate(tempDate.getDate() + 1);

      // Only check up to a reasonable limit to prevent infinite loops
      let checkCount = 0;
      const maxChecks = 10; // Reasonable limit for gap checking

      while (tempDate < currentDate && checkCount < maxChecks) {
        if (isWorkingDay(tempDate)) {
          hasWorkingDayGap = true;
          break;
        }
        tempDate.setDate(tempDate.getDate() + 1);
        checkCount++;
      }

      if (hasWorkingDayGap) {
        // Gap found, reset streak
        currentStreak = 1;
      } else {
        // No gap, continue streak
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      }
    }

    // Early termination: if current streak is already longer than remaining possible days
    const remainingDays = workingDays.length - i;
    if (currentStreak + remainingDays <= maxStreak) {
      break;
    }
  }

  return maxStreak;
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

  // If current streak exceeds previous longest, it becomes the new longest
  // No need to recalculate the entire longest streak
  let longestStreak = previousLongestStreak;
  if (currentStreak > previousLongestStreak) {
    longestStreak = currentStreak;
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
