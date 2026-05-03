import { NextRequest } from 'next/server';
import { withAdmin, AdminApiError } from '@/lib/server/with-admin';
import { getServerSupabase } from '@/lib/server/supabase';
import { GetBoardResponseSchema, type SupabaseBoard } from '@/types/admin-api-contracts';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteParams) {
  const { id } = await ctx.params;
  const handler = withAdmin({
    kind: 'read',
    schema: GetBoardResponseSchema,
    handler: async () => {
      const supabase = getServerSupabase();
      const { data, error } = await supabase.from('boards').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') {
          throw AdminApiError.notFound(`Board ${id} not found.`);
        }
        throw AdminApiError.serverError(error.message);
      }
      return { board: data as SupabaseBoard };
    },
  });
  return handler(req);
}
