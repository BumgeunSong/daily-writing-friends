import { Timestamp } from "firebase-admin/firestore";

export interface FirebaseMessagingToken {
    token: string;
    timestamp: Timestamp;
    userAgent?: string;
}