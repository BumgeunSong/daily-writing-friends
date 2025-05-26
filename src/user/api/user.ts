// This file is for the ALL API that related to 'User' domain model.
// Use a consistent naming convention; fetchX() → read-only function, createX(), updateX() → write, cacheX() → caching helpers (if used outside)
// Abstract repetitive Firebase logic into helpers

import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, getDocs, where, query, Timestamp, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, storage } from '@/firebase';
import { User, UserOptionalFields, UserRequiredFields } from '@/user/model/User';
import { User as FirebaseUser } from 'firebase/auth';

// Firestore에서 User 데이터 읽기
export async function fetchUser(uid: string): Promise<User | null> {
    const userDocRef = doc(firestore, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) return null;
    return userDoc.data() as User;
}

// Firestore에 User 데이터 생성
export async function createUser(data: User): Promise<void> {
    const userDocRef = doc(firestore, 'users', data.uid);
    await setDoc(userDocRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// Firestore의 User 데이터 수정
export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
    const userDocRef = doc(firestore, 'users', uid);
    await updateDoc(userDocRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// Firestore의 User 데이터 삭제
export async function deleteUser(uid: string): Promise<void> {
    const userDocRef = doc(firestore, 'users', uid);
    await deleteDoc(userDocRef);
}

// 특정 boardIds에 write 권한이 있는 모든 사용자 데이터 가져오기
export async function fetchUsersWithBoardPermission(boardIds: string[]): Promise<User[]> {
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

// 프로필 사진 업로드 및 URL 반환
export async function uploadUserProfilePhoto(userId: string, file: File): Promise<string> {
    const storageRef = ref(storage, `profilePhotos/${userId}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}


/**
 * Firestore에 User가 없으면 생성하는 함수입니다. 
 * 이미 존재하는 경우 아무 작업도 수행하지 않습니다.
 * 이 함수는 Auth에서 로그인된 유저(FirebaseUser)가 Firestore의 Users 컬렉션에도 존재해야 할 때 사용됩니다.
 *
 * @param {FirebaseUser} user - Firebase 인증을 통해 로그인된 사용자 객체입니다.
 * @returns {Promise<void>} - 작업이 완료되면 반환되는 프로미스입니다.
 */
export async function createUserIfNotExists(user: FirebaseUser): Promise<void> {
    const existing = await fetchUser(user.uid);
    if (!existing) {

        const requiredFields: UserRequiredFields = {
            uid: user.uid,
            realName: user.displayName,
            nickname: user.displayName,
            email: user.email,
            profilePhotoURL: user.photoURL,
        }

        const defaultUserFields: UserOptionalFields = {
            bio: null,
            phoneNumber: null,
            referrer: null,
            boardPermissions: {
                'rW3Y3E2aEbpB0KqGiigd': 'read', // 기본 보드 ID
            },
            updatedAt: Timestamp.now(),
        }
        await createUser({
            ...requiredFields,
            ...defaultUserFields,
        });
    }
}

/**
 * blockedBy 배열에 나를 차단한 유저 uid를 추가합니다.
 * 이미 차단된 경우 중복 추가하지 않습니다.
 */
export async function addBlockedUser(myUid: string, blockedUid: string): Promise<void> {
    const blockedUser = await fetchUser(blockedUid);
    if (!blockedUser) throw new Error('User to be blocked not found');
    const blockedBy = Array.isArray(blockedUser.blockedBy) ? blockedUser.blockedBy : [];
    if (blockedBy.includes(myUid)) return; // 이미 차단됨
    const updated = [...blockedBy, myUid];
    await updateUser(blockedUid, { blockedBy: updated });
}

/**
 * blockedBy 배열에서 차단 해제할 유저 uid를 제거합니다.
 * 없는 경우 아무 작업도 하지 않습니다.
 */
export async function removeBlockedUser(myUid: string, blockedUid: string): Promise<void> {
    const blockedUser = await fetchUser(blockedUid);
    if (!blockedUser) throw new Error('User to be unblocked not found');
    const blockedBy = Array.isArray(blockedUser.blockedBy) ? blockedUser.blockedBy : [];
    if (!blockedBy.includes(myUid)) return; // 이미 없음
    const updated = blockedBy.filter(uid => uid !== myUid);
    await updateUser(blockedUid, { blockedBy: updated });
}

/**
 * 모든 유저를 반환합니다 (관리자/검색용)
 * @returns User[]
 */
export async function fetchAllUsers(): Promise<User[]> {
    try {
        const usersSnap = await getDocs(collection(firestore, 'users'));
        return usersSnap.docs.map(doc => doc.data() as User);
    } catch (error) {
        console.error('Error fetching all users:', error);
        return [];
    }
}

/** 차단 */
export async function blockUser(blockerId: string, blockedId: string) {
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, `users/${blockerId}/blockedUsers/${blockedId}`), { blockedAt: Date.now() });
  batch.set(doc(firestore, `users/${blockedId}/blockedByUsers/${blockerId}`), { blockedAt: Date.now() });
  await batch.commit();
}

/** 차단 해제 */
export async function unblockUser(blockerId: string, blockedId: string) {
  const batch = writeBatch(firestore);
  batch.delete(doc(firestore, `users/${blockerId}/blockedUsers/${blockedId}`));
  batch.delete(doc(firestore, `users/${blockedId}/blockedByUsers/${blockerId}`));
  await batch.commit();
}

/** 내가 차단한 유저 목록 */
export async function getBlockedUsers(userId: string): Promise<string[]> {
  const snap = await getDocs(collection(firestore, `users/${userId}/blockedUsers`));
  return snap.docs.map(doc => doc.id);
}

/** 나를 차단한 유저 목록 */
export async function getBlockedByUsers(userId: string): Promise<string[]> {
  const snap = await getDocs(collection(firestore, `users/${userId}/blockedByUsers`));
  return snap.docs.map(doc => doc.id);
}
