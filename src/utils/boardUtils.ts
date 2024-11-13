import { firestore } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

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
