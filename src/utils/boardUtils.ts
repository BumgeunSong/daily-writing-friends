import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

import { firestore } from '../firebase';
import { Board } from '../types/Board';
import { User } from '../types/User';

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

// fetch board by id
export async function fetchBoardById(boardId: string): Promise<Board> {
  const boardDocRef = doc(firestore, 'boards', boardId);
  const boardDoc = await getDoc(boardDocRef);
  if (!boardDoc.exists()) { 
    throw new Error(`Board with id ${boardId} does not exist`);
  }
  return { ...boardDoc.data(), id: boardDoc.id } as Board;
}

// function to add user to board's waitingUsersIds by arrayUnion
export async function addUserToBoardWaitingList(boardId: string, userId: string) {
  const boardDocRef = doc(firestore, 'boards', boardId);
  await updateDoc(boardDocRef, { waitingUsersIds: arrayUnion(userId) })
}

// function to remove user from board's waitingUsersIds
export async function removeUserFromBoardWaitingList(boardId: string, userId: string) {
  const boardDocRef = doc(firestore, 'boards', boardId);
  await updateDoc(boardDocRef, { waitingUsersIds: arrayRemove(userId) })
}

export function formatStartDate(board: Board | null | undefined) {
  if (!board) {
    return '?'
  }
  return board.firstDay?.toDate().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}