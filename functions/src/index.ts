// Firebase Cloud Functions - Main exports
// Feature-based imports for better organization

// Re-export all functions from each feature
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
  allocateSecretBuddy
} from './scripts';

export { 
  retroactiveBackfillHttp
} from './backfill/retroactiveBackfillHttp';

export {
  backfillAllBoardUsersHttp
} from './backfill/backfillAllBoardUsers';

// Engagement Score
export {
  updateEngagementScore
} from './engagementScore';

export {
  backfillEngagementScoreHttp
} from './backfill/backfillEngagementScore';