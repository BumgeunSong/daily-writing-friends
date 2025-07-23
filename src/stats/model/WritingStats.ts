import { StreakInfo } from './StreakInfo';

export interface WritingStats {
    user: {
        id: string;
        nickname: string | null;
        realname: string | null;
        profilePhotoURL: string | null;
        bio: string | null;
    }
    contributions: Contribution[];
    badges: WritingBadge[];
    /** @deprecated Use streakInfo.currentStreak instead */
    recentStreak: number;
    /** Enhanced streak information with recovery status */
    streakInfo?: StreakInfo;
}

export type Contribution = {
    createdAt: string;
    contentLength: number | null;
}

export interface WritingBadge {
    name: string
    emoji: string
}