import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Posting } from '@/post/model/Posting';
import { mapDocumentToPosting } from '@/shared/utils/postingUtils';
import { WritingBadge } from '@/stats/model/WritingStats';
import { calculateCurrentStreak } from '@/stats/utils/streakUtils';
import { fetchUserCommentingsByDateRange, fetchUserReplyingsByDateRange } from '@/user/api/commenting';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';

export function useWritingBadges(userId: string) {
    return useQuery({
        queryKey: ['writingBadges', userId],
        queryFn: () => fetchUserBadges(userId),
        enabled: !!userId,
        staleTime: 2 * 60 * 1000, // 2분 동안 데이터를 'fresh'하게 유지
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

function createCommentingBadges(commentingData: { commentings: any[], replyings: any[] }): WritingBadge[] {
    // TODO: Implement commenting badge creation logic
    // - Calculate total comments + replies count
    // - Create badges based on activity level (e.g., 활발한 댓글러, 소통왕 등)
    // - Consider recent activity patterns
    // - Maybe add badges for helpful comments or community engagement
    
    const { commentings, replyings } = commentingData;
    const totalActivity = commentings.length + replyings.length;
    
    // Placeholder logic - replace with actual badge criteria
    if (totalActivity >= 50) {
        return [{
            name: '소통왕',
            emoji: '💬'
        }];
    } else if (totalActivity >= 20) {
        return [{
            name: '활발한 댓글러',
            emoji: '🗨️'
        }];
    }
    
    return [];
}