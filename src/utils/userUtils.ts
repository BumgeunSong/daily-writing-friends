import { firestore } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { User } from '../types/User';

// Helper function to get user data from localStorage
function getCachedUserData(uid: string): User | null {
  const cachedUserData = localStorage.getItem(`user-${uid}`);
  return cachedUserData ? JSON.parse(cachedUserData) as User : null;
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

// Function to fetch user nickname from Firestore
export async function fetchUserNickname(uid: string): Promise<string | null> {
  const user = await fetchUserData(uid);
  return user?.nickname || null;
}

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