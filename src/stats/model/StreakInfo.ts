import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

/**
 * Recovery status types for the 3-state streak system
 */
export const RecoveryStatusTypeSchema = z.enum(['onStreak', 'eligible', 'missed']);
export type RecoveryStatusType = z.infer<typeof RecoveryStatusTypeSchema>;

/**
 * Recovery status information
 */
export const RecoveryStatusSchema = z.object({
  type: RecoveryStatusTypeSchema,
  postsRequired: z.number().optional(),
  currentPosts: z.number().optional(), 
  deadline: z.instanceof(Timestamp).optional(),
});

export type RecoveryStatus = z.infer<typeof RecoveryStatusSchema>;

/**
 * Main streak information model for frontend use
 */
export const StreakInfoSchema = z.object({
  currentStreak: z.number().min(0),
  longestStreak: z.number().min(0),
  lastContributionDate: z.string(), // YYYY-MM-DD format
  lastCalculated: z.instanceof(Timestamp),
  status: RecoveryStatusSchema,
});

export type StreakInfo = z.infer<typeof StreakInfoSchema>;