import { z } from 'zod';

// =============================================================================
// Error envelope (every non-2xx response from /api/admin/** matches this shape)
// =============================================================================

export const AdminApiErrorCodeSchema = z.enum([
  'unauthorized',
  'forbidden',
  'rate-limited',
  'bad-request',
  'server-error',
]);
export type AdminApiErrorCode = z.infer<typeof AdminApiErrorCodeSchema>;

export const AdminApiErrorSchema = z.object({
  error: z.string(),
  code: AdminApiErrorCodeSchema,
});
export type AdminApiErrorBody = z.infer<typeof AdminApiErrorSchema>;

// =============================================================================
// Audit log action enum
// =============================================================================

export type AdminAction = 'user.approve' | 'user.reject' | 'board.create' | 'app-config.update';

// =============================================================================
// Domain shapes — mirror Supabase row shapes 1:1 (snake_case) so existing pages
// can keep their existing property accesses. Date columns are ISO-8601 strings
// (always — JSON serialization unconditionally converts Date to string).
// =============================================================================

// --- boards -----------------------------------------------------------------

export const SupabaseBoardSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  first_day: z.string().nullable(),
  last_day: z.string().nullable(),
  cohort: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SupabaseBoard = z.infer<typeof SupabaseBoardSchema>;

/**
 * Mapped board shape used by pages. Mirrors the legacy `Board` type from
 * `types/firestore.ts` but with date fields as ISO-8601 strings instead of
 * `Date` objects (the previous client-side `mapToBoard` used `new Date(...)`;
 * pages must now construct Date themselves where needed).
 */
export const BoardSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  cohort: z.number().optional(),
  /** ISO-8601 date string, may be undefined. */
  firstDay: z.string().optional(),
  /** ISO-8601 date string, may be undefined. */
  lastDay: z.string().optional(),
  /** ISO-8601 timestamp string. */
  createdAt: z.string(),
});
export type Board = z.infer<typeof BoardSchema>;

// --- users ------------------------------------------------------------------

