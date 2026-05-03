/**
 * Recent working-day windows used by stats and post-card features.
 *
 * STREAK_WINDOW_WORKING_DAYS feeds the streak indicator (whether the user
 * posted on each of the last N working days).
 *
 * TEMPERATURE_WINDOW_WORKING_DAYS feeds the comment-temperature score
 * derived from comment + reply activity over the trailing window.
 */
export const STREAK_WINDOW_WORKING_DAYS = 5;
export const TEMPERATURE_WINDOW_WORKING_DAYS = 20;
