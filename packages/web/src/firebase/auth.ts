// src/firebase/auth.ts

import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  UserCredential,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { ERROR_MESSAGES } from './constants';
import { isInKakaoInAppBrowser, shouldUseEmulators } from './utils';

/**
 * Configures Firebase Auth persistence
 */
export const configureAuthPersistence = async (auth: Auth): Promise<void> => {
  try {
    // Use localStorage for persistence to support Playwright state saving
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error('Failed to set Firebase Auth persistence:', error);
    throw error;
  }
};

/**
 * Handles Google sign-in with Kakao browser detection
 */
export const signInWithGoogle = async (
  auth: Auth,
  provider: GoogleAuthProvider,
): Promise<UserCredential> => {
  try {
    if (isInKakaoInAppBrowser()) {
      const currentUrl = window.location.href;
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
      throw new Error(ERROR_MESSAGES.KAKAO_BROWSER_LOGIN);
    }

    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Error during sign-in:', error);
    throw error;
  }
};

/**
 * Signs out the current user
 */
export const signOutUser = async (auth: Auth): Promise<void> => {
  try {
    await signOut(auth);
    // Sign-out successful
  } catch (error) {
    console.error('Error during sign-out:', error);
    throw error;
  }
};

/**
 * Signs in with test credentials (emulator only)
 */
export const signInWithTestCredentials = async (
  auth: Auth,
  email: string,
  password: string,
): Promise<UserCredential> => {
  if (!shouldUseEmulators()) {
    throw new Error(ERROR_MESSAGES.TEST_CREDENTIALS_EMULATOR_ONLY);
  }

  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Error during test sign-in:', error);
    throw error;
  }
};

/**
 * Signs in with custom token (emulator only)
 */
export const signInWithTestToken = async (
  auth: Auth,
  customToken: string,
): Promise<UserCredential> => {
  if (!shouldUseEmulators()) {
    throw new Error(ERROR_MESSAGES.CUSTOM_TOKEN_EMULATOR_ONLY);
  }

  try {
    return await signInWithCustomToken(auth, customToken);
  } catch (error) {
    console.error('Error during custom token sign-in:', error);
    throw error;
  }
};
