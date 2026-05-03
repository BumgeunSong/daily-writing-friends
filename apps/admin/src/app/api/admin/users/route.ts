import { withAdmin, AdminApiError } from '@/lib/server/with-admin';
import { getServerSupabase } from '@/lib/server/supabase';
import { GetUsersResponseSchema, type SupabaseUser } from '@/types/admin-api-contracts';

export const GET = withAdmin({
  kind: 'read',
  schema: GetUsersResponseSchema,
  handler: async () => {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw AdminApiError.serverError(error.message);
    return { users: (data ?? []) as SupabaseUser[] };
  },
});
