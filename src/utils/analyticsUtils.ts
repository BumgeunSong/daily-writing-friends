import { analytics } from '@/firebase';
import { logEvent } from 'firebase/analytics';

export enum AnalyticsEvent {
    // Create comment
    CREATE_COMMENT = 'create_comment',
    // Create post
    CREATE_POST = 'create_post',
    // Create reply
    CREATE_REPLY = 'create_reply',
}

export function sendAnalyticsEvent(event: AnalyticsEvent, params?: Record<string, any>) {
  logEvent(analytics, event, params);
}

