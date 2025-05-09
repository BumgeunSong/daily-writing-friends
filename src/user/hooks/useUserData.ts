import * as Sentry from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { User } from '@/types/User';

export const useUserData = (userId: string | null) => {
    const noUserIdError = userId === null ? new Error('유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.') : null;

    const { data: userData, isLoading, error } = useQuery<User | null>(
        ['userData', userId],
        () => {
            if (userId === null) {
                throw noUserIdError;
            }
            return fetchUserData(userId);
        },
        {
            enabled: userId !== null, // Only run the query if userId is not null
            onError: (error) => {
                console.error('유저 데이터를 불러오던 중 에러가 발생했습니다:', error);
                Sentry.captureException(error);
            },
            staleTime: 1000 * 60 * 5, // 5 minutes
            cacheTime: 1000 * 60 * 10, // 10 minutes
        }
    );

    return { userData, isLoading, error: error || noUserIdError };
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