export enum TimeZone {
    KST = 'Asia/Seoul',
    UTC = 'UTC'
}

/**
 * KST를 기준으로 주어진 날짜가 영업일인지 확인합니다 (주말만 제외, 공휴일은 향후 구현)
 * @param date - Date 객체
 * @returns boolean - 영업일이면 true, 아니면 false
 * @throws Error - 유효하지 않은 Date 객체인 경우
 */
export function isWorkingDay(date: Date): boolean {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error('Invalid Date object');
    }

    if (isWeekendByKST(date, TimeZone.KST)) {
        return false;
    }

    // TODO: Holiday logic will be implemented in future work
    // if (isHolidayByKST(date, TimeZone.KST)) {
    //     return false;
    // }

    return true;
}

// TODO: Holiday logic will be implemented in future work
// interface Holiday {
//     date: Date;
// }

// const HOLIDAYS: Holiday[] = [
//     { date: new Date('2024-12-31T00:00:00Z') },
//     { date: new Date('2025-01-01T00:00:00Z') },
//     { date: new Date('2025-01-28T00:00:00Z') },
//     { date: new Date('2025-01-29T00:00:00Z') },
//     { date: new Date('2025-01-30T00:00:00Z') }
// ];

// TODO: Holiday logic will be implemented in future work
// function isHolidayByKST(date: Date, timeZone: TimeZone): boolean {
//     return HOLIDAYS.some(holiday => isSameDay(holiday.date, date, timeZone));
// }

function isWeekendByKST(date: Date, timeZone: TimeZone): boolean {
    const dateInTimeZone = new Date(date.toLocaleString('en-US', { timeZone }));
    const dayOfWeek = dateInTimeZone.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * 주어진 날짜로부터 이전 날짜를 생성하는 순수 함수
 */
function getPreviousDate(date: Date): Date {
    const previousDate = new Date(date);
    previousDate.setDate(date.getDate() - 1);
    return previousDate;
}

/**
 * 주어진 날짜를 자정(00:00:00)으로 정규화하는 순수 함수
 */
function normalizeToMidnight(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}

/**
 * 주어진 날짜의 이전 영업일을 찾는 순수 함수
 * @param date - 기준 날짜
 * @returns Date - 이전 영업일
 */
export function getPreviousWorkingDay(date: Date): Date {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error('Invalid Date object');
    }

    let previousDate = getPreviousDate(date);
    
    while (!isWorkingDay(previousDate)) {
        previousDate = getPreviousDate(previousDate);
    }
    
    return previousDate;
}

/**
 * 주어진 날짜를 KST 기준으로 YYYY-MM-DD 형식의 문자열로 변환하는 순수 함수
 * @param date - 변환할 날짜
 * @returns string - YYYY-MM-DD 형식의 날짜 문자열
 */
export function getDateKey(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error('Invalid Date object');
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: TimeZone.KST,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const parts = formatter.format(date).split('/');
    return `${parts[2]}-${parts[0]}-${parts[1]}`;
}

/**
 * Date 객체를 KST 시간대로 변환하는 순수 함수
 * @param date - 변환할 날짜
 * @returns Date - KST로 변환된 날짜
 */
export function toSeoulDate(date: Date): Date {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error('Invalid Date object');
    }

    return new Date(date.toLocaleString('en-US', { timeZone: TimeZone.KST }));
}

/**
 * 최근 근무일 배열을 생성하는 순수 함수
 */
export function getRecentWorkingDays(count: number): Date[] {
    const workingDays: Date[] = [];
    let currentDate = normalizeToMidnight(new Date());

    while (workingDays.length < count) {
        if (isWorkingDay(currentDate)) {
            workingDays.push(new Date(currentDate));
        }
        currentDate = getPreviousDate(currentDate);
    }

    // 날짜 오름차순 정렬 (과거 -> 최근)
    return workingDays.reverse();
}

// 두 날짜가 같은 연도, 같은 달, 같은 날인지 확인합니다 (KST 기준)
export function isSameDay(date1: Date, date2: Date, timeZone: TimeZone): boolean {
    const date1InTimeZone = new Date(date1.toLocaleString('en-US', { timeZone }));
    const date2InTimeZone = new Date(date2.toLocaleString('en-US', { timeZone }));

    return (
        date1InTimeZone.getFullYear() === date2InTimeZone.getFullYear() &&
        date1InTimeZone.getMonth() === date2InTimeZone.getMonth() &&
        date1InTimeZone.getDate() === date2InTimeZone.getDate()
    );
}

/**
 * 주어진 날짜를 현재 시각과 비교해 한국어 상대 시간 문자열(예: '3분 전', '2일 후')로 반환합니다.
 * 10초 미만은 '방금 전'으로 처리합니다.
 * @param date - 비교할 날짜
 * @returns string - 한국어 상대 시간 문자열
 */
export function formatRelativeTimeKorean(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const absDiffMs = Math.abs(diffMs);

    // 10초 미만은 '방금 전'
    if (absDiffMs < 10000) {
        return '방금 전';
    }

    // 단위별 초/밀리초
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ['year', 1000 * 60 * 60 * 24 * 365],
        ['month', 1000 * 60 * 60 * 24 * 30],
        ['week', 1000 * 60 * 60 * 24 * 7],
        ['day', 1000 * 60 * 60 * 24],
        ['hour', 1000 * 60 * 60],
        ['minute', 1000 * 60],
        ['second', 1000],
    ];

    for (const [unit, unitMs] of units) {
        const diff = diffMs / unitMs;
        if (Math.abs(diff) >= 1) {
            const rounded = Math.round(diff);
            const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });
            return rtf.format(rounded, unit);
        }
    }
    // fallback (이론상 도달 불가)
    return '방금 전';
}
