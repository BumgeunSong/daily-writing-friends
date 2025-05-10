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

/**
 * 날짜를 YYYY.MM.DD 형식으로 포맷팅합니다.
 * @param date Date 객체 또는 타임스탬프
 * @returns 포맷팅된 문자열 (YYYY.MM.DD)
 */
export const formatDate = (date: Date | undefined | null): string => {
  if (!date) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}.${month}.${day}`;
};

/**
 * 상대적인 시간을 표시합니다. (예: '3분 전', '2시간 전', '어제', '3일 전' 등)
 * @param date Date 객체 또는 타임스탬프
 * @returns 상대 시간 문자열
 */
export const getRelativeTime = (date: Date | undefined | null): string => {
  if (!date) return '';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // 1분 이내
  if (diff < 60 * 1000) {
    return '방금 전';
  }
  
  // 1시간 이내
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}분 전`;
  }
  
  // 오늘 안에 (24시간 이내)
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}시간 전`;
  }
  
  // 어제
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  if (date >= yesterday) {
    return '어제';
  }
  
  // 7일 이내
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days}일 전`;
  }
  
  // 그 외에는 YYYY.MM.DD 형식
  return formatDate(date);
};
  