import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { remoteConfig } from '@/firebase';
import { fetchAndActivate, getValue } from 'firebase/remote-config';

// Remote Config key union type
export type RemoteConfigKey =
  | 'active_board_id'
  | 'upcoming_board_id'
  | 'user_cache_version'
  | 'free_writing_target_time'
  | 'stats_notice_banner_text';

// 기본값 상수
export const REMOTE_CONFIG_DEFAULTS: Record<RemoteConfigKey, string> = {
  active_board_id: 'rW3Y3E2aEbpB0KqGiigd',
  upcoming_board_id: 'rW3Y3E2aEbpB0KqGiigd',
  user_cache_version: 'v2',
  free_writing_target_time: '300',
  stats_notice_banner_text: '',
};

interface RemoteConfigContextValue {
  ready: boolean;
  values: Record<RemoteConfigKey, string>;
  error: Error | null;
  refetch: () => void;
}

const RemoteConfigContext = createContext<RemoteConfigContextValue>({
  ready: false,
  values: REMOTE_CONFIG_DEFAULTS,
  error: null,
  refetch: () => {},
});

export function RemoteConfigProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [values, setValues] = useState<Record<RemoteConfigKey, string>>(REMOTE_CONFIG_DEFAULTS);
  const [error, setError] = useState<Error | null>(null);

  const loadConfig = useCallback(() => {
    setReady(false);
    setError(null);
    fetchAndActivate(remoteConfig)
      .then(() => {
        setValues({
          active_board_id: getValue(remoteConfig, 'active_board_id').asString() || REMOTE_CONFIG_DEFAULTS.active_board_id,
          upcoming_board_id: getValue(remoteConfig, 'upcoming_board_id').asString() || REMOTE_CONFIG_DEFAULTS.upcoming_board_id,
          user_cache_version: getValue(remoteConfig, 'user_cache_version').asString() || REMOTE_CONFIG_DEFAULTS.user_cache_version,
          stats_notice_banner_text: getValue(remoteConfig, 'stats_notice_banner_text').asString() || REMOTE_CONFIG_DEFAULTS.stats_notice_banner_text,
          free_writing_target_time: getValue(remoteConfig, 'free_writing_target_time').toString() || REMOTE_CONFIG_DEFAULTS.free_writing_target_time,
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setValues(REMOTE_CONFIG_DEFAULTS);
      })
      .finally(() => setReady(true));
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

export function useRemoteConfig<K extends RemoteConfigKey>(key: K) {
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