import { Posting } from '@/types/Posting';

// pure function to calculate current streak
export function calculateCurrentStreak(postings: Posting[]): number {
    if (!postings.length) {
        return 0;
    }

    // 날짜별로 포스팅을 그룹화
    const postingDates = postings.map(posting => 
        posting.createdAt.toDate().toISOString().split('T')[0]
    );
    const uniqueDates = [...new Set(postingDates)].sort().reverse(); // 최신 날짜순

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastPostDate = new Date(uniqueDates[0]);
    lastPostDate.setHours(0, 0, 0, 0);

    // 어제까지 포스팅이 없으면 스트릭은 0
    if (lastPostDate.getTime() < yesterday.getTime()) {
        return 0;
    }

    let streak = 1; // 최소 1일
    let currentDate = lastPostDate;

    // 연속된 날짜 확인
    for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i]);
        prevDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor(
            (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
            streak++;
            currentDate = prevDate;
        } else {
            break; // 연속이 끊기면 중단
        }
    }

    return streak;
}