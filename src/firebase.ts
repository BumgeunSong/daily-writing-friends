// src/firebase.ts
import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  UserCredential,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getPerformance } from 'firebase/performance';
import { getRemoteConfig } from 'firebase/remote-config';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Time constants
const TIME_CONSTANTS = {
  SECOND_IN_MS: 1000,
  MINUTE_IN_SECONDS: 60,
} as const;

// Remote Config fetch intervals
const REMOTE_CONFIG_INTERVALS = {
  DEVELOPMENT_MINUTES: 1,
  PRODUCTION_MINUTES: 5,
} as const;

const REMOTE_CONFIG_FETCH_INTERVALS = {
  DEVELOPMENT:
    REMOTE_CONFIG_INTERVALS.DEVELOPMENT_MINUTES *
    TIME_CONSTANTS.MINUTE_IN_SECONDS *
    TIME_CONSTANTS.SECOND_IN_MS,
  PRODUCTION:
    REMOTE_CONFIG_INTERVALS.PRODUCTION_MINUTES *
    TIME_CONSTANTS.MINUTE_IN_SECONDS *
    TIME_CONSTANTS.SECOND_IN_MS,
} as const;

// Default emulator configuration
const DEFAULT_EMULATOR_CONFIG = {
  HOST: 'localhost',
  PORTS: {
    AUTH: '9099',
    FIRESTORE: '8080',
    STORAGE: '9199',
    FUNCTIONS: '5001',
  },
  RADIX: 10, // For parseInt base
} as const;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
};

// Helper function to safely parse boolean from environment variables
const parseBoolean = (value: string | undefined): boolean => {
  if (typeof value !== 'string') return false;
  return value.toLowerCase() === 'true';
};

// Emulator configuration
const useEmulators = parseBoolean(import.meta.env.VITE_USE_EMULATORS);
const emulatorConfig = {
  auth: {
    host: import.meta.env.VITE_EMULATOR_AUTH_HOST || DEFAULT_EMULATOR_CONFIG.HOST,
    port: parseInt(
      import.meta.env.VITE_EMULATOR_AUTH_PORT || DEFAULT_EMULATOR_CONFIG.PORTS.AUTH,
      DEFAULT_EMULATOR_CONFIG.RADIX,
    ),
  },
  firestore: {
    host: import.meta.env.VITE_EMULATOR_FIRESTORE_HOST || DEFAULT_EMULATOR_CONFIG.HOST,
    port: parseInt(
      import.meta.env.VITE_EMULATOR_FIRESTORE_PORT || DEFAULT_EMULATOR_CONFIG.PORTS.FIRESTORE,
      DEFAULT_EMULATOR_CONFIG.RADIX,
    ),
  },
  storage: {
    host: import.meta.env.VITE_EMULATOR_STORAGE_HOST || DEFAULT_EMULATOR_CONFIG.HOST,
    port: parseInt(
      import.meta.env.VITE_EMULATOR_STORAGE_PORT || DEFAULT_EMULATOR_CONFIG.PORTS.STORAGE,
      DEFAULT_EMULATOR_CONFIG.RADIX,
    ),
  },
  functions: {
    host: import.meta.env.VITE_EMULATOR_FUNCTIONS_HOST || DEFAULT_EMULATOR_CONFIG.HOST,
    port: parseInt(
      import.meta.env.VITE_EMULATOR_FUNCTIONS_PORT || DEFAULT_EMULATOR_CONFIG.PORTS.FUNCTIONS,
      DEFAULT_EMULATOR_CONFIG.RADIX,
    ),
  },
};

