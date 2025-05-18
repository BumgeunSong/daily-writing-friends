// This file is for the ALL API that related to 'User' domain model.
// Use a consistent naming convention; fetchX() → read-only function, createX(), updateX() → write, cacheX() → caching helpers (if used outside)
// Abstract repetitive Firebase logic into helpers

import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, getDocs, where, query } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { User } from '@/user/model/User';

// Firestore에서 User 데이터 읽기
export async function fetchUserFromFirestore(uid: string): Promise<User | null> {
  const userDocRef = doc(firestore, 'users', uid);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) return null;
  return userDoc.data() as User;
}

// Firestore에 User 데이터 생성
export async function createUserInFirestore(data: User): Promise<void> {
  const userDocRef = doc(firestore, 'users', data.uid);
  await setDoc(userDocRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Firestore의 User 데이터 수정
export async function updateUserInFirestore(uid: string, data: Partial<User>): Promise<void> {
  const userDocRef = doc(firestore, 'users', uid);
  await updateDoc(userDocRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Firestore의 User 데이터 삭제
export async function deleteUserFromFirestore(uid: string): Promise<void> {
  const userDocRef = doc(firestore, 'users', uid);
  await deleteDoc(userDocRef);
}

// 특정 boardIds에 write 권한이 있는 모든 사용자 데이터 가져오기
export async function fetchAllUserDataWithBoardPermission(boardIds: string[]): Promise<User[]> {
  try {
    const queries = boardIds.map(boardId => 
      query(
        collection(firestore, 'users'),
        where(`boardPermissions.${boardId}`, 'in', ['write'])
      )
    );
    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
    const userMap = new Map<string, User>();
    snapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        const userData = doc.data() as User;
        userMap.set(doc.id, userData);
      });
    });
    return Array.from(userMap.values());
  } catch (error) {
    console.error('Error fetching users with board permission:', error);
    return [];
  }
}
