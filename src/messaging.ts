import { FirebaseApp } from "firebase/app";
import { getMessaging, MessagePayload, Messaging, onMessage } from "firebase/messaging";
import { toast } from "./shared/hooks/use-toast";

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

export default function onMessageInForeground(payload: MessagePayload) {
    console.log('Message received in foreground: ', payload);
    toast({
        title: payload.notification?.title || "Notification",
        description: payload.notification?.body || "You have a new message",
    });
}
