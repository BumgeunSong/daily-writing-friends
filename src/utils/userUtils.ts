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
} from 'firebase/firestore';

import { firestore } from '../firebase';
import { User } from '../types/User';
import { useQuery } from '@tanstack/react-query';
import { UserProfile } from '../types/UserProfile';

// Helper function to get user data from localStorage
function getCachedUserData(uid: string): User | null {
  const cachedUserData = localStorage.getItem(`user-${uid}`);
  return cachedUserData ? (JSON.parse(cachedUserData) as User) : null;
}

// Helper function to cache user data in localStorage
function cacheUserData(uid: string, data: User): void {
  localStorage.setItem(`user-${uid}`, JSON.stringify(data));
}

// Function to fetch user data from Firestore with caching
export async function fetchUserData(uid: string): Promise<User | null> {
  try {
    // Attempt to retrieve user data from cache
    const cachedUserData = getCachedUserData(uid);
    if (cachedUserData) {
      return cachedUserData;
    }

    // Fetch from Firestore if not in cache
    const userDocRef = doc(firestore, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      cacheUserData(uid, userData); // Cache the user data
      return userData;
    } else {
      console.log(`No such user document called ${uid}!`);
      return null;
    }
  } catch (error) {
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
    await updateDoc(userDocRef, data);

    // Update the cache with the new data
    const cachedUserData = getCachedUserData(uid);
    if (cachedUserData) {
      const updatedUserData = { ...cachedUserData, ...data };
      cacheUserData(uid, updatedUserData);
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
    await setDoc(userDocRef, data);

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
