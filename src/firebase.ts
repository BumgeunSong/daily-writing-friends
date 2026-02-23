// src/firebase.ts

// Core Firebase imports (alphabetically ordered)
import type { Analytics} from 'firebase/analytics';
import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getInstallations } from 'firebase/installations';
import type { FirebasePerformance} from 'firebase/performance';
import { getPerformance } from 'firebase/performance';
import { getStorage } from 'firebase/storage';
import type { UserCredential } from 'firebase/auth';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import type { RemoteConfig } from 'firebase/remote-config';
import { getRemoteConfig } from 'firebase/remote-config';

// Internal imports (alphabetically ordered)
import {
  configureAuthPersistence,
  signInWithGoogle as googleSignIn,
  signOutUser as userSignOut,
  signInWithTestCredentials as testCredentialsSignIn,
  signInWithTestToken as testTokenSignIn,
} from './firebase/auth';
import { connectToEmulators } from './firebase/emulator';
import { configureRemoteConfig } from './firebase/remote-config';
import { createEmulatorConfig, createFirebaseConfig, shouldUseEmulators } from './firebase/utils';

// Initialize Firebase app
const firebaseConfig = createFirebaseConfig();
const app = initializeApp(firebaseConfig);

// Initialize core services
const auth = getAuth(app);
// Use memory-only cache (no offline persistence) to avoid:
// - "FIRESTORE INTERNAL ASSERTION FAILED: Unexpected state" errors
// - PersistentWriteStream sync queue corruption on Mobile Safari
// - IndexedDB issues during network transitions
// Trade-off: App requires network connection, no offline support
const firestore = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});
const storage = getStorage(app);
const installations = getInstallations(app);
const provider = new GoogleAuthProvider();

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

if (!useEmulators && typeof window !== 'undefined') {
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
} else {
  console.log(
    '🧪 Analytics, Performance, and Remote Config disabled in emulator mode - using default values',
  );
}

// Configure auth persistence
configureAuthPersistence(auth).catch((error) => {
  console.error('Failed to configure auth persistence:', error);
});

// Connect to emulators if enabled
connectToEmulators(auth, firestore, storage);

// Export configuration flags for other modules
export const isUsingEmulators = useEmulators;
export const emulatorConfiguration = createEmulatorConfig();

// Auth function wrappers that use our initialized services
export const signInWithGoogle = (): Promise<UserCredential> => googleSignIn(auth, provider);
export const signOutUser = (): Promise<void> => userSignOut(auth);
export const signInWithTestCredentials = (
  email: string,
  password: string,
): Promise<UserCredential> => testCredentialsSignIn(auth, email, password);
export const signInWithTestToken = (customToken: string): Promise<UserCredential> =>
  testTokenSignIn(auth, customToken);

// Getter functions for lazily-initialized services
export const getFirebaseRemoteConfig = () => optionalServices.remoteConfig;
export const getFirebasePerformance = () => optionalServices.performance;
export const getFirebaseAnalytics = () => optionalServices.analytics;

// Backward-compatible named exports (remoteConfig is set synchronously at module init)
const remoteConfig = optionalServices.remoteConfig;

export { auth, firestore, storage, installations, app, remoteConfig };
