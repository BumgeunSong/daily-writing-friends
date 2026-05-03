import { withAdmin, AdminApiError } from '@/lib/server/with-admin';
import { getServerSupabase } from '@/lib/server/supabase';
import { RejectUserRequestSchema, RejectUserResponseSchema } from '@/types/admin-api-contracts';

export const POST = withAdmin({
  kind: 'mutation',
  action: 'user.reject',
  schema: RejectUserResponseSchema,
  handler: async ({ req }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw AdminApiError.badRequest('Body must be JSON.');
    }
    const parsed = RejectUserRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw AdminApiError.badRequest(`Invalid body: ${JSON.stringify(parsed.error.flatten())}`);
    }
    const { userId, boardId } = parsed.data;
    const supabase = getServerSupabase();

    // Atomic DELETE...RETURNING: only one concurrent caller "wins" the row.
    // Reject = remove from waiting list without granting permission.
    const { data: deletedRows, error: deleteError } = await supabase
      .from('board_waiting_users')
      .delete()
      .eq('user_id', userId)
      .eq('board_id', boardId)
      .select();
    if (deleteError) throw AdminApiError.serverError(deleteError.message);

    if (!deletedRows || deletedRows.length === 0) {
      return {
        data: { status: 'already-handled' as const, firstTime: false },
        mutated: false,
      };
    }

    return {
      data: { status: 'rejected' as const, firstTime: true },
      auditTarget: { userId, boardId },
    };
  },
});
