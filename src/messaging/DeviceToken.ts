import { Timestamp } from "firebase/firestore";

export interface DeviceToken {
    token: string;
    timestamp: Timestamp;
}