import * as Sentry from '@sentry/react';
import { User } from '@/types/User';
import { firestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';

export const useUserData = (userId: string | null) => {
    const { data: userData, isLoading, error } = useQuery<User | null>(
        ['userData', userId],
        () => fetchUserData(userId!),
        {
            enabled: !!userId, // Only run the query if userId is not null
            onError: (error) => {
                console.error('유저 데이터를 불러오던 중 에러가 발생했습니다:', error);
                Sentry.captureException(error);
            },
            staleTime: 1000 * 60 * 5, // 5 minutes
            cacheTime: 1000 * 60 * 10, // 10 minutes
        }
    );

    return { userData, isLoading, error };
};

// Function to fetch user data from Firestore
async function fetchUserData(uid: string): Promise<User | null> {
    try {
        const userDocRef = doc(firestore, 'users', uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            return userDoc.data() as User;
        } else {
            console.log(`No such user document called ${uid}!`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        throw error;
    }
}