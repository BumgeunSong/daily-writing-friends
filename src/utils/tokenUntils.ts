import { firestore } from "@/firebase";
import { FirebaseMessagingToken } from "@/messaging/DeviceToken";
import { addDoc, collection, Timestamp } from "firebase/firestore";

export const sendFirebaseMessagingTokenToServer = async (userId: string, token: string) => {
    const firebaseMessagingTokenCollection = collection(firestore, `users/${userId}/firebaseMessagingTokens`);
    const firebaseMessagingToken: FirebaseMessagingToken = {
        token,
        timestamp: Timestamp.now(),
    };
    await addDoc(firebaseMessagingTokenCollection, firebaseMessagingToken);
};