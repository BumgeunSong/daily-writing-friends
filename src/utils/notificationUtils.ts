// Function to get notification of a user from firestore
// notifications collection is under user/{userId}/notifications
import { getDocs, query, collection } from 'firebase/firestore';
import { firestore } from '@/firebase';

export const getNotifications = async (userId: string) => {
    const notificationsQuery = query(collection(firestore, `user/${userId}/notifications`));
    const notifications = await getDocs(notificationsQuery);
    return notifications;
};