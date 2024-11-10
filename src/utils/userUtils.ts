import { firestore } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { User } from '../types/User';

// Function to fetch user data from Firestore with caching
export async function fetchUserData(uid: string): Promise<User | null> {
  try {
    // Check if user data is in localStorage
    const cachedUserData = localStorage.getItem(`user-${uid}`);
    if (cachedUserData) {
      return JSON.parse(cachedUserData) as User;
    }

    // Fetch from Firestore if not in cache
    const userDocRef = doc(firestore, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      // Cache the user data in localStorage
      localStorage.setItem(`user-${uid}`, JSON.stringify(userData));
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
    const cachedUserData = localStorage.getItem(`user-${uid}`);
    if (cachedUserData) {
      const updatedUserData = { ...JSON.parse(cachedUserData), ...data };
      localStorage.setItem(`user-${uid}`, JSON.stringify(updatedUserData));
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
    localStorage.setItem(`user-${data.uid}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error creating user data:', error);
    throw error;
  }
}