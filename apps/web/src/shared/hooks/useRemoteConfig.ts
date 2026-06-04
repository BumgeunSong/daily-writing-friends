import { useQuery } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { fetchAndActivate, getValue } from 'firebase/remote-config';
import { remoteConfig } from '@/firebase';
import { getSupabaseClient } from '@/shared/api/supabaseClient';

export type RemoteConfigKey =
  | 'active_board_id'
  | 'upcoming_board_id'
  | 'stats_notice_banner_text'
  | 'block_user_feature_enabled';

export interface RemoteConfigValueTypes {
  active_board_id: string;
  upcoming_board_id: string;
  stats_notice_banner_text: string;
  block_user_feature_enabled: boolean;
}

// Mirrors production Supabase `app_config` (verified 2026-06-05) so the app
// behaves correctly on first paint and on fetch failure.
export const REMOTE_CONFIG_DEFAULTS: RemoteConfigValueTypes = {
  active_board_id: '1a65026a-cf93-4828-be54-fd8d034008da',
  upcoming_board_id: 'a852bc21-3de6-4dc0-a601-d1568c77661b',
  stats_notice_banner_text: '',
  block_user_feature_enabled: false,
};

export const REMOTE_CONFIG_QUERY_KEY = ['remoteConfig'] as const;

const REMOTE_CONFIG_STALE_TIME_MS = 5 * 60 * 1000;

async function fetchAppConfigFromSupabase(): Promise<Partial<RemoteConfigValueTypes>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['active_board_id', 'upcoming_board_id']);
  if (error) throw error;

  const rowsByKey: Record<string, string> = {};
  for (const row of data ?? []) {
    rowsByKey[row.key] = row.value;
  }
  const result: Partial<RemoteConfigValueTypes> = {};
  if (rowsByKey.active_board_id) result.active_board_id = rowsByKey.active_board_id;
  if (rowsByKey.upcoming_board_id) result.upcoming_board_id = rowsByKey.upcoming_board_id;
  return result;
}

async function fetchFirebaseRemoteConfig(): Promise<Partial<RemoteConfigValueTypes>> {
  if (!remoteConfig) return {};
  await fetchAndActivate(remoteConfig);
  return {
    stats_notice_banner_text: getValue(remoteConfig, 'stats_notice_banner_text').asString(),
    block_user_feature_enabled: getValue(remoteConfig, 'block_user_feature_enabled').asBoolean(),
  };
}

function reportPartialFailure(source: 'supabase' | 'firebase', reason: unknown) {
  const cause = reason instanceof Error ? reason : new Error(String(reason));
  Sentry.captureException(cause, {
    level: 'warning',
    tags: { feature: 'remote-config', source },
  });
}

async function fetchRemoteConfig(): Promise<RemoteConfigValueTypes> {
  const [supabase, firebase] = await Promise.allSettled([
    fetchAppConfigFromSupabase(),
    fetchFirebaseRemoteConfig(),
  ]);

  const allSourcesFailed = supabase.status === 'rejected' && firebase.status === 'rejected';
  if (allSourcesFailed) {
    throw supabase.reason instanceof Error
      ? supabase.reason
      : new Error(String(supabase.reason));
  }
  if (supabase.status === 'rejected') reportPartialFailure('supabase', supabase.reason);
  if (firebase.status === 'rejected') reportPartialFailure('firebase', firebase.reason);

  return {
    ...REMOTE_CONFIG_DEFAULTS,
    ...(supabase.status === 'fulfilled' ? supabase.value : {}),
    ...(firebase.status === 'fulfilled' ? firebase.value : {}),
  };
}

export function useRemoteConfig<K extends keyof RemoteConfigValueTypes>(key: K) {
  const { data, isPlaceholderData, isFetching, error, refetch } = useQuery({
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
    error: error as Error | null,
    refetch,
  } as const;
}
