import { firestore } from '@/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs, Timestamp } from 'firebase/firestore';
import { Notification } from '@/types/Notification';
import { useInfiniteQuery } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';

export const useNotifications = (userId: string | null, limitCount: number) => {
    return useInfiniteQuery(
        ['notifications', userId],
        ({ pageParam }) => fetchNotifications(userId!, limitCount, pageParam),
        {
            enabled: !!userId, // Only run the query if userId is not null
            getNextPageParam: (lastPage) => {
                const lastNotification = lastPage[lastPage.length - 1];
                return lastNotification ? lastNotification.timestamp : undefined;
            },
            onError: (error) => {
                console.error("알림 데이터를 불러오던 중 에러가 발생했습니다:", error);
                Sentry.captureException(error);
            }
        }
    );
};

export const fetchNotifications = async (userId: string, limitCount: number, after?: Timestamp): Promise<Notification[]> => {
    let notificationsQuery = query(
        collection(firestore, `users/${userId}/notifications`),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
    );

    if (after) {
        notificationsQuery = query(notificationsQuery, startAfter(after));
    }
    
    const notificationsSnapshot = await getDocs(notificationsQuery);
    return notificationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    } as Notification));
};