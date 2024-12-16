import { firestore } from "@/firebase";
import { FirebaseMessagingToken } from "@/messaging/DeviceToken";
import { addDoc, collection, getDocs, query, Timestamp, updateDoc, where } from "firebase/firestore";

export const sendFirebaseMessagingTokenToServer = async (userId: string, token: string) => {
    const firebaseMessagingTokenCollection = collection(firestore, `users/${userId}/firebaseMessagingTokens`);
    const newFirebaseMessagingToken: FirebaseMessagingToken = {
        token,
        timestamp: Timestamp.now(),
    };
    // if token already exists, update it
    const querySnapshot = await getDocs(query(firebaseMessagingTokenCollection, where("token", "==", token)));
    if (querySnapshot.empty) {
        await addDoc(firebaseMessagingTokenCollection, newFirebaseMessagingToken);
    } else {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, { token: newFirebaseMessagingToken.token, timestamp: Timestamp.now() });
    }
};
