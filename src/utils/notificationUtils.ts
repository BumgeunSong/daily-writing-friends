import { getDocs, query, collection, orderBy, Timestamp, limit, startAfter } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Notification } from '@/types/Notification';

export const getNotifications = async (userId: string, limitCount: number, after?: Timestamp): Promise<Notification[]> => {
    let notificationsQuery = query(
        collection(firestore, `users/${userId}/notifications`),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
    );

    if (after) {
        notificationsQuery = query(notificationsQuery, startAfter(after));
    }

    try {
        const notificationsSnapshot = await getDocs(notificationsQuery);
        return notificationsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        } as Notification));
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
};