import { collection, getDocs } from 'firebase/firestore';
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