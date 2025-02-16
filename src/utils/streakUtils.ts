import { isWorkingDay } from '@/utils/dateUtils';
import { Posting } from '@/types/Posting';
import { Timestamp } from 'firebase/firestore';
// Helper: Converts a Date to a YYYY-MM-DD string in the given timezone.
export function getDateKey(date: Date, timeZone?: string): string {
    // timeZone이 제공되지 않으면 사용자의 타임존 사용
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

// 사용자의 타임존을 가져오는 함수
export function getUserTimeZone(): string {
    try {
        // 1. 브라우저의 타임존 정보 가져오기
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return timeZone;
    } catch (error) {
        console.warn('Failed to get user timezone:', error);
        return 'Asia/Seoul'; // 기본값으로 KST 사용
    }
}

// 디버깅을 위한 테스트 함수
function testDateConversion(timestamp: Timestamp) {
    const date = timestamp.toDate();
    const userTimeZone = getUserTimeZone();
    
    console.log('Original Date:', date.toISOString());
    console.log('User TimeZone:', userTimeZone);
    console.log('Local Date Key:', getDateKey(date)); // 사용자 타임존
    console.log('KST Date Key:', getDateKey(date, 'Asia/Seoul'));
    console.log('UTC Date Key:', getDateKey(date, 'UTC'));
}

// 사용 예시:
const timestamp = new Timestamp(1739525815, 673000000); // 2025-01-16 in KST
testDateConversion(timestamp);
