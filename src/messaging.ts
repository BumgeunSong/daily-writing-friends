import { FirebaseApp } from "firebase/app";
import { getMessaging, Messaging, onMessage } from "firebase/messaging";
import onMessageInForeground from "./messaging/foregroundMessage";

// handle error if browser doesn't support firebase messaging  
export function initializeMessaging(app: FirebaseApp): Messaging | null {
    let messaging: Messaging | null = null;
    try {
        if (typeof window !== "undefined" && typeof window.navigator !== "undefined") {
            messaging = getMessaging(app);
        }
        if (messaging) {
            onMessage(messaging, onMessageInForeground);
        }
    } catch (error) {
        console.error('Firebase messaging은 이 브라우저에서 지원되지 않습니다:', error);
        messaging = null;
    }
    return messaging;
}