if (useEmulators) {
  console.log('🧪 Firebase emulators enabled for development/testing');
  console.log('Emulator configuration:', emulatorConfig);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// Initialize analytics and performance only in production
let performance: any = null;
let analytics: any = null;
let remoteConfig: any = null;

if (!useEmulators && typeof window !== 'undefined') {
  try {
    performance = getPerformance(app);
    analytics = getAnalytics(app);
    remoteConfig = getRemoteConfig(app);

    // Configure Remote Config fetch interval based on environment
    // Reference: https://firebase.google.com/docs/remote-config/get-started?platform=web#rest_2
    const isDevelopment = import.meta.env.DEV;
    const fetchIntervalMs = isDevelopment
      ? REMOTE_CONFIG_FETCH_INTERVALS.DEVELOPMENT
      : REMOTE_CONFIG_FETCH_INTERVALS.PRODUCTION;

    remoteConfig.settings.minimumFetchIntervalMillis = fetchIntervalMs;

    console.log(
      `🔧 Remote Config fetch interval set to: ${fetchIntervalMs / TIME_CONSTANTS.SECOND_IN_MS} seconds (${isDevelopment ? 'development' : 'production'} mode)`,
    );
  } catch (error) {
    console.warn('Analytics/Performance services not available:', error);
  }
} else if (useEmulators) {
  // In emulator mode, Remote Config is not typically available
  // but we can still initialize it for testing purposes
  console.log('🧪 Remote Config disabled in emulator mode - using default values');
}

// Connect to Firebase emulators if enabled
if (useEmulators) {
  try {
    // Connect Auth emulator with warning suppression
    connectAuthEmulator(auth, `http://${emulatorConfig.auth.host}:${emulatorConfig.auth.port}`, {
      disableWarnings: true,
    });
    console.log(
      `🔐 Connected to Auth emulator at ${emulatorConfig.auth.host}:${emulatorConfig.auth.port}`,
    );

    // Connect Firestore emulator
    connectFirestoreEmulator(
      firestore,
      emulatorConfig.firestore.host,
      emulatorConfig.firestore.port,
    );
    console.log(
      `🔥 Connected to Firestore emulator at ${emulatorConfig.firestore.host}:${emulatorConfig.firestore.port}`,
    );

    // Connect Storage emulator
    connectStorageEmulator(storage, emulatorConfig.storage.host, emulatorConfig.storage.port);
    console.log(
      `📁 Connected to Storage emulator at ${emulatorConfig.storage.host}:${emulatorConfig.storage.port}`,
    );
  } catch (error) {
    console.error('Failed to connect to Firebase emulators:', error);
    console.warn('Make sure Firebase emulators are running: firebase emulators:start');
  }
}

// Configure Firebase Auth persistence
// Use localStorage for persistence to support Playwright state saving
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set Firebase Auth persistence:', error);
});

const isInKakaoInAppBrowser = () => {
  const userAgent = navigator.userAgent;
  return /KAKAOTALK/i.test(userAgent);
};

// Auth functions
const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    if (isInKakaoInAppBrowser()) {
      const currentUrl = window.location.href;
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
      throw new Error('카카오톡 인앱 브라우저에서는 구글 로그인을 할 수 없어요');
    }

    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Error during sign-in:', error);
    throw error;
  }
};

const signOutUser = (): Promise<void> => {
  return signOut(auth)
    .then(() => {
      // Sign-out successful.
    })
    .catch((error) => {
      console.error('Error during sign-out:', error);
      throw error;
    });
};

// E2E Testing authentication functions
// These functions are only used when emulators are enabled
const signInWithTestCredentials = async (
  email: string,
  password: string,
): Promise<UserCredential> => {
  if (!useEmulators) {
    throw new Error('Test credentials can only be used with Firebase emulators');
  }

  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Error during test sign-in:', error);
    throw error;
  }
};

const signInWithTestToken = async (customToken: string): Promise<UserCredential> => {
  if (!useEmulators) {
    throw new Error('Custom tokens can only be used with Firebase emulators');
  }

  try {
    return await signInWithCustomToken(auth, customToken);
  } catch (error) {
    console.error('Error during custom token sign-in:', error);
    throw error;
  }
};

// Export configuration flags for other modules
export const isUsingEmulators = useEmulators;
export const emulatorConfiguration = emulatorConfig;

export {
  auth,
  firestore,
  storage,
  app,
  performance,
  remoteConfig,
  analytics,
  signInWithGoogle,
  signOutUser,
  // E2E testing functions (only available when using emulators)
  signInWithTestCredentials,
  signInWithTestToken,
};
