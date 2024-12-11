import { MessagePayload } from "firebase/messaging";
import { toast } from "@/hooks/use-toast";

export default function onMessageInForeground(payload: MessagePayload) {
    console.log('Message received in foreground: ', payload);
    toast({
        title: payload.notification?.title || "Notification",
        description: payload.notification?.body || "You have a new message",
    });
}
