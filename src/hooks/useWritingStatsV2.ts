// TODO:
// 1. get posting data of certain user from firestore 
// 2. calculate WritingStats from posting data
// 3. return stats

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { WritingStats, Contribution, WritingBadge } from '@/types/WritingStats';
import { Posting } from '@/types/Posting';
import { User } from '@/types/User';
import { fetchUserData } from '@/utils/userUtils';
import { calculateCurrentStreak } from '@/utils/streakUtils';

export function useWritingStatsV2(userId: string) {    
    return useQuery({
        queryKey: ['writingStatsV2', userId],
        queryFn: async (): Promise<WritingStats> => {
            if (!userId) {
                throw new Error('User ID is required');
            }

            // 1. 사용자 정보 가져오기
            const userData = await fetchUserData(userId);

            if (!userData) {
                throw new Error('User not found');
            }

            // 2. 포스팅 데이터 가져오기
            const postings = await fetchPostingData(userId);

            // 3. WritingStats 계산
            return calculateWritingStats(userData, postings);
        },
        enabled: !!userId,
    });
}

async function fetchPostingData(userId: string): Promise<Posting[]> {
    try {
        const postingsRef = collection(firestore, 'users', userId, 'postings');
        const q = query(postingsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as Posting);
    } catch (error) {
        console.error('Error fetching posting data:', error);
        throw error;
    }
}

function calculateWritingStats(user: User, postings: Posting[]): WritingStats {

    // 3. Contributions 배열 생성
    const contributions: Contribution[] = postings.map(posting => ({
        createdAt: posting.createdAt.toDate().toISOString(),
        contentLength: posting.post.contentLength
    }));

    const streak = calculateCurrentStreak(postings);
    const badges = createStreakBadge(streak);
    // 4. WritingStats 객체 반환
    return {
        user: {
            id: user.uid,
            nickname: user.nickname || null,
            realname: user.realName || null,
            profilePhotoURL: user.profilePhotoURL || null,
            bio: user.bio || null
        },
        contributions,
        badges: badges
    };
}   

function createStreakBadge(streak: number): WritingBadge[] {
    if (streak < 2) return [];
    
    return [{
        name: `연속 ${streak}일차`,
        emoji: '🔥'
    }];
}