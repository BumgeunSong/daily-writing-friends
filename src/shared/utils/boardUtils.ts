import { collection, getDocs, query, where, doc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

import { firestore } from '@/firebase';
import { trackedFirebase } from '@/shared/api/trackedFirebase';
import { Board } from '@board/model/Board';
import { User } from '@user/model/User';

export async function fetchBoardTitle(boardId: string): Promise<string> {
  try {
    const cachedTitle = localStorage.getItem(`boardTitle_${boardId}`);
    if (cachedTitle) {
      return cachedTitle;
    }

    const boardDocRef = doc(firestore, 'boards', boardId);
    const boardDoc = await getDoc(boardDocRef);
    if (boardDoc.exists()) {
      const boardData = boardDoc.data();
      const title = boardData?.title || 'Board';

      localStorage.setItem(`boardTitle_${boardId}`, title);

      return title;
    } else {
      console.error('Board not found');
      return 'Board not found';
    }
  } catch (error) {
    console.error('Error fetching board title:', error);
    return 'Error loading title';
  }
}

export async function fetchBoardsWithUserPermissions(userId: string): Promise<Board[]> {
  try {

    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    const user = userDoc.data() as User;
    const userBoardPermissions = user?.boardPermissions || {};

    const boardIds = Object.keys(userBoardPermissions);
    if (boardIds.length > 0) {
      const q = query(collection(firestore, 'boards'), where('__name__', 'in', boardIds));
      const querySnapshot = await getDocs(q);
      const boards = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Board[];

      return boards;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching boards:', error);
    return [];
  }
}

/**
 * ID로 보드 정보를 가져옵니다
 * @param boardId 가져올 보드 ID
 * @returns Promise<Board | null> 보드 정보 또는 존재하지 않는 경우 null
 */
export async function fetchBoardById(boardId: string): Promise<Board | null> {
  if (!boardId) {
    console.warn('fetchBoardById called with empty boardId');
    return null;
  }

  try {
    const boardDocRef = doc(firestore, 'boards', boardId);
    const boardDoc = await getDoc(boardDocRef);
    
    if (!boardDoc.exists()) { 
      console.warn(`Board with id ${boardId} does not exist`);
      return null;
    }
    
    return { ...boardDoc.data(), id: boardDoc.id } as Board;
  } catch (error) {
    console.error(`Error fetching board with id ${boardId}:`, error);
    return null;
  }
}

/**
 * 보드의 대기자 목록에 사용자를 추가합니다
 * @param boardId 보드 ID
 * @param userId 사용자 ID
 * @returns Promise<boolean> 성공 여부
 */
export async function addUserToBoardWaitingList(boardId: string, userId: string): Promise<boolean> {
  if (!boardId || !userId) {
    console.warn('addUserToBoardWaitingList called with empty boardId or userId');
    return false;
  }

  try {
    const boardDocRef = doc(firestore, 'boards', boardId);
    await trackedFirebase.updateDoc(boardDocRef, { waitingUsersIds: arrayUnion(userId) });
    return true;
  } catch (error) {
    console.error(`Error adding user ${userId} to board ${boardId} waiting list:`, error);
    return false;
  }
}

/**
 * 보드의 대기자 목록에서 사용자를 제거합니다
 * @param boardId 보드 ID
 * @param userId 사용자 ID
 * @returns Promise<boolean> 성공 여부
 */
export async function removeUserFromBoardWaitingList(boardId: string, userId: string): Promise<boolean> {
  if (!boardId || !userId) {
    console.warn('removeUserFromBoardWaitingList called with empty boardId or userId');
    return false;
  }

  try {
    const boardDocRef = doc(firestore, 'boards', boardId);
    await trackedFirebase.updateDoc(boardDocRef, { waitingUsersIds: arrayRemove(userId) });
    return true;
  } catch (error) {
    console.error(`Error removing user ${userId} from board ${boardId} waiting list:`, error);
    return false;
  }
}

/**
 * 보드의 시작 날짜를 포맷팅합니다
 * @param board 보드 객체
 * @returns string 포맷팅된 날짜 문자열
 */
export function formatStartDate(board: Board | null | undefined): string {
  if (!board?.firstDay) {
    return '미정';
  }
  return board.firstDay.toDate().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}