import { onRequest } from "firebase-functions/v2/https";
import admin from "../admin";
import { isWorkingDay } from "../notifications/isWorkingDay";

interface WritingStats {
    user: {
        id: string;
        nickname: string | null;
        realname: string | null;
        profilePhotoURL: string | null;
        bio: string | null;
    }
    contributions: Contribution[];
    badges: WritingBadge[];
}

type Contribution = {
    date: string;
    contentLength: number | null;
}

export interface WritingBadge {
    name: string
    emoji: string
}

// 기여도 합계 계산 함수 수정: 작성한 날의 합계로 기여도 계산
const calculateTotalContributions = (contributions: Contribution[]): number => {
    return contributions.reduce((sum: number, value: Contribution) => sum + (value.contentLength !== null ? 1 : 0), 0);
};

export const getWritingStats = onRequest(
    { 
        cors: [
            'http://localhost:5173',
            'https://www.dailywritingfriends.com'
        ] 
    },
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
            
            // 1. 최근 20 영업일 계산
            const workingDays = getRecentWorkingDays(20);
            
            // 2. 모든 사용자 조회
            const usersSnapshot = await db.collection('users').get();
            
            // 3. 각 사용자의 WritingStats 생성
            const writingStats = await Promise.all(
                usersSnapshot.docs.map(async userDoc => {
                    // 사용자의 writingHistories 조회
                    const historiesSnapshot = await userDoc
                        .ref
                        .collection('writingHistories')
                        .get();

                    // writingHistory가 없는 사용자 제외
                    if (historiesSnapshot.empty) {
                        return null;
                    }

                    // 각 날짜별 컨텐츠 길이 매핑
                    const contributions = createContributions(
                        workingDays,
                        historiesSnapshot.docs
                    );

                    // WritingStats 생성
                    const userData = userDoc.data();
                    return {
                        user: {
                            id: userDoc.id,
                            nickname: userData.nickname,
                            realname: userData.realName,
                            profilePhotoURL: userData.profilePhotoURL,
                            bio: userData.bio
                        },
                        contributions,
                        badges: createBadges(contributions),
                        // 정렬을 위한 총 기여도 추가
                        totalContributions: calculateTotalContributions(contributions)
                    };
                })
            );
            // 4. null 값 필터링 (writingHistory가 없는 사용자 제외)
            const filteredStats: WritingStats[] = writingStats
                .filter((stat): stat is Exclude<typeof stat, null> => 
                    stat !== null
                )
                // 총 기여도 기준으로 내림차순 정렬
                .sort((a, b) => (b?.totalContributions ?? 0) - (a?.totalContributions ?? 0))
                // totalContributions 필드 제거
                .map(({ totalContributions, ...stat }) => stat);

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

// 최근 N개의 영업일 계산
function getRecentWorkingDays(count: number): string[] {
    const workingDays: string[] = [];
    const currentDate = new Date();
    
    while (workingDays.length < count) {
        if (isWorkingDay(currentDate)) {
            workingDays.push(
                currentDate.toISOString().split('T')[0]
            );
        }
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return workingDays.reverse();
}
// Contribution 객체 생성
function createContributions(
    workingDays: string[],
    histories: admin.firestore.QueryDocumentSnapshot[]
): Contribution[] {
    // 모든 영업일에 대해 초기값 null 설정
    const contributions = workingDays.map(day => ({
        date: day,
        contentLength: null
    }));

    // writingHistory에서 컨텐츠 길이 매핑
    histories.forEach(history => {
        const data = history.data();
        const day = data.day;

        if (workingDays.includes(day)) {
            const contribution = contributions.find(contribution => contribution.date === day);
            if (contribution) {
                contribution.contentLength = data.post?.contentLength ?? null;
            }
        }
    });

    return contributions;
}

function createBadges(contributions: Contribution[]): WritingBadge[] {
    const recentStreak = calculateRecentStreakIncludingLastDay(contributions);
    if (recentStreak < 2) {
        return [];
    }

    return [
        {
            name: `연속 ${recentStreak}일차`,
            emoji: '🔥'
        }
    ];
}

function calculateRecentStreakIncludingLastDay(contributions: Contribution[]): number {
    // if last day's contribution is null, return 0
    // if last day's contribution is not null, check the day before (traverse backwards)
    // sum up the number of days until the contribution is null
    // return the sum       
    return contributions.reverse().reduce((sum: number, value: Contribution) => {
        if (value.contentLength === null) {
            return sum;
        }
        return sum + 1;
    }, 0);
}