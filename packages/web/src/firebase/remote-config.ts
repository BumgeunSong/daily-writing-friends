// src/firebase/remote-config.ts

import { RemoteConfig } from 'firebase/remote-config';
import { REMOTE_CONFIG_FETCH_INTERVALS, TIME_CONSTANTS } from './constants';

/**
 * Configures Remote Config fetch interval based on environment
 */
export const configureRemoteConfig = (remoteConfig: RemoteConfig): void => {
  // Reference: https://firebase.google.com/docs/remote-config/get-started?platform=web#rest_2
  const isDevelopment = import.meta.env.DEV;
  const fetchIntervalMs = isDevelopment
    ? REMOTE_CONFIG_FETCH_INTERVALS.DEVELOPMENT
    : REMOTE_CONFIG_FETCH_INTERVALS.PRODUCTION;

  remoteConfig.settings.minimumFetchIntervalMillis = fetchIntervalMs;

  console.log(
    `🔧 Remote Config fetch interval set to: ${fetchIntervalMs / TIME_CONSTANTS.SECOND_IN_MS} seconds (${isDevelopment ? 'development' : 'production'} mode)`,
  );
};
