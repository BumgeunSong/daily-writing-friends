import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

import { firestore } from '../firebase';
import { Board } from '../types/Board';
import { User } from '../types/User';

export async function fetchBoardTitle(boardId: string): Promise<string> {
  try {
    const boardDocRef = doc(firestore, 'boards', boardId);
    const boardDoc = await getDoc(boardDocRef);
    if (boardDoc.exists()) {
      const boardData = boardDoc.data();
      return boardData?.title || 'Board';
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
    const cachedBoards = localStorage.getItem(`boards_${userId}`);
    if (cachedBoards) {
      return JSON.parse(cachedBoards);
    }

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

      localStorage.setItem(`boards_${userId}`, JSON.stringify(boards));

      return boards;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching boards:', error);
    return [];
  }
}
