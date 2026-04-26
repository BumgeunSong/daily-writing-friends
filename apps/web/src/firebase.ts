// src/firebase.ts

// Core Firebase imports (alphabetically ordered)
import type { Analytics} from 'firebase/analytics';
import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { getInstallations } from 'firebase/installations';
import type { FirebasePerformance} from 'firebase/performance';
import { getPerformance } from 'firebase/performance';
import { getStorage } from 'firebase/storage';
import type { RemoteConfig } from 'firebase/remote-config';
import { getRemoteConfig } from 'firebase/remote-config';

// Internal imports (alphabetically ordered)
import { connectToEmulators } from './firebase/emulator';
import { configureRemoteConfig } from './firebase/remote-config';
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
  performance: FirebasePerformance | null;
  analytics: Analytics | null;
  remoteConfig: RemoteConfig | null;
} = {
  performance: null,
  analytics: null,
  remoteConfig: null,
};

const useEmulators = shouldUseEmulators();

if (app && !useEmulators && typeof window !== 'undefined') {
  try {
    optionalServices.remoteConfig = getRemoteConfig(app);
    configureRemoteConfig(optionalServices.remoteConfig);

    const scheduleIdleTask = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(callback, { timeout: 2000 });
      } else {
        setTimeout(callback, 1);
      }
    };

    scheduleIdleTask(() => {
      try {
        optionalServices.performance = getPerformance(app);
        optionalServices.analytics = getAnalytics(app);
      } catch (error) {
        console.warn('Analytics/Performance services not available:', error);
      }
    });
  } catch (error) {
    console.warn('Optional Firebase services not available:', error);
  }
} else if (app) {
  console.log(
    '🧪 Analytics, Performance, and Remote Config disabled in emulator mode - using default values',
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
export const getFirebasePerformance = () => optionalServices.performance;
export const getFirebaseAnalytics = () => optionalServices.analytics;

// Backward-compatible named exports (remoteConfig is set synchronously at module init)
const remoteConfig = optionalServices.remoteConfig;

export { storage, installations, app, remoteConfig };
