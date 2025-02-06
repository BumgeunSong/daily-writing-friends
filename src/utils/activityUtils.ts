import { 
  getFirestore, 
  collectionGroup, 
  query, 
  where, 
  getDocs, 
  Timestamp
} from 'firebase/firestore';

export interface ActivityCount {
  countOfComments: number;
  countOfReplies: number;
  totalCount: number;
}

/**
 * 특정 기간 동안 사용자가 작성한 댓글과 답글의 수를 가져옵니다.
 * 
 * @param userId - 조회할 사용자의 ID
 * @param startDate - 시작 날짜 (이 날짜를 포함)
 * @param endDate - 종료 날짜 (이 날짜를 제외)
 * @returns 댓글 수와 답글 수를 포함한 객체
 */
export async function getUserActivityCount(
  userId: string | undefined,
  startDate: Date,
  endDate: Date
): Promise<ActivityCount> {
  if (!userId) {
    return {
      countOfComments: 0,
      countOfReplies: 0,
      totalCount: 0
    };
  }

  const firestore = getFirestore();

  try {
    // 날짜를 Firestore Timestamp로 변환
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // 댓글과 답글 쿼리 동시 실행을 위한 Promise.all 사용
    const [commentsSnapshot, repliesSnapshot] = await Promise.all([
      // 댓글 쿼리
      getDocs(
        query(
          collectionGroup(firestore, 'comments'),
          where('userId', '==', userId),
          where('createdAt', '>=', startTimestamp),
          where('createdAt', '<', endTimestamp)
        )
      ),
      // 답글 쿼리
      getDocs(
        query(
          collectionGroup(firestore, 'replies'),
          where('userId', '==', userId),
          where('createdAt', '>=', startTimestamp),
          where('createdAt', '<', endTimestamp)
        )
      )
    ]).catch(error => {
      console.error('Query execution error:', error);
      if (error instanceof Error && error.message.includes('permission')) {
        console.warn('Permission error - returning empty results');
        return [{ size: 0 }, { size: 0 }];
      }
      throw error;
    });

    // 결과 카운트
    const countOfComments = commentsSnapshot.size;
    const countOfReplies = repliesSnapshot.size;
    const totalCount = countOfComments + countOfReplies;

    return {
      countOfComments,
      countOfReplies,
      totalCount
    };
  } catch (error) {
    console.error('활동 수 조회 중 오류 발생:', error);
    
    // 권한 오류 시 빈 결과 반환
    if (error instanceof Error && error.message.includes('permission')) {
      return {
        countOfComments: 0,
        countOfReplies: 0,
        totalCount: 0
      };
    }
    
    throw new Error('활동 수를 가져오는 중에 문제가 발생했습니다.');
  }
}

/**
 * 사용 예시:
 * 
 * const startDate = new Date('2024-01-01');
 * const endDate = new Date('2024-02-01');
 * 
 * try {
 *   const activityCount = await getUserActivityCount('userId123', startDate, endDate);
 *   console.log(`댓글 수: ${activityCount.countOfComments}`);
 *   console.log(`답글 수: ${activityCount.countOfReplies}`);
 *   console.log(`전체 수: ${activityCount.totalCount}`);
 * } catch (error) {
 *   console.error('Error:', error.message);
 * }
 */ 