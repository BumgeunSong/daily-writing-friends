import { collection, getDocs, query, where } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Commenting } from '@/user/model/Commenting';
import { Replying } from '@/user/model/Replying';

// 특정 유저의 commentings 서브컬렉션 전체 fetch
export async function fetchUserCommentings(userId: string): Promise<Commenting[]> {
    const ref = collection(firestore, 'users', userId, 'commentings');
    const snap = await getDocs(ref);
    return snap.docs.map(doc => doc.data() as Commenting);
}

// 특정 유저의 replyings 서브컬렉션 전체 fetch
export async function fetchUserReplyings(userId: string): Promise<Replying[]> {
    const ref = collection(firestore, 'users', userId, 'replyings');
    const snap = await getDocs(ref);
    return snap.docs.map(doc => doc.data() as Replying);
}

// 날짜 범위로 commentings 조회
export async function fetchUserCommentingsByDateRange(
  userId: string,
  start: Date,
  end: Date
): Promise<Commenting[]> {
  const ref = collection(firestore, 'users', userId, 'commentings');
  const q = query(
    ref,
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<', Timestamp.fromDate(end))
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as Commenting);
}

// 날짜 범위로 replyings 조회
export async function fetchUserReplyingsByDateRange(
  userId: string,
  start: Date,
  end: Date
): Promise<Replying[]> {
  const ref = collection(firestore, 'users', userId, 'replyings');
  const q = query(
    ref,
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<', Timestamp.fromDate(end))
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as Replying);
} 