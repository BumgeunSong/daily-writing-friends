import { Timestamp } from "firebase/firestore";

export interface FirebaseMessagingToken {
    token: string;
    timestamp: Timestamp;
}