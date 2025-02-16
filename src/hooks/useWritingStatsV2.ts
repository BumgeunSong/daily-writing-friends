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

export function useWritingStatsV2(userIds: string[]) {    
    return useQuery({
        queryKey: ['writingStatsV2', userIds],
        queryFn: () => fetchMultipleUserStats(userIds),
        enabled: userIds.length > 0,
    });
}

// 여러 사용자의 통계를 병렬로 가져오기
async function fetchMultipleUserStats(userIds: string[]): Promise<WritingStats[]> {
    if (!userIds.length) {
        return [];
    }

    try {
        const statsPromises = userIds.map(fetchSingleUserStats);
        const results = await Promise.all(statsPromises);
        return results.filter((result): result is WritingStats => result !== null);
    } catch (error) {
        console.error('Error fetching multiple user stats:', error);
        throw error;
    }
}

// 단일 사용자의 통계 가져오기
async function fetchSingleUserStats(userId: string): Promise<WritingStats | null> {
    try {
        const userData = await fetchUserData(userId);
        if (!userData) {
            console.error(`User not found: ${userId}`);
            return null;
        }

        const postings = await fetchPostingData(userId);
        return calculateWritingStats(userData, postings);
    } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        return null;
    }
}

// 포스팅 데이터 가져오기
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

// 기여도 배열 생성
function createContributions(postings: Posting[]): Contribution[] {
    return postings.map(posting => ({
        createdAt: posting.createdAt.toDate().toISOString(),
        contentLength: posting.post.contentLength
    }));
}

// 사용자 정보 객체 생성
function createUserInfo(user: User) {
    return {
        id: user.uid,
        nickname: user.nickname || null,
        realname: user.realName || null,
        profilePhotoURL: user.profilePhotoURL || null,
        bio: user.bio || null
    };
}

// 스트릭 배지 생성
function createStreakBadge(streak: number): WritingBadge[] {
    if (streak < 2) return [];
    
    return [{
        name: `연속 ${streak}일차`,
        emoji: '🔥'
    }];
}

// WritingStats 계산
function calculateWritingStats(user: User, postings: Posting[]): WritingStats {
    const contributions = createContributions(postings);
    const streak = calculateCurrentStreak(postings);
    const badges = createStreakBadge(streak);

    return {
        user: createUserInfo(user),
        contributions,
        badges
    };
}