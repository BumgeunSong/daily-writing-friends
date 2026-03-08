export interface WritingStats {
  user: {
    id: string;
    nickname: string | null;
    realname: string | null;
    profilePhotoURL: string | null;
    bio: string | null;
  };
  contributions: Contribution[];
  badges: WritingBadge[];
  recentStreak: number;
}

export interface Contribution {
  createdAt: string;
  contentLength: number | null;
  isHoliday?: boolean;
  holidayName?: string;
}

export interface WritingBadge {
  name: string;
  emoji: string;
}
