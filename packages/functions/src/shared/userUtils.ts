import { getRemoteConfig } from 'firebase-admin/remote-config';
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
export async function getActiveBoardId(): Promise<string> {
  try {
    // Remote Config 템플릿 가져오기
    const template = await getRemoteConfig().getTemplate();
    
    // active_board_id 파라미터 값 가져오기
    const activeBoardIdParam = template.parameters['active_board_id'];
    
    if (!activeBoardIdParam || !activeBoardIdParam.defaultValue) {
      throw new Error('active_board_id parameter not found in Remote Config');
    }
    
    // defaultValue는 여러 타입이 될 수 있으므로 타입 체크
    const defaultValue = activeBoardIdParam.defaultValue;
    let value: string | undefined;
    
    // InAppDefaultValue 타입 체크
    if ('value' in defaultValue) {
      value = defaultValue.value as string;
    } else {
      throw new Error('Unexpected Remote Config value type for active_board_id');
    }
    
    if (!value || typeof value !== 'string') {
      throw new Error('active_board_id is not a valid string value');
    }
    
    console.log(`Active board ID from Remote Config: ${value}`);
    return value;
    
  } catch (error) {
    console.error('Error getting active board ID from Remote Config:', error);
    throw error;
  }
}