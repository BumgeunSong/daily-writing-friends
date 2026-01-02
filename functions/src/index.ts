// Firebase Cloud Functions - Main exports
// Feature-based imports for better organization

// Re-export all functions from each feature
export { createCommenting, updateCommenting } from './commentings';

export {
  onCommentCreated,
  onReplyCreatedOnComment,
  onReplyCreatedOnPost,
  updatePostDaysFromFirstDay,
  updateCommentRepliesCounts,
  incrementCommentCountOnCommentCreated,
  decrementCommentCountOnCommentDeleted,
  incrementRepliesCountOnReplyCreated,
  decrementRepliesCountOnReplyDeleted,
  incrementLikeCountOnLikeCreated,
  decrementLikeCountOnLikeDeleted,
  onLikeCreatedOnPost,
  onReactionCreatedOnComment,
  onReactionCreatedOnReply
} from './notifications';

export {
  createPosting,
  onPostingCreated,
  updatePosting
} from './postings';

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

// Phase 2.1: On-demand projection with virtual DayClosed
export {
  computeUserStreakProjectionHttp
} from './eventSourcing/projection/computeStreakProjectionHttp';

export {
  explainUserStreakProjectionHttp
} from './eventSourcing/projection/explainStreakProjectionHttp';

// Phase 3: Historical event backfill
export {
  backfillHistoricalEventsHttp
} from './eventSourcing/backfill/backfillEventsHttp';

// Engagement Score
export {
  updateEngagementScore
} from './engagementScore';

export {
  backfillEngagementScoreHttp
} from './backfill/backfillEngagementScore';