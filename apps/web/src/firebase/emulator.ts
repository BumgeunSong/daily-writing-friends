// src/firebase/emulator.ts

import type { FirebaseStorage} from 'firebase/storage';
import { connectStorageEmulator } from 'firebase/storage';
import { ERROR_MESSAGES } from './constants';
import { createEmulatorConfig, shouldUseEmulators } from './utils';

export interface EmulatorConfig {
  storage: { host: string; port: number };
  functions: { host: string; port: number };
}

/**
 * Gets the emulator configuration
 */
export const getEmulatorConfig = (): EmulatorConfig => {
  return createEmulatorConfig();
};

/**
 * Connects to Storage emulator
 */
export const connectToStorageEmulator = (
  storage: FirebaseStorage,
  config: EmulatorConfig,
): void => {
  try {
    connectStorageEmulator(storage, config.storage.host, config.storage.port);
    console.log(
      `📁 Connected to Storage emulator at ${config.storage.host}:${config.storage.port}`,
    );
  } catch (error) {
    console.error('Failed to connect to Storage emulator:', error);
    throw error;
  }
};

/**
 * Connects all Firebase services to their respective emulators
 */
export const connectToEmulators = (
  storage: FirebaseStorage,
): void => {
  if (!shouldUseEmulators()) {
    return;
  }

  const config = getEmulatorConfig();

  console.log('🧪 Firebase emulators enabled for development/testing');
  console.log('Emulator configuration:', config);

  try {
    connectToStorageEmulator(storage, config);
  } catch (error) {
    console.error('Failed to connect to Firebase emulators:', error);
    console.warn(ERROR_MESSAGES.EMULATOR_START_COMMAND);
    throw error;
  }
};
