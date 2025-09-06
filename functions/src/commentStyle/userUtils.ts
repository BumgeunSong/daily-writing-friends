import admin from '../shared/admin';

/**
 * 사용자가 활성 보드에 write 권한을 가지고 있는지 확인
 * useActiveUser 훅과 동일한 로직 사용
 */
export async function isActiveUser(userId: string, boardId: string): Promise<boolean> {
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      return false;
    }

    const userData = userDoc.data();
    const boardPermissions = userData?.boardPermissions || {};
    
    return boardPermissions[boardId] === 'write';
    
  } catch (error) {
    console.error(`Error checking if user ${userId} is active:`, error);
    return false;
  }
}

/**
 * 특정 보드에 write 권한을 가진 모든 활성 사용자 조회
 */
export async function getActiveUsers(boardId: string): Promise<string[]> {
  try {
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where(`boardPermissions.${boardId}`, '==', 'write')
      .get();

    return usersSnapshot.docs.map(doc => doc.id);
    
  } catch (error) {
    console.error(`Error getting active users for board ${boardId}:`, error);
    return [];
  }
}

/**
 * Remote Config에서 활성 보드 ID 조회
 */
export async function getActiveBoardId(): Promise<string | null> {
  try {
    // Remote Config 값 조회
    // 실제 구현에서는 Remote Config SDK 사용하거나
    // 환경변수/하드코딩된 값 사용
    
    // 임시로 하드코딩된 기본 보드 ID 반환
    // TODO: Remote Config 연동 필요
    return 'rW3Y3E2aEbpB0KqGiigd';
    
  } catch (error) {
    console.error('Error getting active board ID:', error);
    return null;
  }
}