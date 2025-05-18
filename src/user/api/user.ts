// This file is for the ALL API that related to 'User' domain model.
// Use a consistent naming convention; fetchX() → read-only function, createX(), updateX() → write, cacheX() → caching helpers (if used outside)
// Abstract repetitive Firebase logic into helpers

import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, getDocs, where, query, Timestamp } from 'firebase/firestore';
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

// User가 없으면 생성하는 함수 (존재하면 아무것도 안 함)
// Auth에서 로그인된 유저가 Firestore에도 존재해야할 때 사용
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
                'rW3Y3E2aEbpB0KqGiigd': 'read', // default board id
            },
            updatedAt: Timestamp.now(),
        }
        await createUser({
            ...requiredFields,
            ...defaultUserFields,
        });
    }
}
