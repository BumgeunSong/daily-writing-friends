import { doc } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { trackedFirebase } from '@/shared/api/trackedFirebase';

export function usePostDelete() {
  return async (boardId: string, postId: string, navigate: (path: string) => void) => {
    const confirmDelete = window.confirm('정말로 이 게시물을 삭제하시겠습니까?');
    if (!confirmDelete) return;
    try {
      await trackedFirebase.deleteDoc(doc(firestore, `boards/${boardId}/posts`, postId));
      navigate(`/board/${boardId}`);
    } catch (error) {
      console.error('게시물 삭제 오류:', error);
    }
  };
}