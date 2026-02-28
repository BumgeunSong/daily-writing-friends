// src/firebase/emulator.ts

import type { Firestore} from 'firebase/firestore';
import { connectFirestoreEmulator } from 'firebase/firestore';
import type { FirebaseStorage} from 'firebase/storage';
import { connectStorageEmulator } from 'firebase/storage';
import { ERROR_MESSAGES } from './constants';
import { createEmulatorConfig, shouldUseEmulators } from './utils';

export interface EmulatorConfig {
  firestore: { host: string; port: number };
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
 * Connects to Firestore emulator
 */
export const connectToFirestoreEmulator = (firestore: Firestore, config: EmulatorConfig): void => {
  try {
    connectFirestoreEmulator(firestore, config.firestore.host, config.firestore.port);
    console.log(
      `🔥 Connected to Firestore emulator at ${config.firestore.host}:${config.firestore.port}`,
    );
  } catch (error) {
    console.error('Failed to connect to Firestore emulator:', error);
    throw error;
  }
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
  firestore: Firestore,
  storage: FirebaseStorage,
): void => {
  if (!shouldUseEmulators()) {
    return;
  }

  const config = getEmulatorConfig();

  console.log('🧪 Firebase emulators enabled for development/testing');
  console.log('Emulator configuration:', config);

  try {
    connectToFirestoreEmulator(firestore, config);
    connectToStorageEmulator(storage, config);
  } catch (error) {
    console.error('Failed to connect to Firebase emulators:', error);
    console.warn(ERROR_MESSAGES.EMULATOR_START_COMMAND);
    throw error;
  }
};
