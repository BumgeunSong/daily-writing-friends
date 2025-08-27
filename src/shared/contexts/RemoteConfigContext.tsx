import { fetchAndActivate, getValue } from 'firebase/remote-config';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { remoteConfig, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Admin user ID
const ADMIN_USER_ID = '1y06BmkauwhIEwZm9LQmEmgl6Al1';

// Remote Config key union type
export type RemoteConfigKey =
  | 'active_board_id'
  | 'upcoming_board_id'
  | 'user_cache_version'
  | 'free_writing_target_time'
  | 'stats_notice_banner_text'
  | 'block_user_feature_enabled'
  | 'secret_buddy_enabled'
  | 'stat_page_enabled'
  | 'tiptap_editor_enabled';

// 각 key별 타입 정의
interface RemoteConfigValueTypes {
  active_board_id: string;
  upcoming_board_id: string;
  user_cache_version: string;
  free_writing_target_time: number;
  stats_notice_banner_text: string;
  block_user_feature_enabled: boolean;
  secret_buddy_enabled: boolean;
  stat_page_enabled: boolean;
  tiptap_editor_enabled: boolean;
}

export const REMOTE_CONFIG_DEFAULTS: RemoteConfigValueTypes = {
  active_board_id: 'rW3Y3E2aEbpB0KqGiigd',
  upcoming_board_id: 'rW3Y3E2aEbpB0KqGiigd',
  user_cache_version: 'v2',
  free_writing_target_time: 300,
  stats_notice_banner_text: '',
  block_user_feature_enabled: false,
  secret_buddy_enabled: true,
  stat_page_enabled: true,
  tiptap_editor_enabled: true,
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
  refetch: () => {},
});

export function RemoteConfigProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [values, setValues] = useState<RemoteConfigValueTypes>(REMOTE_CONFIG_DEFAULTS);
  const [error, setError] = useState<Error | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadConfig = useCallback(() => {
    if (!remoteConfig) {
      console.warn('Remote Config not available (emulator mode or server environment)');
      const isAdmin = currentUserId === ADMIN_USER_ID;
      setValues({
        ...REMOTE_CONFIG_DEFAULTS,
        // Admin always gets tiptap_editor_enabled = true even in emulator mode
        tiptap_editor_enabled: isAdmin ? true : REMOTE_CONFIG_DEFAULTS.tiptap_editor_enabled,
      });
      setReady(true);
      return;
    }

    setReady(false);
    setError(null);

    // Set default config values
    remoteConfig.defaultConfig = REMOTE_CONFIG_DEFAULTS;

    fetchAndActivate(remoteConfig)
      .then(() => {
        const isAdmin = currentUserId === ADMIN_USER_ID;
        
        const configValues = {
          active_board_id:
            getValue(remoteConfig, 'active_board_id').asString() ||
            REMOTE_CONFIG_DEFAULTS.active_board_id,
          upcoming_board_id:
            getValue(remoteConfig, 'upcoming_board_id').asString() ||
            REMOTE_CONFIG_DEFAULTS.upcoming_board_id,
          user_cache_version:
            getValue(remoteConfig, 'user_cache_version').asString() ||
            REMOTE_CONFIG_DEFAULTS.user_cache_version,
          stats_notice_banner_text:
            getValue(remoteConfig, 'stats_notice_banner_text').asString() ||
            REMOTE_CONFIG_DEFAULTS.stats_notice_banner_text,
          free_writing_target_time:
            getValue(remoteConfig, 'free_writing_target_time').asNumber() ||
            REMOTE_CONFIG_DEFAULTS.free_writing_target_time,
          block_user_feature_enabled: getValue(
            remoteConfig,
            'block_user_feature_enabled',
          ).asBoolean(),
          secret_buddy_enabled: getValue(remoteConfig, 'secret_buddy_enabled').asBoolean(),
          stat_page_enabled: getValue(remoteConfig, 'stat_page_enabled').asBoolean(),
          // Admin always gets tiptap_editor_enabled = true, others depend on remote config
          tiptap_editor_enabled: isAdmin ? true : getValue(remoteConfig, 'tiptap_editor_enabled').asBoolean(),
        };
        
        setValues(configValues);
        
        if (isAdmin) {
          console.log('Admin user detected - Tiptap editor enabled');
        }
      })
      .catch((err) => {
        console.error('Failed to fetch Remote Config:', err);
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        // Use default values if fetch fails
        setValues(REMOTE_CONFIG_DEFAULTS);
      })
      .finally(() => setReady(true));
  }, [currentUserId]);

  // Track auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid || null);
    });

    return () => unsubscribe();
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
