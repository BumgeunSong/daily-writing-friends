import admin from '../shared/admin';
import {
  getSeoulDateKey,
  generateSeoulWorkingDaysBackward,
  isSeoulWorkingDay,
  getCurrentSeoulDate,
} from '../shared/calendar';

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
      .map((posting) => getSeoulDateKey(posting.createdAt)),
  );
}

// ===== PURE BUSINESS LOGIC FUNCTIONS =====

/**
 * Pure function: Calculate current streak from posting days set and current date
 * Per PRD: Weekends don't break streaks - only missed working days break streaks
 * @param postingDays - Set of posting date strings (YYYY-MM-DD)
 * @param currentDate - The current date to calculate streak from
 * @returns Current streak length
 */
export function calculateCurrentStreakPure(postingDays: Set<string>, currentDate: Date): number {
  // Per PRD: Start from today if it's a working day and has a posting
  if (isSeoulWorkingDay(currentDate) && postingDays.has(getSeoulDateKey(currentDate))) {
    // Count consecutive working days with postings, going backward from today
    const streakDays = takeWhile(generateSeoulWorkingDaysBackward(currentDate), (date) =>
      postingDays.has(getSeoulDateKey(date)),
    );
    return streakDays.length;
  }

  // If today is not a working day OR user didn't post today,
  // find the most recent working day and check for continuous streak from there
  let mostRecentWorkingDayWithPost: Date | null = null;
  
  // Look backward to find the most recent working day with posts
  for (const workingDay of generateSeoulWorkingDaysBackward(currentDate)) {
    if (postingDays.has(getSeoulDateKey(workingDay))) {
      mostRecentWorkingDayWithPost = workingDay;
      break;
    }
    
    // Stop searching after reasonable time (avoid infinite search)
    const daysDiff = Math.floor((currentDate.getTime() - workingDay.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) break; // Reasonable limit
  }

  if (!mostRecentWorkingDayWithPost) {
    return 0; // No working day postings found recently
  }

  // Check if there are any missed working days between most recent post and current date
  // Per PRD: Only missed working days break streaks, weekends are ignored
  let checkDate = new Date(mostRecentWorkingDayWithPost.getTime() + 24 * 60 * 60 * 1000);
  
  while (checkDate <= currentDate) {
    if (isSeoulWorkingDay(checkDate) && !postingDays.has(getSeoulDateKey(checkDate))) {
      // Found a missed working day - streak is broken
      return 0;  
    }
    checkDate = new Date(checkDate.getTime() + 24 * 60 * 60 * 1000);
  }

  // No missed working days found - count the streak from the most recent working day with post
  const streakDays = takeWhile(generateSeoulWorkingDaysBackward(mostRecentWorkingDayWithPost), (date) =>
    postingDays.has(getSeoulDateKey(date)),
  );

  return streakDays.length;
}

/**
 * Pure function: Calculate longest streak from posting days set
 * @param postingDays - Array of posting date strings (YYYY-MM-DD) sorted chronologically
 * @returns Longest streak length
 */
export function calculateLongestStreakPure(postingDays: string[]): number {
  if (postingDays.length === 0) return 0;

  let longestStreak = 0;
  let currentStreakCount = 0;

  // Find consecutive sequences
  for (let i = 0; i < postingDays.length; i++) {
    if (i === 0) {
      currentStreakCount = 1;
    } else {
      const currentDate = new Date(postingDays[i]);
      const previousDate = new Date(postingDays[i - 1]);

      // Check if dates are consecutive working days
      const daysDiff = Math.floor(
        (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff === 1) {
        // Consecutive days
        currentStreakCount++;
      } else {
        // Check if there are working days between them
        const tempDate = new Date(previousDate);
        tempDate.setDate(tempDate.getDate() + 1);
        let hasGap = false;

        while (tempDate < currentDate) {
          if (isSeoulWorkingDay(tempDate)) {
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

// ===== DATABASE LAYER FUNCTIONS (with side effects) =====

/**
 * Calculate current streak based on posting data
 * Uses the same logic as frontend: working days only, backward from today/yesterday
 */
export function calculateCurrentStreak(postings: PostingData[]): number {
  const postingDays = buildPostingDaysSet(postings);
  const today = getCurrentSeoulDate();
  return calculateCurrentStreakPure(postingDays, today);
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

  // Get all working days with postings, sorted chronologically and deduplicated
  const workingDaysWithPostings = recentPostings
    .map((posting) => posting.createdAt)
    .filter((date) => isSeoulWorkingDay(date))
    .map((date) => getSeoulDateKey(date))
    .filter((dateKey, index, array) => array.indexOf(dateKey) === index) // Deduplicate
    .sort();

  return calculateLongestStreakPure(workingDaysWithPostings);
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
    .map((posting) => posting.createdAt)
    .filter((date) => isSeoulWorkingDay(date))
    .map((date) => getSeoulDateKey(date))
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
      const tempDate = new Date(previousDate);
      tempDate.setDate(tempDate.getDate() + 1);

      // Only check up to a reasonable limit to prevent infinite loops
      let checkCount = 0;
      const maxChecks = 10; // Reasonable limit for gap checking

      while (tempDate < currentDate && checkCount < maxChecks) {
        if (isSeoulWorkingDay(tempDate)) {
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
    lastContributionDate: getSeoulDateKey(mostRecentPosting.createdAt),
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
    lastContributionDate: getSeoulDateKey(mostRecentPosting.createdAt),
  };
}
