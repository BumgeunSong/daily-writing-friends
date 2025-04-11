import { firestore } from '@/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs, Timestamp } from 'firebase/firestore';
import { Notification } from '@/types/Notification';
import { useInfiniteQuery } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';

/**
 * 사용자의 알림 목록을 가져오는 훅
 * @param userId 사용자 ID
 * @param limitCount 한 번에 가져올 알림 수
 * @returns React Query의 useInfiniteQuery 결과 객체 (data, fetchNextPage, hasNextPage, refetch 등)
 */
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
            },
            staleTime: 1000 * 30, // 30 seconds
            cacheTime: 1000 * 60 * 5, // 5 minutes
            refetchInterval: 1000 * 60, // Refetch every 1 minute
            refetchOnWindowFocus: true, // Refetch when the window regains focus
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