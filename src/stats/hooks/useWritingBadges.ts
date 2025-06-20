import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Posting } from '@/post/model/Posting';
import { mapDocumentToPosting } from '@/shared/utils/postingUtils';
import { WritingBadge } from '@/stats/model/WritingStats';
import { calculateCurrentStreak } from '@/stats/utils/streakUtils';

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
        const postings = await fetchPostingData(userId);
        const streak = calculateCurrentStreak(postings);
        return createStreakBadge(streak);
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

function createStreakBadge(streak: number): WritingBadge[] {
    if (streak < 2) return [];
    if (streak > 20) return [{
        name: `연속 20+일`,
        emoji: '🔥'
    }];

    return [{
        name: `연속 ${streak}일`,
        emoji: '🔥'
    }];
}