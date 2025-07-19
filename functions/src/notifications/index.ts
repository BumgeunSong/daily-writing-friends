// Notification-related Cloud Functions

// Handlers
export { onCommentCreated } from './commentOnPost';
export { 
  incrementCommentCountOnCommentCreated,
  decrementCommentCountOnCommentDeleted
} from './incrementCommentCount';
export {
  incrementRepliesCountOnReplyCreated,
  decrementRepliesCountOnReplyDeleted
} from './incrementRepliesCount';
export {
  onReactionCreatedOnComment,
  onReactionCreatedOnReply
} from './reactionOnComment';
export { onReplyCreatedOnComment } from './replyOnComment';
export { onReplyCreatedOnPost } from './replyOnPost';
export { onNotificationCreated } from './sendMessageOnNotification';
export { updateCommentRepliesCounts } from './updateCommentRepliesCounts';
export { updatePostDaysFromFirstDay } from './updateDaysFromFirstDay';

// Utilities
export * from './messageGenerator';
export * from './shouldGenerateNotification';