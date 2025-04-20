
const HOLIDAYS: Date[] = [
    new Date('2024-12-31T00:00:00Z'),
    new Date('2025-01-01T00:00:00Z'),
    new Date('2025-01-28T00:00:00Z'),
    new Date('2025-01-29T00:00:00Z'),
    new Date('2025-01-30T00:00:00Z')
];

// functions to get 20 recent working days (return value's length should be 20
export function getRecentWorkingDays(): Date[] {
    const workingDays: Date[] = [];
    const currentDate = new Date();
    while (workingDays.length < 20) {
        if (isWorkingDay(currentDate)) {
            workingDays.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() - 1);
    }
    return workingDays.reverse();
}

export function isWorkingDay(date: Date): boolean {
    // if it's weekend or holiday based on user's timezone, return false 
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (isWeekend(date, userTimeZone) || isHoliday(date, userTimeZone)) {
        return false;
    }
    return true;
}

function isWeekend(date: Date, timeZone: string): boolean {
    const dateInTimeZone = new Date(date.toLocaleString('en-US', { timeZone }));
    const day = dateInTimeZone.getDay();
    return day === 0 || day === 6;
}

function isHoliday(date: Date, timeZone: string): boolean {
    const dateInTimeZone = new Date(date.toLocaleString('en-US', { timeZone }));
    return HOLIDAYS.some(holiday =>
        dateInTimeZone.getFullYear() === holiday.getFullYear() &&
        dateInTimeZone.getMonth() === holiday.getMonth() &&
        dateInTimeZone.getDate() === holiday.getDate()
    );
}


// 날짜를 YYYY.MM.DD HH:MM 형식으로 포매팅하는 함수
export const formatDateToKorean = (date: Date): string => {
    return new Intl.DateTimeFormat('ko', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  