import { NextRequest } from 'next/server';
import { withAdmin, AdminApiError } from '@/lib/server/with-admin';
import { getServerSupabase } from '@/lib/server/supabase';
import { GetPreviousCohortPostsResponseSchema } from '@/types/admin-api-contracts';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteParams) {
  const { id: userId } = await ctx.params;
  const handler = withAdmin({
    kind: 'read',
    schema: GetPreviousCohortPostsResponseSchema,
    handler: async ({ req }) => {
      const url = new URL(req.url);
      const cohortRaw = url.searchParams.get('cohort');
      const cohort = cohortRaw ? Number.parseInt(cohortRaw, 10) : NaN;
      if (!Number.isFinite(cohort)) {
        throw AdminApiError.badRequest("Query param 'cohort' must be an integer.");
      }
      const supabase = getServerSupabase();

      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('id')
        .eq('cohort', cohort - 1)
        .maybeSingle();
      if (boardError) throw AdminApiError.serverError(boardError.message);
      if (!boardData) return { count: null };

      const { count, error: countError } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('board_id', boardData.id)
        .eq('author_id', userId);
      if (countError) throw AdminApiError.serverError(countError.message);

      return { count: count ?? 0 };
    },
  });
  return handler(req);
}
