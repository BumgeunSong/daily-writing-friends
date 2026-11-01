// src/firebase.ts

// Core Firebase imports (alphabetically ordered)
import { initializeApp } from 'firebase/app';
import { getInstallations } from 'firebase/installations';
import { getStorage } from 'firebase/storage';
import type { RemoteConfig } from 'firebase/remote-config';
import { getRemoteConfig } from 'firebase/remote-config';

// Internal imports (alphabetically ordered)
import { connectToEmulators } from './firebase/emulator';
import { configureRemoteConfig } from './firebase/remote-config';
import { shouldInitOptionalFirebaseServices } from './firebase/optional-services';
import { createFirebaseConfig, shouldUseEmulators } from './firebase/utils';

// Initialize Firebase app
const firebaseConfig = createFirebaseConfig();
const hasFirebaseConfig = Boolean(firebaseConfig.projectId);
const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;

// Initialize core services
const storage = app ? getStorage(app) : null;
const installations = app ? getInstallations(app) : null;

if (!hasFirebaseConfig) {
  console.warn('Firebase config missing (projectId not set). Firebase services disabled.');
}

// Non-critical services (initialized conditionally, wrapped in object to avoid mutable exports)
const optionalServices: {
  remoteConfig: RemoteConfig | null;
} = {
  remoteConfig: null,
};

const useEmulators = shouldUseEmulators();

const initOptionalServices = shouldInitOptionalFirebaseServices({
  isEmulator: useEmulators,
  apiKey: firebaseConfig.apiKey,
});

if (app && initOptionalServices && typeof window !== 'undefined') {
  try {
    optionalServices.remoteConfig = getRemoteConfig(app);
    configureRemoteConfig(optionalServices.remoteConfig);
  } catch (error) {
    console.warn('Optional Firebase services not available:', error);
  }
} else if (app) {
  console.log(
    '🧪 Remote Config disabled (emulator or placeholder API key) - using default values',
  );
}

// Connect to emulators if enabled
if (storage) {
  connectToEmulators(storage);
}

// Export configuration flags for other modules
export const isUsingEmulators = useEmulators;

// Getter functions for lazily-initialized services
export const getFirebaseRemoteConfig = () => optionalServices.remoteConfig;

// Backward-compatible named exports (remoteConfig is set synchronously at module init)
const remoteConfig = optionalServices.remoteConfig;

export { storage, installations, app, remoteConfig };
