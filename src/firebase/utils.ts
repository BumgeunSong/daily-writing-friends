// src/firebase/utils.ts

import { DEFAULT_EMULATOR_CONFIG, ENV_KEYS, FIREBASE_CONFIG_KEYS } from './constants';

/**
 * Safely parses boolean value from environment variables
 */
export const parseBoolean = (value: string | undefined): boolean => {
  if (typeof value !== 'string') return false;
  return value.toLowerCase() === 'true';
};

/**
 * Creates Firebase configuration object from environment variables
 */
export const createFirebaseConfig = () => ({
  apiKey: import.meta.env[FIREBASE_CONFIG_KEYS.API_KEY] as string,
  authDomain: import.meta.env[FIREBASE_CONFIG_KEYS.AUTH_DOMAIN] as string,
  projectId: import.meta.env[FIREBASE_CONFIG_KEYS.PROJECT_ID] as string,
  storageBucket: import.meta.env[FIREBASE_CONFIG_KEYS.STORAGE_BUCKET] as string,
  messagingSenderId: import.meta.env[FIREBASE_CONFIG_KEYS.MESSAGING_SENDER_ID] as string,
  appId: import.meta.env[FIREBASE_CONFIG_KEYS.APP_ID] as string,
  measurementId: import.meta.env[FIREBASE_CONFIG_KEYS.MEASUREMENT_ID] as string,
});

/**
 * Creates emulator configuration object from environment variables
 */
export const createEmulatorConfig = () => ({
  firestore: {
    host: import.meta.env[ENV_KEYS.EMULATOR_FIRESTORE_HOST] || DEFAULT_EMULATOR_CONFIG.HOST,
    port: parseInt(
      import.meta.env[ENV_KEYS.EMULATOR_FIRESTORE_PORT] || DEFAULT_EMULATOR_CONFIG.PORTS.FIRESTORE,
      DEFAULT_EMULATOR_CONFIG.RADIX,
    ),
  },
  storage: {
    host: import.meta.env[ENV_KEYS.EMULATOR_STORAGE_HOST] || DEFAULT_EMULATOR_CONFIG.HOST,
    port: parseInt(
      import.meta.env[ENV_KEYS.EMULATOR_STORAGE_PORT] || DEFAULT_EMULATOR_CONFIG.PORTS.STORAGE,
      DEFAULT_EMULATOR_CONFIG.RADIX,
    ),
  },
  functions: {
    host: import.meta.env[ENV_KEYS.EMULATOR_FUNCTIONS_HOST] || DEFAULT_EMULATOR_CONFIG.HOST,
    port: parseInt(
      import.meta.env[ENV_KEYS.EMULATOR_FUNCTIONS_PORT] || DEFAULT_EMULATOR_CONFIG.PORTS.FUNCTIONS,
      DEFAULT_EMULATOR_CONFIG.RADIX,
    ),
  },
});

/**
 * Checks if current environment should use Firebase emulators
 */
export const shouldUseEmulators = (): boolean => {
  return parseBoolean(import.meta.env[ENV_KEYS.USE_EMULATORS]);
};

