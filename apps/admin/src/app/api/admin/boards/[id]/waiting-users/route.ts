import { NextRequest } from 'next/server';
import { withAdmin, AdminApiError } from '@/lib/server/with-admin';
import { getServerSupabase } from '@/lib/server/supabase';
import { GetWaitingUsersResponseSchema, type WaitingUser } from '@/types/admin-api-contracts';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteParams) {
  const { id } = await ctx.params;
  const handler = withAdmin({
    kind: 'read',
    schema: GetWaitingUsersResponseSchema,
    handler: async () => {
      const supabase = getServerSupabase();
      const { data, error } = await supabase
        .from('board_waiting_users')
        .select(
          'user_id, users(id, real_name, nickname, email, phone_number, referrer, profile_photo_url)',
        )
        .eq('board_id', id);
      if (error) throw AdminApiError.serverError(error.message);

      const users: WaitingUser[] = (data ?? []).map((row: { user_id: string; users: unknown }) => ({
        user_id: row.user_id,
        user: row.users as WaitingUser['user'],
      }));
      return { users };
    },
  });
  return handler(req);
}
