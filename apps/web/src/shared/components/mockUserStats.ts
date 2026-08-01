import type { Contribution, WritingStats } from '@/stats/model/WritingStats';

const WEEKS_TO_GENERATE = 4; // 잔디 그리드가 보여주는 최근 4주와 맞춘 값
const DAYS_PER_WEEK = 7;
const SUNDAY = 0;
const MONDAY = 1;
const FRIDAY = 5;
const DAYS_FROM_SUNDAY_TO_MONDAY = 6;

// 평일 슬롯(월~금 20칸)별 글 분량(글자 수). null은 그날 글을 쉬어 잔디가 비는 칸이다.
// 두 프로필로 서로 다른 잔디 상태를 보여줘 "며칠 빠져도 괜찮다"는 안심을 준다.

/** 거의 매일 꽉 채운 고인물. 빈칸 없이 진한 초록 위주. */
const FULL_STREAK_LENGTHS: (number | null)[] = [
  320, 480, 300, 540, 360,
  420, 500, 330, 560, 300,
  380, 520, 340, 460, 300,
  500, 360, 540, 320, 480,
];

/** 대체로 쓰되 가끔 빠지는 현실적인 리듬. 농도가 골고루 섞이고 빈칸도 조금 있다. */
const REALISTIC_LENGTHS: (number | null)[] = [
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
export function generateMockContributions(
  today: Date = new Date(),
  weekdayLengths: (number | null)[] = REALISTIC_LENGTHS,
): Contribution[] {
  const contributions: Contribution[] = [];
  const cursor = findGridStartMonday(today);
  let weekdayIndex = 0;

  while (cursor <= today) {
    if (isWeekday(cursor)) {
      const contentLength = weekdayLengths[weekdayIndex] ?? null;
      if (contentLength !== null) {
        contributions.push({ createdAt: toLocalISODate(cursor), contentLength });
      }
      weekdayIndex++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return contributions;
}

interface MockProfile {
  nickname: string;
  profilePhotoURL: string;
  bio: string;
  badge: { name: string; emoji: string };
  recentStreak: number;
  weekdayLengths: (number | null)[];
}

function buildMockStats(profile: MockProfile): WritingStats {
  return {
    user: {
      id: profile.nickname,
      nickname: profile.nickname,
      realname: null,
      profilePhotoURL: profile.profilePhotoURL,
      bio: profile.bio,
    },
    contributions: generateMockContributions(new Date(), profile.weekdayLengths),
    badges: [profile.badge],
    recentStreak: profile.recentStreak,
  };
}

// 두 명의 잔디를 나란히 보여줘 방문자가 자신을 어디에든 대입할 수 있게 한다.
export const mockStatsShowcase: WritingStats[] = [
  buildMockStats({
    nickname: '매생이',
    profilePhotoURL: '/mock-avatars/mae-saeng.svg',
    bio: '거의 매일 쓰는 고인물',
    badge: { name: '연속 20일', emoji: '🔥' },
    recentStreak: 20,
    weekdayLengths: FULL_STREAK_LENGTHS,
  }),
  buildMockStats({
    nickname: '매글이',
    profilePhotoURL: '/mock-avatars/mae-geul.svg',
    bio: '가끔 빠져도 꾸준히',
    badge: { name: '연속 5일', emoji: '✨' },
    recentStreak: 5,
    weekdayLengths: REALISTIC_LENGTHS,
  }),
];
