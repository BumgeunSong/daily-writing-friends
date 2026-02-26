import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { remoteConfig } from '@/firebase';
import { fetchAndActivate, getValue } from 'firebase/remote-config';
import { getSupabaseClient } from '@/shared/api/supabaseClient';

// Remote Config key union type
export type RemoteConfigKey =
  | 'active_board_id'
  | 'upcoming_board_id'
  | 'stats_notice_banner_text'
  | 'block_user_feature_enabled';

// 각 key별 타입 정의
interface RemoteConfigValueTypes {
  active_board_id: string;
  upcoming_board_id: string;
  stats_notice_banner_text: string;
  block_user_feature_enabled: boolean;
}

export const REMOTE_CONFIG_DEFAULTS: RemoteConfigValueTypes = {
  active_board_id: 'rW3Y3E2aEbpB0KqGiigd',
  upcoming_board_id: 'rW3Y3E2aEbpB0KqGiigd',
  stats_notice_banner_text: '',
  block_user_feature_enabled: false,
};

/**
 * Supabase app_config 테이블에서 보드 설정을 가져옵니다.
 */
async function fetchBoardConfigFromSupabase(): Promise<{
  active_board_id: string;
  upcoming_board_id: string;
} | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['active_board_id', 'upcoming_board_id']);

    if (error || !data || data.length === 0) return null;

    const config: Record<string, string> = {};
    for (const row of data) {
      config[row.key] = row.value;
    }

    return {
      active_board_id: config.active_board_id || '',
      upcoming_board_id: config.upcoming_board_id || '',
    };
  } catch {
    return null;
  }
}

interface RemoteConfigContextValue {
  ready: boolean;
  values: RemoteConfigValueTypes;
  error: Error | null;
  refetch: () => void;
}

const RemoteConfigContext = createContext<RemoteConfigContextValue>({
  ready: false,
  values: REMOTE_CONFIG_DEFAULTS,
  error: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  refetch: () => {},
});

export function RemoteConfigProvider({ children }: { children: React.ReactNode }) {
  const [ready] = useState(true);
  const [values, setValues] = useState<RemoteConfigValueTypes>(REMOTE_CONFIG_DEFAULTS);
  const [error, setError] = useState<Error | null>(null);

  const loadConfig = useCallback(() => {
    setError(null);

    // Board config from Supabase, other config from Firebase Remote Config (in parallel)
    const supabasePromise = fetchBoardConfigFromSupabase();

    const firebasePromise = remoteConfig
      ? fetchAndActivate(remoteConfig).then(() => ({
          stats_notice_banner_text:
            getValue(remoteConfig, 'stats_notice_banner_text').asString() ||
            REMOTE_CONFIG_DEFAULTS.stats_notice_banner_text,
          block_user_feature_enabled: getValue(
            remoteConfig,
            'block_user_feature_enabled',
          ).asBoolean(),
        }))
      : Promise.resolve(null);

    Promise.all([supabasePromise, firebasePromise])
      .then(([boardConfig, firebaseConfig]) => {
        setValues({
          active_board_id:
            boardConfig?.active_board_id || REMOTE_CONFIG_DEFAULTS.active_board_id,
          upcoming_board_id:
            boardConfig?.upcoming_board_id || REMOTE_CONFIG_DEFAULTS.upcoming_board_id,
          stats_notice_banner_text:
            firebaseConfig?.stats_notice_banner_text || REMOTE_CONFIG_DEFAULTS.stats_notice_banner_text,
          block_user_feature_enabled:
            firebaseConfig?.block_user_feature_enabled ?? REMOTE_CONFIG_DEFAULTS.block_user_feature_enabled,
        });
      })
      .catch((err) => {
        console.error('Failed to fetch config:', err);
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setValues(REMOTE_CONFIG_DEFAULTS);
      });
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return (
    <RemoteConfigContext.Provider value={{ ready, values, error, refetch: loadConfig }}>
      {children}
    </RemoteConfigContext.Provider>
  );
}

// key별 타입 추론 지원
export function useRemoteConfig<K extends keyof RemoteConfigValueTypes>(key: K) {
  const ctx = useContext(RemoteConfigContext);
  return {
    value: ctx.values[key],
    isLoading: !ctx.ready,
    error: ctx.error,
    refetch: ctx.refetch,
  } as const;
}

export function useRemoteConfigReady() {
  return useContext(RemoteConfigContext).ready;
}
