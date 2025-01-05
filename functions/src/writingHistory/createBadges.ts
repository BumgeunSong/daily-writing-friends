import { WritingHistory } from "../types/WritingHistory";
import { isSameDay, TimeZone } from "../dateUtils";

interface WritingBadge {
    name: string
    emoji: string
}

function calculateRecentStreak(
    workingDays: Date[],
    histories: WritingHistory[]
): number {
    const reversedDays = [...workingDays].reverse();
    let streak = 0;
    
    for (const day of reversedDays) {
        const hasWritingHistory = histories.some(history => {
            const isSameDayAsWorkingDay = isSameDay(history.createdAt.toDate(), day, TimeZone.KST);
            const hasContentLength = history.post?.contentLength != null;
            return isSameDayAsWorkingDay && hasContentLength;
        });

        if (hasWritingHistory) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

// 배지 생성 (순수 함수)
function createBadges(streak: number): WritingBadge[] {
    if (streak < 2) return [];
    
    return [{
        name: `연속 ${streak}일차`,
        emoji: '🔥'
    }];
}

export { createBadges, calculateRecentStreak, WritingBadge };