export const SupabaseUserSchema = z.object({
  id: z.string(),
  real_name: z.string().nullable(),
  nickname: z.string().nullable(),
  email: z.string().nullable(),
  phone_number: z.string().nullable(),
  profile_photo_url: z.string().nullable(),
  bio: z.string().nullable(),
  referrer: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SupabaseUser = z.infer<typeof SupabaseUserSchema>;

export const BoardUserSchema = z.object({
  permission: z.enum(['read', 'write']),
  user: z.object({
    id: z.string(),
    real_name: z.string().nullable(),
    nickname: z.string().nullable(),
    email: z.string().nullable(),
    phone_number: z.string().nullable(),
    profile_photo_url: z.string().nullable(),
  }),
});
export type BoardUser = z.infer<typeof BoardUserSchema>;

export const WaitingUserSchema = z.object({
  user_id: z.string(),
  user: z.object({
    id: z.string(),
    real_name: z.string().nullable(),
    nickname: z.string().nullable(),
    email: z.string().nullable(),
    phone_number: z.string().nullable(),
    referrer: z.string().nullable(),
    profile_photo_url: z.string().nullable(),
  }),
});
export type WaitingUser = z.infer<typeof WaitingUserSchema>;

export const SearchUserSchema = z.object({
  id: z.string(),
  real_name: z.string().nullable(),
  nickname: z.string().nullable(),
  email: z.string().nullable(),
});
export type SearchUser = z.infer<typeof SearchUserSchema>;

// --- posts ------------------------------------------------------------------

export const SupabasePostSchema = z.object({
  id: z.string(),
  board_id: z.string(),
  author_id: z.string(),
  author_name: z.string(),
  title: z.string(),
  content: z.string(),
  thumbnail_image_url: z.string().nullable(),
  count_of_comments: z.number(),
  count_of_replies: z.number(),
  count_of_likes: z.number(),
  engagement_score: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  users: z
    .object({
      nickname: z.string().nullable(),
    })
    .nullable(),
});
export type SupabasePost = z.infer<typeof SupabasePostSchema>;

// --- app config -------------------------------------------------------------

export const AppConfigSchema = z.object({
  active_board_id: z.string(),
  upcoming_board_id: z.string(),
});
export type AppConfig = z.infer<typeof AppConfigSchema>;

// =============================================================================
// Route response schemas
// =============================================================================

export const GetMeResponseSchema = z.object({ isAdmin: z.boolean() });
export type GetMeResponse = z.infer<typeof GetMeResponseSchema>;

export const GetBoardsResponseSchema = z.object({
  boards: z.array(SupabaseBoardSchema),
});
export type GetBoardsResponse = z.infer<typeof GetBoardsResponseSchema>;

export const GetBoardResponseSchema = z.object({
  board: SupabaseBoardSchema,
});
export type GetBoardResponse = z.infer<typeof GetBoardResponseSchema>;

export const GetLastBoardResponseSchema = z.object({
  board: SupabaseBoardSchema.nullable(),
});
export type GetLastBoardResponse = z.infer<typeof GetLastBoardResponseSchema>;

export const GetBoardUsersResponseSchema = z.object({
  users: z.array(BoardUserSchema),
});
export type GetBoardUsersResponse = z.infer<typeof GetBoardUsersResponseSchema>;

export const GetWaitingUsersResponseSchema = z.object({
  users: z.array(WaitingUserSchema),
});
export type GetWaitingUsersResponse = z.infer<typeof GetWaitingUsersResponseSchema>;

export const GetUsersResponseSchema = z.object({
  users: z.array(SupabaseUserSchema),
});
export type GetUsersResponse = z.infer<typeof GetUsersResponseSchema>;

export const SearchUsersResponseSchema = z.object({
  users: z.array(SearchUserSchema),
});
export type SearchUsersResponse = z.infer<typeof SearchUsersResponseSchema>;

export const GetUsersByIdsRequestSchema = z.object({
  ids: z.array(z.string()),
});
export type GetUsersByIdsRequest = z.infer<typeof GetUsersByIdsRequestSchema>;

export const GetUsersByIdsResponseSchema = z.object({
  users: z.array(SupabaseUserSchema),
});
export type GetUsersByIdsResponse = z.infer<typeof GetUsersByIdsResponseSchema>;

export const GetPreviousCohortPostsResponseSchema = z.object({
  count: z.number().nullable(),
});
export type GetPreviousCohortPostsResponse = z.infer<typeof GetPreviousCohortPostsResponseSchema>;

export const PostsRangeSchema = z.enum(['week', 'all']);
export type PostsRange = z.infer<typeof PostsRangeSchema>;

export const GetPostsResponseSchema = z.object({
  posts: z.array(SupabasePostSchema),
});
export type GetPostsResponse = z.infer<typeof GetPostsResponseSchema>;

export const GetAppConfigResponseSchema = z.object({
  config: AppConfigSchema,
});
export type GetAppConfigResponse = z.infer<typeof GetAppConfigResponseSchema>;

// =============================================================================
// Mutation routes
// =============================================================================

export const ApproveUserRequestSchema = z.object({
  userId: z.string(),
  boardId: z.string(),
});
export type ApproveUserRequest = z.infer<typeof ApproveUserRequestSchema>;

export const ApproveUserResponseSchema = z.object({
  status: z.enum(['approved', 'already-handled']),
  firstTime: z.boolean(),
});
export type ApproveUserResponse = z.infer<typeof ApproveUserResponseSchema>;

export const RejectUserRequestSchema = z.object({
  userId: z.string(),
  boardId: z.string(),
});
export type RejectUserRequest = z.infer<typeof RejectUserRequestSchema>;

export const RejectUserResponseSchema = z.object({
  status: z.enum(['rejected', 'already-handled']),
  firstTime: z.boolean(),
});
export type RejectUserResponse = z.infer<typeof RejectUserResponseSchema>;

export const CreateBoardRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  /** ISO date string, e.g. "2026-05-04" */
  firstDay: z.string(),
  /** ISO date string */
  lastDay: z.string(),
  cohort: z.number().int(),
});
export type CreateBoardRequest = z.infer<typeof CreateBoardRequestSchema>;

export const CreateBoardResponseSchema = z.object({
  board: SupabaseBoardSchema,
});
export type CreateBoardResponse = z.infer<typeof CreateBoardResponseSchema>;

export const UpdateAppConfigRequestSchema = z.object({
  activeBoardId: z.string(),
  upcomingBoardId: z.string(),
});
export type UpdateAppConfigRequest = z.infer<typeof UpdateAppConfigRequestSchema>;

export const UpdateAppConfigResponseSchema = z.object({
  config: AppConfigSchema,
});
export type UpdateAppConfigResponse = z.infer<typeof UpdateAppConfigResponseSchema>;

// =============================================================================
// Helper: row → mapped Board (for routes that expose the legacy mapped shape)
// =============================================================================

export function mapToBoard(row: SupabaseBoard): Board {
  const board: Board = {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    createdAt: row.created_at,
  };
  if (row.cohort !== null) board.cohort = row.cohort;
  if (row.first_day) board.firstDay = row.first_day;
  if (row.last_day) board.lastDay = row.last_day;
  return board;
}
