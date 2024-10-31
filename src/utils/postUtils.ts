import { firestore } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Post } from '../types/Posts';

export const fetchPost = async (id: string): Promise<Post | null> => {
  const docRef = doc(firestore, 'posts', id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    console.log('해당 문서가 없습니다!');
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    boardId: data.boardId,
    title: data.title,
    content: data.content,
    authorId: data.authorId,
    authorName: data.authorName,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate(),
  };
};