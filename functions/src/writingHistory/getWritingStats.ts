import { onRequest } from "firebase-functions/v2/https";
import admin from "../admin";
import { WritingHistory } from "../types/WritingHistory";
import { getRecentWorkingDays, isSameDay, TimeZone } from "../dateUtils";
import { createContributions, Contribution } from "./createContributions";

interface UserData {
    id: string;
    nickname: string | null;
    realName: string | null;
    profilePhotoURL: string | null;
    bio: string | null;
}

interface WritingStatsWithMeta extends WritingStats {
    streak: number;
    totalContributions: number;
}

interface WritingStats {
    user: UserData;
    contributions: Contribution[];
    badges: WritingBadge[];
}


export interface WritingBadge {
    name: string
    emoji: string
}

// 기여도 합계 계산 함수 수정: 작성한 날의 합계로 기여도 계산
const calculateTotalContributions = (contributions: Contribution[]): number => {
    return contributions.reduce((sum: number, value: Contribution) => sum + (value.contentLength !== null ? 1 : 0), 0);
};

// 사용자 데이터 변환 (순수 함수)
const createUserProfile = (id: string, data: FirebaseFirestore.DocumentData): UserData => ({
    id,
    nickname: data.nickname ?? null,
    realName: data.realName ?? null,
    profilePhotoURL: data.profilePhotoURL ?? null,
    bio: data.bio ?? null
});

// 단일 사용자의 WritingStats 생성 (순수 함수)
const createUserWritingStats = (
    userData: UserData,
    histories: WritingHistory[],
    workingDays: Date[]
): WritingStatsWithMeta | null => {
    if (histories.length === 0) return null;

    const contributions = createContributions(workingDays, histories);
    const streak = calculateRecentStreak(workingDays, histories);
    const totalContributions = calculateTotalContributions(contributions);
    const badges = createBadges(streak);

    return {
        user: userData,
        contributions,
        badges,
        streak,
        totalContributions
    };
};

// WritingStats 정렬 (순수 함수)
const sortWritingStats = (stats: WritingStatsWithMeta[]): WritingStats[] => {
    return stats
        .sort((a, b) => {
            if (b.streak !== a.streak) {
                return b.streak - a.streak;
            }
            return b.totalContributions - a.totalContributions;
        })
        .map(({ streak, totalContributions, ...stat }) => stat);
};

// 데이터베이스에서 사용자 기록 조회 (비순수 함수)
const fetchUserWritingHistory = async (
    userDoc: FirebaseFirestore.QueryDocumentSnapshot
): Promise<{
    userData: UserData;
    histories: WritingHistory[];
}> => {
    const histories = await userDoc.ref.collection('writingHistories').get();
    const userData = createUserProfile(userDoc.id, userDoc.data());

    return {
        userData,
        histories: histories.docs.map(doc => doc.data() as WritingHistory)
    };
};

export const getWritingStats = onRequest(
    { cors: true },
    async (req, res) => {
        if (req.method !== 'GET') {
            res.status(405).json({
                status: 'error',
                message: 'Method not allowed'
            });
            return;
        }

        try {
            const db = admin.firestore();
            const workingDays = getRecentWorkingDays(20);
            
            // 1. 사용자 데이터 조회
            const usersSnapshot = await db.collection('users').get();
            
            // 2. 각 사용자의 기록 조회
            const usersData = await Promise.all(
                usersSnapshot.docs.map(fetchUserWritingHistory)
            );

            // 3. WritingStats 생성
            const writingStatsWithMeta = usersData
                .map(({ userData, histories }) => 
                    createUserWritingStats(userData, histories, workingDays)
                )
                .filter((stats): stats is WritingStatsWithMeta => stats !== null);

            // 4. 정렬 및 최종 데이터 형식 변환
            const filteredStats = sortWritingStats(writingStatsWithMeta);

            res.status(200).json({
                status: 'success',
                data: {
                    writingStats: filteredStats
                }
            });

        } catch (error) {
            console.error('Error getting writing stats:', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
);


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