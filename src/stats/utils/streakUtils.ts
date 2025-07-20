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

// 현재는 KST로 고정하지만 나중에는 해당 User의 timezone을 반환하도록 해야 함
export function getUserTimeZone(): string {
  return 'Asia/Seoul';
}
