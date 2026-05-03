import { withAdmin, AdminApiError } from '@/lib/server/with-admin';
import { getServerSupabase } from '@/lib/server/supabase';
import {
  GetPostsResponseSchema,
  PostsRangeSchema,
  type SupabasePost,
} from '@/types/admin-api-contracts';

// Week boundaries are computed in KST regardless of server timezone.
// Vercel runs in UTC; admins expect Korean weeks. Without an explicit timezone,
// the same calendar week shifts ~9 hours across the Mon/Sun edges.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getWeekRange(): { monday: Date; sunday: Date } {
  // Shift "now" into KST clock space, compute the week locally, then shift back.
  const nowKst = new Date(Date.now() + KST_OFFSET_MS);
  const day = nowKst.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const mondayKstMidnight = new Date(nowKst);
  mondayKstMidnight.setUTCHours(0, 0, 0, 0);
  mondayKstMidnight.setUTCDate(nowKst.getUTCDate() + diffToMonday);

  const sundayKstEnd = new Date(mondayKstMidnight);
  sundayKstEnd.setUTCDate(mondayKstMidnight.getUTCDate() + 6);
  sundayKstEnd.setUTCHours(23, 59, 59, 999);

  // Shift back to true UTC instants for Postgres comparison.
  return {
    monday: new Date(mondayKstMidnight.getTime() - KST_OFFSET_MS),
    sunday: new Date(sundayKstEnd.getTime() - KST_OFFSET_MS),
  };
}

export const GET = withAdmin({
  kind: 'read',
  schema: GetPostsResponseSchema,
  handler: async ({ req }) => {
    const url = new URL(req.url);
    const boardId = url.searchParams.get('boardId');
    if (!boardId) {
      throw AdminApiError.badRequest("Query param 'boardId' is required.");
    }
    const rangeRaw = url.searchParams.get('range') ?? 'all';
    const rangeParsed = PostsRangeSchema.safeParse(rangeRaw);
    if (!rangeParsed.success) {
      throw AdminApiError.badRequest("Query param 'range' must be 'week' or 'all'.");
    }

    const supabase = getServerSupabase();
    let query = supabase
      .from('posts')
      .select('*, users!author_id(nickname)')
      .eq('board_id', boardId)
      .order('engagement_score', { ascending: false, nullsFirst: false });

    if (rangeParsed.data === 'week') {
      const { monday, sunday } = getWeekRange();
      query = query.gte('created_at', monday.toISOString()).lte('created_at', sunday.toISOString());
    }

    const { data, error } = await query;
    if (error) throw AdminApiError.serverError(error.message);
    return { posts: (data ?? []) as SupabasePost[] };
  },
});
