
import { collection, getDocs, query, orderBy, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Posting } from '@/types/Posting';

export async function fetchPostingData(userId: string): Promise<Posting[]> {
    const postingsRef = collection(firestore, 'users', userId, 'postings');
    const q = query(postingsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => mapDocumentToPosting(doc));
}

/**
 * Firebase 문서를 Posting 객체로 변환하는 유틸리티 함수
 */
export function mapDocumentToPosting(doc: QueryDocumentSnapshot): Posting {
  const data = doc.data() as Posting;
  // Timestamp 보장
  data.createdAt = ensureTimestamp(data.createdAt);
  
  // post.id가 없을 경우 Firebase 문서 ID 할당
  if (!data.post.id) {
      data.post.id = doc.id;
  }
  
  return data;
}



function ensureTimestamp(value: any): Timestamp {
    if (value instanceof Timestamp) {
        return value;
    }
  
    if (value && 
        typeof value.seconds === "number" && 
        typeof value.nanoseconds === "number") {
        return new Timestamp(value.seconds, value.nanoseconds);
    }
  
    return Timestamp.now();
  }
