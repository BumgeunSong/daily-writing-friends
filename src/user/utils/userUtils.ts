import { useQuery } from '@tanstack/react-query';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  collection,
  where,
  query,
  serverTimestamp,
} from 'firebase/firestore';

import { firestore } from '@/firebase';
import { User } from '@/user/model/User';
import { UserProfile } from '@/user/model/UserProfile';

// Helper function to get user data from localStorage
function getCachedUserData(uid: string): User | null {
  const cached = localStorage.getItem(`user-${uid}`);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    if (parsed && parsed.data && parsed.updatedAt) {
      // updatedAt은 string(ISO)로 저장되어 있으므로 Timestamp로 복원
      return {
        ...parsed.data,
        updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : null,
      };
    }
    // 구버전 캐시 호환
    return parsed as User;
  } catch {
    return null;
  }
}

// Helper function to cache user data in localStorage
function cacheUserData(uid: string, data: User): void {
  localStorage.setItem(
    `user-${uid}`,
    JSON.stringify({
      data: { ...data, updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null },
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    })
  );
}

// Function to fetch user data from Firestore with caching
export async function fetchUserData(uid: string): Promise<User | null> {
  try {
    const cached = getCachedUserData(uid);
    const userDocRef = doc(firestore, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.log(`No such user document called ${uid}!`);
      return null;
    }

    const firestoreUser = userDoc.data() as User;
    const firestoreUpdatedAt = firestoreUser.updatedAt;
    const cachedUpdatedAt = cached?.updatedAt instanceof Date ? cached.updatedAt : null;

    // 캐시가 있고, updatedAt이 같으면 캐시 사용
    if (
      cached &&
      firestoreUpdatedAt &&
      cachedUpdatedAt &&
      firestoreUpdatedAt.toMillis() === cachedUpdatedAt.getTime()
    ) {
      return cached;
    }

    // Firestore 데이터가 더 최신이거나 캐시가 없으면 캐시 갱신
    cacheUserData(uid, firestoreUser);
    return firestoreUser;
  } catch (error) {
    // 에러 시 캐시라도 반환
    const cached = getCachedUserData(uid);
    if (cached) return cached;
    console.error('Error fetching user data:', error);
    throw error;
  }
}

// Function to fetch all user data from firestore
export async function fetchAllUserData(): Promise<User[]> {
  const users = await getDocs(collection(firestore, 'users'));
  return users.docs.map((doc) => doc.data() as User);
}


// Function to fetch all user data with board permission from firestore
export async function fetchAllUserDataWithBoardPermission(boardIds: string[]): Promise<User[]> {
    try {
        // 모든 보드 ID를 정렬하여 캐시 키 생성
        const cacheKey = `permissionedUsers_${boardIds.sort().join('_')}`;
        
        // 캐시에서 사용자 데이터 가져오기
        const cachedUsers = localStorage.getItem(cacheKey);
        if (cachedUsers) {
            return JSON.parse(cachedUsers);
        }

        // 각 보드별로 쿼리 생성
        const queries = boardIds.map(boardId => 
            query(
                collection(firestore, 'users'),
                where(`boardPermissions.${boardId}`, 'in', ['write'])
            )
        );

        // 모든 쿼리 실행
        const snapshots = await Promise.all(queries.map(q => getDocs(q)));
        
        // 모든 사용자 데이터 수집 (중복 제거)
        const userMap = new Map<string, User>();
        snapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                const userData = doc.data() as User;
                userMap.set(doc.id, userData);
            });
        });

        const users = Array.from(userMap.values());

        // 캐시에 사용자 데이터 저장
        localStorage.setItem(cacheKey, JSON.stringify(users));

        return users;
    } catch (error) {
        console.error('Error fetching users with board permission:', error);
        return [];
    }
}

// Function to listen for user data changes and update cache
export function listenForUserDataChanges(uid: string, onChange: (data: User) => void): () => void {
  const userDocRef = doc(firestore, 'users', uid);
  const unsubscribe = onSnapshot(userDocRef, (doc) => {
    if (doc.exists()) {
      const userData = doc.data() as User;
      cacheUserData(uid, userData); // Update cache with new data
      onChange(userData); // Call the onChange callback with the new data
    }
  });

  return unsubscribe; // Return the unsubscribe function to stop listening when needed
}

// 사용자 닉네임을 가져오는 함수
export const fetchUserUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const user = await fetchUserData(uid);
  return user ? { nickname: user.nickname, profilePhotoURL: user.profilePhotoURL } : null;
};

// 사용자 닉네임을 가져오는 함수
export const fetchUserNickname = async (uid: string): Promise<string | null> => {
  const user = await fetchUserData(uid);
  return user?.nickname || null;
};

// 사용자 닉네임을 가져오는 React Query 훅
export const useUserNickname = (uid: string) => {
  return useQuery(['userNickname', uid], () => fetchUserNickname(uid), {
    staleTime: 1000 * 60 * 5, // 5분 동안 데이터가 신선하다고 간주
    cacheTime: 1000 * 60 * 10, // 10분 동안 캐시 유지
  });
};

// Function to update user data in Firestore and cache
export async function updateUserData(uid: string, data: Partial<User>): Promise<void> {
  try {
    const userDocRef = doc(firestore, 'users', uid);
    const userData = {
      ...data,
      updatedAt: serverTimestamp(),
    }
    await updateDoc(userDocRef, userData);

    // Update the cache with the new data
    const cachedUserData = getCachedUserData(uid);
    if (cachedUserData) {
      const updatedUserData = { ...cachedUserData, ...userData };
      cacheUserData(uid, updatedUserData as User);
    }
  } catch (error) {
    console.error('Error updating user data:', error);
    throw error;
  }
}

// Function to delete user data from Firestore and cache
export async function deleteUserData(uid: string): Promise<void> {
  try {
    const userDocRef = doc(firestore, 'users', uid);
    await deleteDoc(userDocRef);

    // Remove the user data from cache
    localStorage.removeItem(`user-${uid}`);
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw error;
  }
}

// Function to create user data in Firestore
export async function createUserData(data: User): Promise<void> {
  try {
    const userDocRef = doc(firestore, 'users', data.uid);
    const userData = {
      ...data,
      updatedAt: serverTimestamp(),
    }
    await setDoc(userDocRef, userData);

    // Cache the new user data
    cacheUserData(data.uid, data);
  } catch (error) {
    console.error('Error creating user data:', error);
    throw error;
  }
}

// React Query용 한 번만 실행되는 사용자 프로필 가져오기 함수
export const fetchUserProfileOnce = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('사용자 프로필을 가져오는 중 오류 발생:', error);
    return null;
  }
};
