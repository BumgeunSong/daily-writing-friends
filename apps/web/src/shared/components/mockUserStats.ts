import type { Contribution, WritingStats } from '@/stats/model/WritingStats';

const WEEKS_TO_GENERATE = 4; // 잔디 그리드가 보여주는 최근 4주와 맞춘 값
const DAYS_PER_WEEK = 7;
const SUNDAY = 0;
const MONDAY = 1;
const FRIDAY = 5;
const DAYS_FROM_SUNDAY_TO_MONDAY = 6;

/**
 * 평일 슬롯별 글 분량(글자 수). null은 그날 글을 쉬어 잔디가 비는 칸이다.
 * 색 농도가 1~4단계로 골고루 보이도록 값을 흩뿌리고, 사람 냄새가 나도록 빈칸을 섞었다.
 */
const WEEKDAY_CONTENT_LENGTHS: (number | null)[] = [
  120, 250, null, 300, 180,
  400, 150, 520, 200, 90,
  0, 210, 300, null, 160,
  250, 180, 420, 300, 240,
];

function isWeekday(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= MONDAY && dayOfWeek <= FRIDAY;
}

function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function findMondayOfWeek(date: Date): Date {
  const monday = new Date(date);
  const dayOfWeek = monday.getDay();
  const daysSinceMonday = dayOfWeek === SUNDAY ? DAYS_FROM_SUNDAY_TO_MONDAY : dayOfWeek - MONDAY;
  monday.setDate(monday.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function findGridStartMonday(today: Date): Date {
  const currentWeekMonday = findMondayOfWeek(today);
  const startMonday = new Date(currentWeekMonday);
  startMonday.setDate(currentWeekMonday.getDate() - (WEEKS_TO_GENERATE - 1) * DAYS_PER_WEEK);
  return startMonday;
}

/**
 * 오늘을 기준으로 최근 4주치 평일 잔디 데이터를 만든다.
 * 하드코딩한 고정 날짜는 시간이 지나면 그리드 표시 창을 벗어나 잔디가 텅 비므로,
 * 항상 today에 맞춰 생성해 마케팅 카드가 늘 채워진 상태로 보이게 한다.
 */
export function generateMockContributions(today: Date = new Date()): Contribution[] {
  const contributions: Contribution[] = [];
  const cursor = findGridStartMonday(today);
  let weekdayIndex = 0;

  while (cursor <= today) {
    if (isWeekday(cursor)) {
      const contentLength = WEEKDAY_CONTENT_LENGTHS[weekdayIndex] ?? null;
      if (contentLength !== null) {
        contributions.push({ createdAt: toLocalISODate(cursor), contentLength });
      }
      weekdayIndex++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return contributions;
}

export const mockUserStats: WritingStats = {
  user: {
    id: '1',
    nickname: '매글프',
    realname: '김매글',
    profilePhotoURL: 'https://github.com/shadcn.png',
    bio: '매일 글쓰기를 실천하는 프렌즈',
  },
  contributions: generateMockContributions(),
  badges: [{ name: '연속 12일', emoji: '🔥' }],
  recentStreak: 5,
};
