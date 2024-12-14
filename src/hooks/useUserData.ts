import { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { User } from '@/types/User';
import { firestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const useUserData = (userId: string | null) => {
    const [userData, setUserData] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUserData = async () => {
            if (userId) {
                try {
                    const data = await fetchUserData(userId);
                    setUserData(data);
                } catch (error) {
                    console.error('유저 데이터를 불러오던 중 에러가 발생했습니다:', error);
                    Sentry.captureException(error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        getUserData();
    }, [userId]);

    return { userData, loading };
};


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
async function fetchUserData(uid: string): Promise<User | null> {
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