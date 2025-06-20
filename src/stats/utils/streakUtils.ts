import { Posting } from '@/post/model/Posting';
import { isWorkingDay } from '@/shared/utils/dateUtils';

// Types
type DateKey = string;
type PostingDays = Set<DateKey>;

// Date Utils
export function getDateKey(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: getUserTimeZone(),
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
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
export function buildPostingDaysSet(postings: Posting[]): PostingDays {
    return new Set(
        postings.map(posting => {
            const postingDate = posting.createdAt.toDate();
            return getDateKey(postingDate);
        })
    );
}

export function hasPostingOnDate(date: Date, postingDays: PostingDays): boolean {
    const key = getDateKey(date);
    return postingDays.has(key);
}

// A. 과거로 working day만 순회하는 제너레이터
function* workingDaysBackward(
    start: Date,
    isWorkingDayFn: (d: Date) => boolean,
): Generator<Date> {
    let cur = new Date(start)
    while (true) {
        if (isWorkingDayFn(cur)) {
            yield new Date(cur)
        }
        cur = getPreviousDate(cur)
    }
}

// B. 조건이 true인 동안만 iterable에서 값을 수집하는 함수
function takeWhile<T>(
    iterable: Iterable<T>,
    pred: (item: T) => boolean,
): T[] {
    const out: T[] = []
    for (const x of iterable) {
        if (!pred(x)) break
        out.push(x)
    }
    return out
}

/**
 * 현재 streak(연속 작성일)를 계산합니다. (while 없이 함수형/제너레이터 방식)
 * - 오늘이 working day이고 글이 있으면 오늘부터, 아니면 어제부터 시작
 * - working day만 과거로 순회하며 posting이 있는 날만 streak로 카운트
 * - posting 없는 working day를 만나면 streak 종료
 */
export function calculateCurrentStreak(postings: Posting[]): number {
    const postingDays = buildPostingDaysSet(postings)
    const today = new Date()

    // 오늘이 working day이고 글이 있으면 today, 아니면 어제부터 시작
    const startDay =
        isWorkingDay(today) && postingDays.has(getDateKey(today))
            ? today
            : getPreviousDate(today)

    // working day를 과거로 순회하며 posting이 있는 날만 streak로 카운트
    const streakDays = takeWhile(
        workingDaysBackward(
            startDay,
            date => isWorkingDay(date),
        ),
        date => postingDays.has(getDateKey(date)),
    )

    return streakDays.length
}

/**
 * Determines if more posting data is needed for accurate streak calculation
 * This is a pure function that makes pagination decisions based on streak patterns
 */
export function shouldFetchMoreForStreak(
    currentStreak: number,
    previousStreak: number,
    hasMoreData: boolean,
    fetchedCount: number,
    requestedCount: number
): boolean {
    // If no more data is available, stop
    if (!hasMoreData || fetchedCount < requestedCount) {
        return false;
    }
    
    // If streak hasn't increased from previous iteration, we have enough data
    if (currentStreak === previousStreak) {
        return false;
    }
    
    // The streak increased, so we might need more data
    return true;
}

/**
 * Calculates the next page size for streak pagination
 * Gradually increases page size but caps it to prevent excessive fetching
 */
export function getNextPageSize(currentPageSize: number, maxPageSize: number = 100): number {
    return Math.min(currentPageSize + 20, maxPageSize);
}

// 현재는 KST로 고정하지만 나중에는 해당 User의 timezone을 반환하도록 해야 함
export function getUserTimeZone(): string {
    return 'Asia/Seoul';
}