import { doc, collection, setDoc, getDoc, getDocs, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Draft } from '@/types/Draft';
import { v4 as uuidv4 } from 'uuid';

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