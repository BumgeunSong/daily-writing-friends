import type React from 'react';
import { useContext, useState, useEffect, useRef, createContext } from 'react';

// eslint-disable-next-line no-restricted-imports -- 기존 위반: external/ 레이어로 이관 예정인 raw 접근
import { getSupabaseClient } from '@/shared/external/supabaseClient';
import { setSentryUser } from '@/sentry';
import {
  currentUserOf,
  initialAuthState,
  isAuthLoading,
  resolvedAuthState,
  verifiedUserOf,
  type AuthState,
} from '@/shared/auth/authState';
import type { AuthUser } from '@/shared/auth/authTypes';
import { mapToAuthUser } from '@/shared/auth/supabaseAuth';
import { STORAGE_KEYS, storage } from '@/shared/lib/storage';
import { UUID_RE, parseStoredAuthUser } from '@/shared/utils/authUserParser';
import { createUserIfNotExists } from '@/user/external/user.api';

export type { AuthUser } from '@/shared/auth/authTypes';
export type { AuthState } from '@/shared/auth/authState';

interface AuthContextType {
  /** The authoritative auth state; prefer this in new code. */
  authState: AuthState;
  /** Derived from authState: cached-or-verified identity, for display. */
  currentUser: AuthUser | null;
  /** Derived from authState: identity only when the session is verified. Gates read this. */
  verifiedUser: AuthUser | null;
  /** Derived from authState: whether Supabase verification is still pending. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  authState: { status: 'checking' },
  currentUser: null,
  verifiedUser: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const cachedUser = parseStoredAuthUser(storage.get(STORAGE_KEYS.CURRENT_USER));
    if (!cachedUser) storage.remove(STORAGE_KEYS.CURRENT_USER);
    return initialAuthState(cachedUser);
  });
  const userCreationAttempted = useRef(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // onAuthStateChange fires INITIAL_SESSION on mount — no need for getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      const authUser = user && UUID_RE.test(user.id) ? mapToAuthUser(user) : null;
      // Create user on actual sign-ins and initial session restore (OAuth redirect)
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && authUser && !userCreationAttempted.current) {
        userCreationAttempted.current = true;
        createUserIfNotExists(authUser).catch((error) => {
          console.error(error);
          userCreationAttempted.current = false;
        });
      }
      // Reset flag on sign-out so a different user can trigger creation
      if (!authUser) {
        userCreationAttempted.current = false;
      }
      syncUserState(authUser);
      setAuthState(resolvedAuthState(authUser));
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    authState,
    currentUser: currentUserOf(authState),
    verifiedUser: verifiedUserOf(authState),
    loading: isAuthLoading(authState),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Sync auth user to localStorage and Sentry */
function syncUserState(user: AuthUser | null) {
  if (user) {
    // codeql[js/clear-text-storage-of-sensitive-data]: Same cold-start auth cache
    // as the pre-adapter `localStorage.setItem` call this replaced. Supabase issues
    // the real session via httpOnly cookies; this only persists {uid, email,
    // displayName, photoURL} for first-paint identity.
    storage.set(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    setSentryUser({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    });
  } else {
    storage.remove(STORAGE_KEYS.CURRENT_USER);
    setSentryUser(null);
  }
}
