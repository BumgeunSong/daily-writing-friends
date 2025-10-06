// Firebase Cloud Functions - Main exports
// Feature-based imports for better organization

// Re-export all functions from each feature
export { createCommenting, updateCommenting } from './commentings';

export { 
  onCommentCreated,
  onReplyCreatedOnComment,
  onReplyCreatedOnPost,
  onNotificationCreated,
  updatePostDaysFromFirstDay,
  updateCommentRepliesCounts,
  incrementCommentCountOnCommentCreated,
  decrementCommentCountOnCommentDeleted,
  incrementRepliesCountOnReplyCreated,
  decrementRepliesCountOnReplyDeleted,
  onReactionCreatedOnComment,
  onReactionCreatedOnReply
} from './notifications';

export { 
  createPosting,
  onPostingCreated,
  updatePosting
} from './postings';

export { 
  updateRecoveryStatusOnMidnightV2
} from './recoveryStatus';

export { 
  createReplying,
  updateReplying
} from './replyings';

export { 
  allocateSecretBuddy
} from './scripts';

export { 
  retroactiveBackfillHttp
} from './backfill/retroactiveBackfillHttp';

export { 
  backfillAllBoardUsersHttp
} from './backfill/backfillAllBoardUsers';

export {
  createCommentStyleData,
  backfillCommentStyleDataForActiveUsers
} from './commentStyle';

export {
  generateCommentSuggestions
} from './commentSuggestion';

export {
  onEventCreatedTrigger
} from './eventSourcing/projection/onEventCreated';

export {
  migrateDefaultTimezones
} from './eventSourcing/migrations/setDefaultTimezones';

export {
  processDayBoundariesBaseline,
  processDayBoundariesPeak
} from './eventSourcing/scheduler/processDayBoundaries';