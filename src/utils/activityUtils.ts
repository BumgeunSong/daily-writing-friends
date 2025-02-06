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
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<ActivityCount> {
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
    ]);

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
    
    // 에러 타입 체크 및 사용자 친화적 에러 메시지
    if (error instanceof Error) {
      // Firebase 인덱스 관련 에러 체크
      if (error.message.includes('index')) {
        throw new Error('데이터베이스 인덱스가 필요합니다. 관리자에게 문의해주세요.');
      }
      // 권한 관련 에러 체크
      if (error.message.includes('permission')) {
        throw new Error('접근 권한이 없습니다.');
      }
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