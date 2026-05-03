import { withAdmin, AdminApiError } from '@/lib/server/with-admin';
import { getServerSupabase } from '@/lib/server/supabase';
import {
  GetAppConfigResponseSchema,
  UpdateAppConfigRequestSchema,
  UpdateAppConfigResponseSchema,
} from '@/types/admin-api-contracts';

async function readAppConfig(): Promise<{
  active_board_id: string;
  upcoming_board_id: string;
}> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['active_board_id', 'upcoming_board_id']);
  if (error) throw AdminApiError.serverError(error.message);

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.key as string] = row.value as string;
  }
  return {
    active_board_id: map['active_board_id'] ?? '',
    upcoming_board_id: map['upcoming_board_id'] ?? '',
  };
}

export const GET = withAdmin({
  kind: 'read',
  schema: GetAppConfigResponseSchema,
  handler: async () => {
    const config = await readAppConfig();
    return { config };
  },
});

export const POST = withAdmin({
  kind: 'mutation',
  action: 'app-config.update',
  schema: UpdateAppConfigResponseSchema,
  handler: async ({ req }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw AdminApiError.badRequest('Body must be JSON.');
    }
    const parsed = UpdateAppConfigRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw AdminApiError.badRequest(`Invalid body: ${JSON.stringify(parsed.error.flatten())}`);
    }
    const { activeBoardId, upcomingBoardId } = parsed.data;
    const supabase = getServerSupabase();
    const { error } = await supabase.from('app_config').upsert(
      [
        { key: 'active_board_id', value: activeBoardId },
        { key: 'upcoming_board_id', value: upcomingBoardId },
      ],
      { onConflict: 'key' },
    );
    if (error) throw AdminApiError.serverError(error.message);

    const config = await readAppConfig();
    return {
      data: { config },
      auditTarget: { activeBoardId, upcomingBoardId },
    };
  },
});
