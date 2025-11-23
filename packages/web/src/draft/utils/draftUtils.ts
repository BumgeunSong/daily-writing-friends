import { doc, collection, setDoc, getDoc, getDocs, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { firestore } from '@/firebase';
import { Draft } from '@/draft/model/Draft';

export async function saveDraft(draft: Omit<Draft, 'id' | 'savedAt'> & { id?: string }, userId: string): Promise<Draft> {
  const now = Timestamp.now();
  const draftId = draft.id || uuidv4();
  
  const draftData: Draft = {
    id: draftId,
    boardId: draft.boardId,
    title: draft.title,
    content: draft.content,
    savedAt: now
  };
  
  const draftRef = doc(firestore, `users/${userId}/drafts`, draftId);
  await setDoc(draftRef, draftData, { merge: true });
  
  return draftData;
}

export async function getDrafts(userId: string, boardId?: string): Promise<Draft[]> {
  const draftsRef = collection(firestore, `users/${userId}/drafts`);
  
  let draftQuery = query(draftsRef, orderBy('savedAt', 'desc'));
  
  if (boardId) {
    draftQuery = query(draftsRef, where('boardId', '==', boardId), orderBy('savedAt', 'desc'));
  }
  
  const snapshot = await getDocs(draftQuery);
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id
  } as Draft));
}

export async function getDraftById(userId: string, draftId: string): Promise<Draft | null> {
  const draftRef = doc(firestore, `users/${userId}/drafts`, draftId);
  const snapshot = await getDoc(draftRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return { ...snapshot.data(), id: snapshot.id } as Draft;
}

export async function deleteDraft(userId: string, draftId: string): Promise<void> {
  const draftRef = doc(firestore, `users/${userId}/drafts`, draftId);
  return deleteDoc(draftRef);
}


// 임시 저장 글 날짜 포맷팅 - 사용자의 로케일 기반
export const formatDraftDate = (timestamp: any) => {
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat(navigator.language || 'ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// 임시 저장 글 제목 표시 (비어있으면 '제목 없음' 표시)
export const getDraftTitle = (draft: Draft) => {
  return draft.title.trim() ? draft.title : '(제목 없음)';
};

// 임시 저장 글 내용 미리보기 (최대 50자)
export const getDraftPreview = (draft: Draft) => {
  const plainText = draft.content.replace(/<[^>]*>/g, ''); // HTML 태그 제거
  return plainText.length > 50 
    ? plainText.substring(0, 50) + '...' 
    : plainText || '(내용 없음)';
};
