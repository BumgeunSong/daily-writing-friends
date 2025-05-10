import { addDoc } from 'firebase/firestore';
import { collection, getDocs, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { getToken } from "firebase/messaging";
import { useState, useEffect } from 'react';
import { initializeMessaging } from '@/messaging';
import { FirebaseMessagingToken } from '@/notification/model/FirebaseMessagingToken';
import { app, firestore } from "../../firebase";
import { toast } from '../../shared/hooks/use-toast';

export function usePushPermission(userId: string) {
    const [hasPushPermission, setHasPushPermission] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            checkPushNotificationPermission(userId).then((permission) => {
                setHasPushPermission(permission);
                setIsLoading(false);
            }).catch((error) => {
                console.error("Error checking push notification permission:", error);
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    }, [userId]);

    const togglePushNotification = async () => {
        try {
            if (hasPushPermission) {
                await cancelPushNotification(userId);
                setHasPushPermission(false);
        } else {
                await startPushNotification(userId);
                setHasPushPermission(true);
            }
        } catch (error) {
            toast({
                description: "알림 설정에 문제가 생겼어요",
                variant: "destructive",
            });
        }
    };

    return { hasPushPermission, togglePushNotification, isLoading };
}

async function cancelPushNotification(userId: string) {
    const token = await requestFirebaseToken(userId);
    if (token) {
        await deleteFirebaseToken(userId, token);
    }
}

async function startPushNotification(userId: string) {
    const token = await requestFirebaseToken(userId);
    if (token) {
        await sendFirebaseMessagingTokenToServer(userId, token);
    }
}

async function checkPushNotificationPermission(userId: string): Promise<boolean> {
    const permission = Notification.permission;
    if (permission === "granted") {
        try {
            const token = await requestFirebaseToken(userId);
            return token !== null;
        } catch (error) {
            console.error("Error getting token:", error);
            return false;
        }
    }
    return false;
}

async function requestFirebaseToken(userId: string): Promise<string | null> {
    const messaging = initializeMessaging(app);
    if (!messaging) { 
        throw new Error('Firebase messaging is not supported in this browser');
    }
    try {
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;
        const token = await getToken(messaging, { vapidKey });
        if (token) {
            await sendFirebaseMessagingTokenToServer(userId, token);
            return token;
        }
        return null;
    } catch (error) {
        console.error("Error getting token:", error);
        return null;
    }
}

async function sendFirebaseMessagingTokenToServer(userId: string, token: string) {
    const firebaseMessagingTokenCollection = collection(firestore, `users/${userId}/firebaseMessagingTokens`);

    const newFirebaseMessagingToken: FirebaseMessagingToken = {
        token,
        timestamp: Timestamp.now(),
        userAgent: navigator.userAgent,
    };
    const querySnapshot = await getDocs(query(firebaseMessagingTokenCollection, where("token", "==", token)));
    if (querySnapshot.empty) {
        await addDoc(firebaseMessagingTokenCollection, newFirebaseMessagingToken);
    } else {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, { token: newFirebaseMessagingToken.token, timestamp: Timestamp.now() });
    }
}

async function deleteFirebaseToken(userId: string, token: string): Promise<void> {
    const firebaseMessagingTokenCollection = collection(firestore, `users/${userId}/firebaseMessagingTokens`);
    const querySnapshot = await getDocs(query(firebaseMessagingTokenCollection, where("token", "==", token)));
    if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await deleteDoc(docRef);
    }
    return Promise.resolve();
}