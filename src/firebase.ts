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

// Initialize core services
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();
const installations = getInstallations(app);

// Initialize optional services (analytics, performance, remote config)
const useEmulators = shouldUseEmulators();
let performance: any = null;
let analytics: any = null;
let remoteConfig: any = null;

if (!useEmulators && typeof window !== 'undefined') {
  try {
    performance = getPerformance(app);
    analytics = getAnalytics(app);
    remoteConfig = getRemoteConfig(app);

    // Configure Remote Config
    configureRemoteConfig(remoteConfig);
  } catch (error) {
    console.warn('Analytics/Performance services not available:', error);
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

export { auth, firestore, storage, app, performance, remoteConfig, analytics, installations };
