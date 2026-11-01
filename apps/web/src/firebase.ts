// src/firebase.ts

import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

import { connectToEmulators } from './firebase/emulator';
import { createFirebaseConfig, shouldUseEmulators } from './firebase/utils';

const firebaseConfig = createFirebaseConfig();
const hasFirebaseConfig = Boolean(firebaseConfig.projectId);
const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;

const storage = app ? getStorage(app) : null;

if (!hasFirebaseConfig) {
  console.warn('Firebase config missing (projectId not set). Firebase services disabled.');
}

const useEmulators = shouldUseEmulators();

if (storage) {
  connectToEmulators(storage);
}

export const isUsingEmulators = useEmulators;

export { storage, app };
