import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { remoteConfig } from '@/firebase';
import { fetchAndActivate, getValue } from 'firebase/remote-config';

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
  const [ready, setReady] = useState(true);
  const [values, setValues] = useState<RemoteConfigValueTypes>(REMOTE_CONFIG_DEFAULTS);
  const [error, setError] = useState<Error | null>(null);

  const loadConfig = useCallback(() => {
    if (!remoteConfig) {
      console.warn('Remote Config not available (emulator mode or server environment)');
      setValues(REMOTE_CONFIG_DEFAULTS);
      setReady(true);
      return;
    }

    setError(null);
    remoteConfig.defaultConfig = REMOTE_CONFIG_DEFAULTS;

    fetchAndActivate(remoteConfig)
      .then(() => {
        setValues({
          active_board_id:
            getValue(remoteConfig, 'active_board_id').asString() ||
            REMOTE_CONFIG_DEFAULTS.active_board_id,
          upcoming_board_id:
            getValue(remoteConfig, 'upcoming_board_id').asString() ||
            REMOTE_CONFIG_DEFAULTS.upcoming_board_id,
          stats_notice_banner_text:
            getValue(remoteConfig, 'stats_notice_banner_text').asString() ||
            REMOTE_CONFIG_DEFAULTS.stats_notice_banner_text,
          block_user_feature_enabled: getValue(
            remoteConfig,
            'block_user_feature_enabled',
          ).asBoolean(),
        });
      })
      .catch((err) => {
        console.error('Failed to fetch Remote Config:', err);
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
