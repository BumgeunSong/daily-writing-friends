
import { isWorkingDay } from '@/utils/dateUtils';
import { Contribution } from '@/types/WritingStats';
import { Posting } from '@/types/Posting';

// Helper: Converts a Date to a YYYY-MM-DD string in the given timezone.
function getDateKey(date: Date, timeZone: string): string {
    // Create a locale string in the given timezone then back to Date to normalize the date.
    const localDate = new Date(date.toLocaleString('en-US', { timeZone }));
    return localDate.toISOString().split('T')[0];
}

// Helper: Build a set of date keys that represent days when at least one posting occurred.
function buildPostingDaysSet(postings: Posting[], timeZone: string): Set<string> {
    const postingDays = new Set<string>();
    for (const posting of postings) {
        const postingDate = posting.createdAt.toDate();
        const key = getDateKey(postingDate, timeZone);
        postingDays.add(key);
    }
    return postingDays;
}

// Pure function to check if a date has posting activity.
function hasPostingOnDate(date: Date, postingDays: Set<string>, timeZone: string): boolean {
    const key = getDateKey(date, timeZone);
    return postingDays.has(key);
}

// Pure function that calculates the current streak given today's date, a postingDays set, 
// and an isWorkingDay predicate.
function calculateStreakFromDate(
    startDate: Date,
    postingDays: Set<string>,
    timeZone: string,
    isWorkingDayFn: (date: Date, timeZone: string) => boolean
): number {
    let streak = 0;
    let currentDate = new Date(startDate.getTime());

    // Loop backwards until a working day is missing posting.
    while (true) {
        if (isWorkingDayFn(currentDate, timeZone)) {
            if (hasPostingOnDate(currentDate, postingDays, timeZone)) {
                streak++;
            } else {
                break;
            }
        }
        // Move one day back
        currentDate = new Date(currentDate.getTime() - 86400000);
    }

    return streak;
}

// Main function that calculates the current streak.
export function calculateCurrentStreak(postings: Posting[]): number {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const postingDays = buildPostingDaysSet(postings, userTimeZone);
    const today = new Date();

    return calculateStreakFromDate(today, postingDays, userTimeZone, isWorkingDay);
}
