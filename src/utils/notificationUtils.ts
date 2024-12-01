// Function to get notification of a user from firestore
// notifications collection is under user/{userId}/notifications
import { getDocs, query, collection } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Notification } from '@/types/Notification';

// define return type of getNotifications as Promise<Notification[]>
export const getNotifications = async (userId: string): Promise<Notification[]> => {
    try {
        const notificationsQuery = query(collection(firestore, `users/${userId}/notifications`));
        const notifications = await getDocs(notificationsQuery);
        return notifications.docs.map((doc) => doc.data() as Notification);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }
};