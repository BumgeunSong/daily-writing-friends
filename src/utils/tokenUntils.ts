import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/firebase";
import { DeviceToken } from "@/messaging/DeviceToken";
import { addDoc, collection, Timestamp } from "firebase/firestore";

export const sendTokenToServer = async (userId: string, token: string) => {
    const deviceTokenCollection = collection(firestore, `users/${userId}/deviceTokens`);
    const deviceToken: DeviceToken = {
        token,
        timestamp: Timestamp.now(),
    };
    await addDoc(deviceTokenCollection, deviceToken);
};