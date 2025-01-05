import { WritingHistory } from "@/types/\bWritingHistory";

/**
 * KST를 기준으로 주어진 날짜가 영업일인지 확인합니다 (주말과 공휴일 제외)
 * @param date - Date 객체
 * @returns boolean - 영업일이면 true, 아니면 false
 * @throws Error - 유효하지 않은 Date 객체인 경우
 */
export function isWorkingDay(date: Date): boolean {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object');
  }

  if (isWeekendByKST(date)) {
    return false;
  }

  if (isHolidayByKST(date)) {
    return false;
  }

  return true;
} 

interface Holiday {
    date: Date;
  }
  
  const HOLIDAYS: Holiday[] = [
    { date: new Date('2024-12-31T00:00:00Z') },
    { date: new Date('2025-01-01T00:00:00Z') },
    { date: new Date('2025-01-28T00:00:00Z') },
    { date: new Date('2025-01-29T00:00:00Z') },
    { date: new Date('2025-01-30T00:00:00Z') }
  ];
  
  function isHolidayByKST(date: Date): boolean {
    return HOLIDAYS.some(holiday => isSameDayByKST(holiday.date, date));
  }
  
  function isWeekendByKST(date: Date): boolean {
      const kstDate = new Date(date.toLocaleString('en-US', {
          timeZone: 'Asia/Seoul'
      }));
      const dayOfWeek = kstDate.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
}

export function getContentLengthOfWorkingDays(writingHistory: WritingHistory[], workingDays: Date[]): number[] {
    return workingDays
    .map(workingDay => {
      const history = writingHistory.find(history => {
        return isSameDayByKST(history.createdAt.toDate(), workingDay);
      });
      return history?.post?.contentLength ?? 0;
    });
  }

export function getRecentWorkingDays(count: number): Date[] {
  const workingDays: Date[] = [];
  const currentDate = new Date();

  while (workingDays.length < count) {
    if (isWorkingDay(currentDate)) {
      workingDays.push(currentDate);
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return workingDays.reverse();
}

// 두 날짜가 같은 연도, 같은 달, 같은 날인지 확인합니다 (KST 기준)
export function isSameDayByKST(date1: Date, date2: Date): boolean {
    const kstDate1 = new Date(date1.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const kstDate2 = new Date(date2.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

    return (
        kstDate1.getFullYear() === kstDate2.getFullYear() &&
        kstDate1.getMonth() === kstDate2.getMonth() &&
        kstDate1.getDate() === kstDate2.getDate()
    );
}
