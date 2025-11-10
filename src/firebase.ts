// src/firebase.ts
import { UserCredential } from 'firebase/auth';

// Import individual initialization functions for direct use
import { createFirebaseConfig, shouldUseEmulators, createEmulatorConfig } from './firebase/utils';
import { connectToEmulators } from './firebase/emulator';
import { configureAuthPersistence } from './firebase/auth';
import { configureRemoteConfig } from './firebase/remote-config';

// Core Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';
import { getRemoteConfig } from 'firebase/remote-config';
import { getInstallations } from 'firebase/installations';

// Initialize Firebase app
const firebaseConfig = createFirebaseConfig();
const app = initializeApp(firebaseConfig);

// Initialize critical services only
const auth = getAuth(app);
const firestore = getFirestore(app);
const provider = new GoogleAuthProvider();

// Lazy-loaded non-critical services (initialized on first use)
let _storage: ReturnType<typeof getStorage> | null = null;
let _installations: ReturnType<typeof getInstallations> | null = null;
let performance: any = null;
let analytics: any = null;
let remoteConfig: any = null;

const useEmulators = shouldUseEmulators();

function createLazyStorage() {
  if (useEmulators) {
    return getStorage(app);
  }

  return new Proxy({} as ReturnType<typeof getStorage>, {
    get(target, prop) {
      if (!_storage) {
        _storage = getStorage(app);
      }
      return (_storage as any)[prop];
    },
    set(target, prop, value) {
      if (!_storage) {
        _storage = getStorage(app);
      }
      (_storage as any)[prop] = value;
      return true;
    },
  });
}

function createLazyInstallations() {
  if (useEmulators) {
    return getInstallations(app);
  }

  return new Proxy({} as ReturnType<typeof getInstallations>, {
    get(target, prop) {
      if (!_installations) {
        _installations = getInstallations(app);
      }
      return (_installations as any)[prop];
    },
    set(target, prop, value) {
      if (!_installations) {
        _installations = getInstallations(app);
      }
      (_installations as any)[prop] = value;
      return true;
    },
  });
}

export const storage = createLazyStorage();
export const installations = createLazyInstallations();

if (!useEmulators && typeof window !== 'undefined') {
  try {
    remoteConfig = getRemoteConfig(app);
    configureRemoteConfig(remoteConfig);

    const scheduleIdleTask = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(callback, { timeout: 2000 });
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

// Import and re-export auth functions with Firebase services injected
import {
  signInWithGoogle as googleSignIn,
  signOutUser as userSignOut,
  signInWithTestCredentials as testCredentialsSignIn,
  signInWithTestToken as testTokenSignIn,
} from './firebase/auth';

// Auth function wrappers that use our initialized services
export const signInWithGoogle = (): Promise<UserCredential> => googleSignIn(auth, provider);
export const signOutUser = (): Promise<void> => userSignOut(auth);
export const signInWithTestCredentials = (
  email: string,
  password: string,
): Promise<UserCredential> => testCredentialsSignIn(auth, email, password);
export const signInWithTestToken = (customToken: string): Promise<UserCredential> =>
  testTokenSignIn(auth, customToken);

export { auth, firestore, app, performance, remoteConfig, analytics };
