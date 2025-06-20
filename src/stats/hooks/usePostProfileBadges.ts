import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Posting } from '@/post/model/Posting';
import { mapDocumentToPosting } from '@/shared/utils/postingUtils';
import { WritingBadge } from '@/stats/model/WritingStats';
import { calculateCurrentStreak } from '@/stats/utils/streakUtils';
import { fetchUserCommentingsByDateRange, fetchUserReplyingsByDateRange } from '@/user/api/commenting';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';

export function usePostProfileBadges(userId: string) {
    return useQuery({
        queryKey: ['postProfileBadges', userId],
        queryFn: () => fetchUserBadges(userId),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // 5분 동안 데이터를 'fresh'하게 유지
        cacheTime: 10 * 60 * 1000, // 10분 동안 캐시 유지
    });
}

async function fetchUserBadges(userId: string): Promise<WritingBadge[]> {
    try {
        const [postings, commentingData] = await Promise.all([
            fetchPostingData(userId),
            fetchCommentingData(userId)
        ]);
        
        const postingStreak = calculateCurrentStreak(postings);
        const postingBadges = createStreakBadge(postingStreak);
        const commentingBadges = createCommentingBadges(commentingData);
        
        return [...postingBadges, ...commentingBadges];
    } catch (error) {
        console.error('Error fetching user badges:', error);
        return [];
    }
}

async function fetchPostingData(userId: string): Promise<Posting[]> {
    const postingsRef = collection(firestore, 'users', userId, 'postings');
    const q = query(postingsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => mapDocumentToPosting(doc));
}

async function fetchCommentingData(userId: string) {
    const workingDays = getRecentWorkingDays();
    const start = workingDays[0];
    const end = new Date(workingDays[workingDays.length - 1]);
    end.setHours(23, 59, 59, 999);

    const [commentings, replyings] = await Promise.all([
        fetchUserCommentingsByDateRange(userId, start, end),
        fetchUserReplyingsByDateRange(userId, start, end)
    ]);

    return { commentings, replyings };
}

function createStreakBadge(streak: number): WritingBadge[] {
    if (streak < 2) return [];

    return [{
        name: `연속 ${streak}일`,
        emoji: '🔥'
    }];
}

function calculateCommentTemperature(commentCount: number): number {
    if (commentCount === 0) {
        return 0.0;
    }
    
    if (commentCount >= 1 && commentCount <= 10) {
        return 36.5;
    }
    
    // Calculate temperature for comments > 10
    // Each block of 10 comments (11-20, 21-30, etc.) adds 0.5℃
    const additionalBlocks = Math.floor((commentCount - 1) / 10);
    const temperature = 36.5 + (additionalBlocks * 0.5);
    
    // Cap at 100.0
    const cappedTemperature = Math.min(temperature, 100.0);
    
    return Math.round(cappedTemperature * 10) / 10; // Round to 1 decimal place
}

function createCommentingBadges(commentingData: { commentings: any[], replyings: any[] }): WritingBadge[] {
    const { commentings, replyings } = commentingData;
    const totalComments = commentings.length + replyings.length;
    const temperature = calculateCommentTemperature(totalComments);
    
    const badges: WritingBadge[] = [];
    
    if (temperature > 0) {
        badges.push({
            name: `댓글 온도 ${temperature}℃`,
            emoji: '🌡️'
        });
    }
    
    return badges;
}