// src/firebase.ts
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  UserCredential,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getPerformance } from "firebase/performance";
import { getRemoteConfig } from "firebase/remote-config";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();
const performance = getPerformance(app);
const remoteConfig = getRemoteConfig(app);
const analytics = getAnalytics(app);

// Configure Firebase Auth persistence
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set Firebase Auth persistence:', error);
});

if (process.env.USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}

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

export { auth, firestore, signInWithGoogle, signOutUser, storage, app, performance, remoteConfig, analytics };