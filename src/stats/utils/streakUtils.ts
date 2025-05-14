import { Posting } from '@/post/model/Posting';
import { isWorkingDay } from '@shared/utils/dateUtils';

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
    if (!isWorkingDay(date)) return 0;
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

    while (isWorkingDayFn(currentDate, timeZone) && hasPostingOnDate(currentDate, postingDays, timeZone)) {
        streak++;
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

    // 오늘 글을 쓴 경우 바로 streak 1 증가
    if (hasPostingOnDate(today, postingDays, timeZone)) {
        return 1 + calculatePreviousDaysStreak(getPreviousDate(today), postingDays, timeZone, isWorkingDayFn);
    } else {
        // 오늘 글을 쓰지 않은 경우 오늘 전날부터 streak 계산
        return calculatePreviousDaysStreak(getPreviousDate(today), postingDays, timeZone, isWorkingDayFn);
    }
}

// Main function
export function calculateCurrentStreak(postings: Posting[]): number {
    const timeZone = 'Asia/Seoul';
    const postingDays = buildPostingDaysSet(postings, timeZone);

    const today = new Date();
    const todayKey = getDateKey(today, timeZone);
    const todayIsWorkingDay = isWorkingDay(today);

    // 1. recent days 시작점 결정
    let d = new Date(today);
    if (!(todayIsWorkingDay && postingDays.has(todayKey))) {
        d = getPreviousDate(d, 1);
    }

    let streak = 0;
    let shouldContinue = true;

    while (shouldContinue) {
        // 2. recent working days 30개 구하기
        const workingDays: Date[] = [];
        let temp = new Date(d);
        while (workingDays.length < 30) {
            if (isWorkingDay(temp)) {
                workingDays.push(new Date(temp));
            }
            temp = getPreviousDate(temp, 1);
        }

        // 3. streak 카운트 (이번 30개 구간)
        for (const date of workingDays) {
            const key = getDateKey(date, timeZone);
            if (postingDays.has(key)) {
                streak++;
            } else {
                shouldContinue = false;
                break;
            }
        }

        // 4. 만약 이번 30개 모두 posting이 있으면, 30개 더 확장
        if (shouldContinue) {
            // 다음 구간의 시작점은 마지막 working day의 하루 전
            d = getPreviousDate(workingDays[workingDays.length - 1], 1);
        }
    }

    return streak;
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
