import { isWorkingDay } from '@/utils/dateUtils';
import { Posting } from '@/types/Posting';

// Types
type DateKey = string;
type PostingDays = Set<DateKey>;

// Date Utils
export function getDateKey(date: Date, timeZone?: string): DateKey {
    const userTimeZone = timeZone || getUserTimeZone();
    
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const parts = formatter.format(date).split('/');
    return `${parts[2]}-${parts[0]}-${parts[1]}`;
}

export function getPreviousDate(date: Date, days: number = 1): Date {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - days);
    return newDate;
}

// Posting Utils
export function buildPostingDaysSet(postings: Posting[], timeZone: string): PostingDays {
    return new Set(
        postings.map(posting => {
            const postingDate = posting.createdAt.toDate();
            return getDateKey(postingDate, timeZone);
        })
    );
}

export function hasPostingOnDate(date: Date, postingDays: PostingDays, timeZone: string): boolean {
    const key = getDateKey(date, timeZone);
    return postingDays.has(key);
}

// Streak Calculation
export function calculateStreakForDate(
    date: Date,
    postingDays: PostingDays,
    timeZone: string,
    isWorkingDayFn: (date: Date, timeZone: string) => boolean
): number {
    if (!isWorkingDayFn(date, timeZone)) return 0;
    return hasPostingOnDate(date, postingDays, timeZone) ? 1 : 0;
}

export function calculatePreviousDaysStreak(
    startDate: Date,
    postingDays: PostingDays,
    timeZone: string,
    isWorkingDayFn: (date: Date, timeZone: string) => boolean
): number {
    let streak = 0;
    let currentDate = new Date(startDate);

    while (true) {
        if (isWorkingDayFn(currentDate, timeZone)) {
            if (hasPostingOnDate(currentDate, postingDays, timeZone)) {
                streak++;
            } else {
                break;
            }
        }
        currentDate = getPreviousDate(currentDate);
    }

    return streak;
}

export function calculateStreakFromDate(
    startDate: Date,
    postingDays: PostingDays,
    timeZone: string,
    isWorkingDayFn: (date: Date, timeZone: string) => boolean
): number {
    const today = new Date(startDate);
    const yesterday = getPreviousDate(today);

    // Check today and yesterday first
    const todayStreak = calculateStreakForDate(today, postingDays, timeZone, isWorkingDayFn);
    const yesterdayStreak = calculateStreakForDate(yesterday, postingDays, timeZone, isWorkingDayFn);

    // If posted today or yesterday, return 1 + previous streak
    if (todayStreak > 0 || yesterdayStreak > 0) {
        return 1 + calculatePreviousDaysStreak(getPreviousDate(yesterday), postingDays, timeZone, isWorkingDayFn);
    }

    // If no posting today or yesterday, calculate streak from previous days
    return calculatePreviousDaysStreak(yesterday, postingDays, timeZone, isWorkingDayFn);
}

// Main function
export function calculateCurrentStreak(postings: Posting[]): number {
    const userTimeZone = getUserTimeZone();
    const postingDays = buildPostingDaysSet(postings, userTimeZone);
    const today = new Date();
    return calculateStreakFromDate(today, postingDays, userTimeZone, isWorkingDay);
}

// Timezone Utils
export function getUserTimeZone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
        console.warn('Failed to get user timezone:', error);
        return 'Asia/Seoul';
    }
}
