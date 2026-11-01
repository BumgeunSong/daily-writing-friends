import { useQuery } from '@tanstack/react-query';
// eslint-disable-next-line no-restricted-imports -- 기존 위반: external/ 레이어로 이관 예정인 raw 접근
import { getSupabaseClient } from '@/shared/external/supabaseClient';

export interface RemoteConfigValueTypes {
  active_board_id: string;
  upcoming_board_id: string;
}

interface AppConfigRow {
  key: string;
  value: string;
}

type SupabaseConfigKey = 'active_board_id' | 'upcoming_board_id';

// Mirrors production Supabase `app_config` (verified 2026-06-05) so the app
// behaves correctly on first paint and on fetch failure.
export const REMOTE_CONFIG_DEFAULTS: RemoteConfigValueTypes = {
  active_board_id: '1a65026a-cf93-4828-be54-fd8d034008da',
  upcoming_board_id: 'a852bc21-3de6-4dc0-a601-d1568c77661b',
};

export const REMOTE_CONFIG_QUERY_KEY = ['remoteConfig'] as const;

const REMOTE_CONFIG_STALE_TIME_MS = 5 * 60 * 1000;

async function fetchAppConfigFromSupabase(): Promise<Partial<RemoteConfigValueTypes>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['active_board_id', 'upcoming_board_id']);
  if (error) throw error instanceof Error ? error : new Error(String(error));

  const rows = (data ?? []) as AppConfigRow[];
  const rowsByKey: Partial<Record<SupabaseConfigKey, string>> = {};
  for (const row of rows) {
    if (row.key === 'active_board_id' || row.key === 'upcoming_board_id') {
      rowsByKey[row.key] = row.value;
    }
  }
  const result: Partial<RemoteConfigValueTypes> = {};
  if (rowsByKey.active_board_id) result.active_board_id = rowsByKey.active_board_id;
  if (rowsByKey.upcoming_board_id) result.upcoming_board_id = rowsByKey.upcoming_board_id;
  return result;
}

async function fetchRemoteConfig(): Promise<RemoteConfigValueTypes> {
  return { ...REMOTE_CONFIG_DEFAULTS, ...(await fetchAppConfigFromSupabase()) };
}

export function useRemoteConfig<K extends keyof RemoteConfigValueTypes>(key: K) {
  const { data, isPlaceholderData, isFetching, error, refetch } = useQuery<
    RemoteConfigValueTypes,
    Error
  >({
    queryKey: REMOTE_CONFIG_QUERY_KEY,
    queryFn: fetchRemoteConfig,
    placeholderData: REMOTE_CONFIG_DEFAULTS,
    staleTime: REMOTE_CONFIG_STALE_TIME_MS,
  });

  const values = data ?? REMOTE_CONFIG_DEFAULTS;

  return {
    value: values[key],
    isPlaceholderData,
    isFetching,
    error,
    refetch,
  } as const;
}
