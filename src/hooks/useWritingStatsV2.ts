// TODO:
// 1. get posting data of certain user from firestore 
// 2. calculate WritingStats from posting data
// 3. return stats

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Posting } from '@/types/Posting';
import { User } from '@/types/User';
import { WritingStats, Contribution, WritingBadge } from '@/types/WritingStats';
import { getRecentWorkingDays } from '@/utils/dateUtils';
import { mapDocumentToPosting } from '@/utils/postUtils';
import { getDateKey, getUserTimeZone } from '@/utils/streakUtils';
import { calculateCurrentStreak } from '@/utils/streakUtils';
import { fetchUserData } from '@/utils/userUtils';
export function useWritingStatsV2(userIds: string[]) {
    return useQuery({
        queryKey: ['writingStatsV2', userIds],
        queryFn: () => fetchMultipleUserStats(userIds),
        enabled: userIds.length > 0,
        // 캐시 설정
        staleTime: 1 * 60 * 1000, // 5분 동안 데이터를 'fresh'하게 유지
        cacheTime: 30 * 60 * 1000, // 30분 동안 캐시 유지
        // 실시간 업데이트를 위한 주기적 리프레시
        refetchInterval: 5 * 60 * 1000, // 5분마다 리프레시
        refetchOnWindowFocus: true, // 윈도우 포커스 시 리프레시
    });
}

async function fetchMultipleUserStats(userIds: string[]): Promise<WritingStats[]> {
    if (!userIds.length) return [];

    try {
        const statsPromises = userIds.map(fetchSingleUserStats);
        const results = await Promise.all(statsPromises);
        return sort(results.filter((result): result is WritingStats => result !== null));
    } catch (error) {
        throw error;
    }
}

function sort(writingStats: WritingStats[]): WritingStats[] {
    return writingStats.sort((a, b) => {
        if (b.recentStreak !== a.recentStreak) {
            return b.recentStreak - a.recentStreak;
        }

        const aContentLengthSum = a.contributions.reduce((sum, contribution) => sum + (contribution.contentLength ?? 0), 0);
        const bContentLengthSum = b.contributions.reduce((sum, contribution) => sum + (contribution.contentLength ?? 0), 0);
        return bContentLengthSum - aContentLengthSum;
    });
}

async function fetchSingleUserStats(userId: string): Promise<WritingStats | null> {
    try {
        const userData = await fetchUserData(userId);
        if (!userData) return null;

        const postings = await fetchPostingData(userId);
        return calculateWritingStats(userData, postings);
    } catch (error) {
        return null;
    }
}

async function fetchPostingData(userId: string): Promise<Posting[]> {
    try {
        const postingsRef = collection(firestore, 'users', userId, 'postings');
        const q = query(postingsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => mapDocumentToPosting(doc));
    } catch (error) {
        throw error;
    }
}


function createContributions(postings: Posting[], workingDays: Date[]): Contribution[] {
    const userTimeZone = getUserTimeZone();
    const postingMap = new Map<string, number>();
    
    for (const posting of postings) {
        const postingDate = posting.createdAt.toDate();
        const key = getDateKey(postingDate, userTimeZone);
        const currentSum = postingMap.get(key) || 0;
        postingMap.set(key, currentSum + posting.post.contentLength);
    }

    return workingDays.map(day => ({
        createdAt: getDateKey(day, userTimeZone),
        contentLength: postingMap.has(getDateKey(day, userTimeZone)) 
            ? postingMap.get(getDateKey(day, userTimeZone))! 
            : null
    }));
}

function createUserInfo(user: User) {
    return {
        id: user.uid,
        nickname: user.nickname || null,
        realname: user.realName || null,
        profilePhotoURL: user.profilePhotoURL || null,
        bio: user.bio || null
    };
}

function createStreakBadge(streak: number): WritingBadge[] {
    if (streak < 2) return [];
    if (streak > 20) return [{
        name: `연속 20일 이상`,
        emoji: '🔥'
    }];

    return [{
        name: `연속 ${streak}일차`,
        emoji: '🔥'
    }];
}

function calculateWritingStats(user: User, postings: Posting[]): WritingStats {
    const workingDays = getRecentWorkingDays();
    const contributions = createContributions(postings, workingDays);
    const streak = calculateCurrentStreak(postings);
    const badges = createStreakBadge(streak);

    return {
        user: createUserInfo(user),
        contributions,
        badges,
        recentStreak: streak
    };
}