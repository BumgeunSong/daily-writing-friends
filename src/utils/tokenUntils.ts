import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/firebase";
import { DeviceToken } from "@/messaging/DeviceToken";
import { addDoc, collection, Timestamp } from "firebase/firestore";

export const sendTokenToServer = async (token: string) => {
    // create 'deviceToken' collection as sub-collection of 'users' collection
    // get user id from useAuth
    const { currentUser } = useAuth();
    if (!currentUser) {
        throw new Error("User not found");
    }
    const deviceTokenCollection = collection(firestore, `users/${currentUser.uid}/deviceTokens`);
    const deviceToken: DeviceToken = {
        token,
        timestamp: Timestamp.now(),
    };
    await addDoc(deviceTokenCollection, deviceToken);
};