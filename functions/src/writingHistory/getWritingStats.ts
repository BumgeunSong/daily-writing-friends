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
    contributions: Contribution;
}

type Contribution = Record<string, number | null>;

export const getWritingStats = onRequest(async (req, res) => {
    // GET 메서드만 허용
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
                        realname: userData.realname,
                        profilePhotoURL: userData.profilePhotoURL,
                        bio: userData.bio
                    },
                    contributions
                };
            })
        );

        // 4. null 값 필터링 (writingHistory가 없는 사용자 제외)
        const filteredStats = writingStats.filter(
            (stat): stat is WritingStats => stat !== null
        );

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
});

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
): Contribution {
    const contributionMap: Contribution = {};
    
    // 모든 영업일에 대해 초기값 null 설정
    workingDays.forEach(day => {
        contributionMap[day] = null;
    });

    // writingHistory에서 컨텐츠 길이 매핑
    histories.forEach(history => {
        const data = history.data();
        const day = data.day;
        
        if (workingDays.includes(day)) {
            contributionMap[day] = data.post?.contentLength || null;
        }
    });

    return contributionMap;
}