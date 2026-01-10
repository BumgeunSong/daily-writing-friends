// src/firebase.ts

// Core Firebase imports (alphabetically ordered)
import { Analytics, getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, UserCredential } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getInstallations } from 'firebase/installations';
import { FirebasePerformance, getPerformance } from 'firebase/performance';
import { getRemoteConfig, RemoteConfig } from 'firebase/remote-config';
import { getStorage } from 'firebase/storage';

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

// Non-critical services (initialized conditionally)
let performance: FirebasePerformance | null = null;
let analytics: Analytics | null = null;
let remoteConfig: RemoteConfig | null = null;

const useEmulators = shouldUseEmulators();

if (!useEmulators && typeof window !== 'undefined') {
  try {
    remoteConfig = getRemoteConfig(app);
    configureRemoteConfig(remoteConfig);

    const scheduleIdleTask = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(callback, { timeout: 2000 });
      } else {
        setTimeout(callback, 1);
      }
    };

    scheduleIdleTask(() => {
      try {
        performance = getPerformance(app);
        analytics = getAnalytics(app);
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

export { auth, firestore, storage, installations, app, performance, remoteConfig, analytics };
