import { onRequest } from "firebase-functions/v2/https";
import admin from "../admin";
import { getRecentWorkingDays } from "../dateUtils";
import { createBadges, calculateRecentStreak, WritingBadge } from "./createBadges";
import { info, debug, warn, error as errorLog } from "firebase-functions/logger";
import { createContributions, Contribution } from "./createContributions";
import { WritingHistory } from "../types/WritingHistory";
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

interface CachedStats {
    lastUpdated: admin.firestore.Timestamp;
    stats: WritingStats[];
}

export const getWritingStats = onRequest(
    { 
        cors: true,
        timeoutSeconds: 30
    },
    async (req, res) => {
        try {
            const cohort = req.query.cohort as string | undefined;
            const cacheKey = cohort ? `writingStats-${cohort}` : 'writingStats';
            
            debug("Received request for writing stats", {
                cohort: cohort || 'all',
                cacheKey
            });

            const cachedStats = await getCachedStats(cacheKey);
            if (cachedStats) {
                info("Returning cached stats", {
                    cacheKey,
                    cohort: cohort || 'all',
                    statsCount: cachedStats.stats.length
                });
                res.status(200).json({
                    status: 'success',
                    data: {
                        writingStats: cachedStats.stats,
                        cohort: cohort || 'all'
                    }
                });
                return;
            }

            const workingDays = getRecentWorkingDays(20);
            const db = admin.firestore();
            
            // cohort 기반 쿼리 구성
            const usersQuery = cohort 
                ? db.collection('users').where('cohort', '==', cohort) 
                : db.collection('users');
            
            debug("Fetching users data", { 
                cohort: cohort || 'all',
                workingDaysCount: workingDays.length 
            });
            
            const usersSnapshot = await usersQuery.get();
            
            info("Found users", {
                cohort: cohort || 'all',
                userCount: usersSnapshot.size
            });

            const usersData = await Promise.all(
                usersSnapshot.docs.map(fetchUserWritingHistory)
            );

            const writingStatsWithMeta = usersData
                .map(({ userData, histories }) =>
                    createUserWritingStats(userData, histories, workingDays)
                )
                .filter((stats): stats is WritingStatsWithMeta => stats !== null);

            const sortedStats = sortWritingStats(writingStatsWithMeta);

            await saveCachedStats(cacheKey, sortedStats, cohort);
            
            info("Successfully generated writing stats", {
                cohort: cohort || 'all',
                statsCount: sortedStats.length
            });

            res.status(200).json({
                status: 'success',
                data: {
                    writingStats: sortedStats,
                    cohort: cohort || 'all'
                }
            });
        } catch (error) {
            errorLog("Error getting writing stats", {
                error: error instanceof Error ? error.message : 'Unknown error',
                cohort: req.query.cohort || 'all'
            });
            
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
);


const getCachedStats = async (cacheKey: string): Promise<CachedStats | null> => {
    debug("Received request for writing stats", { cacheKey });
    try {
        const db = admin.firestore();
        const cachedStatsRef = db.collection('cachedStats').doc(cacheKey);
        const cachedStats = await cachedStatsRef.get();
        
        if (!cachedStats.exists) {
            debug("[CachedStats] Cache miss - No cached data found", { cacheKey });
            return null;
        }

        const data = cachedStats.data() as CachedStats;
        const cacheAge = admin.firestore.Timestamp.now().seconds - data.lastUpdated.seconds;

        // 캐시가 1분 이내인 경우에만 사용
        if (cacheAge < 1000 * 60 * 1) {
            info("Cache hit", { 
                cacheKey,
                cacheAge: `${cacheAge}s`
            });
            return data;
        } else {
            warn("Cache miss - Data expired", { 
                cacheKey,
                cacheAge: `${cacheAge}s`
            });
            return null;
        }
    } catch (error) {
        errorLog("Error accessing cache", {
            error: error instanceof Error ? error.message : 'Unknown error',
            cacheKey
        });
        return null;
    }
};

const saveCachedStats = async (cacheKey: string, stats: WritingStats[], cohort?: string): Promise<void> => {
    info("Saving new cache", {
        cacheKey,
        statsCount: stats.length
    });
    const db = admin.firestore();
    try {
        await db.collection('cachedStats').doc(cacheKey).set({
            lastUpdated: admin.firestore.Timestamp.now(),
            stats
        });
        info("Successfully saved cache", { cacheKey });
    } catch (error) {
        errorLog("Error saving cache", {
            cacheKey,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

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
    const badges = createBadges(streak);
    const totalContributions = calculateTotalContributions(contributions);

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
    // 현재 기록은 최근 영업일 20일 이내만 보여주므로 글쓰기 기록도 최대 30일 이내만 조회
    const limit = 30;
    const histories = await userDoc.ref
        .collection('writingHistories')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    const userData = createUserProfile(userDoc.id, userDoc.data());

    return {
        userData,
        histories: histories.docs.map(doc => doc.data() as WritingHistory)
    };
};

