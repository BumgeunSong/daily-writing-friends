import { logEvent } from 'firebase/analytics';
import { analytics } from '@/firebase';

export enum AnalyticsEvent {
    // Create comment
    CREATE_COMMENT = 'create_comment',
    // Create post
    CREATE_POST = 'create_post',
    // Create reply
    CREATE_REPLY = 'create_reply',
    // Start FreeWriting
    START_FREE_WRITING = 'start_free_writing',
    // Finish FreeWriting
    FINISH_FREE_WRITING = 'finish_free_writing',
    // Start Topic Card
    START_TOPIC_CARD = 'start_topic_card',
    // Finish Topic Card
    FINISH_TOPIC_CARD = 'finish_topic_card',

}

export function sendAnalyticsEvent(event: AnalyticsEvent, params?: Record<string, any>) {
  logEvent(analytics, event, params);
}

