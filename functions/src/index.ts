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

// Engagement Score
export {
  updateEngagementScore
} from './engagementScore';

export {
  backfillEngagementScoreHttp
} from './backfill/backfillEngagementScore';