import type React from 'react';
import { useContext, useState, useEffect, useRef, createContext } from 'react';

import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { setSentryUser } from '@/sentry';
import { mapToAuthUser } from '@/shared/auth/supabaseAuth';
import { STORAGE_KEYS, storage } from '@/shared/lib/storage';
import { UUID_RE, parseStoredAuthUser } from '@/shared/utils/authUserParser';
import { createUserIfNotExists } from '@/user/api/user';

/**
 * AuthUser is a backward-compatible wrapper around Supabase User.
 * It maps Supabase fields to the same interface Firebase had,
 * so 30+ consumer files can keep using `currentUser.uid` unchanged.
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const user = parseStoredAuthUser(storage.get(STORAGE_KEYS.CURRENT_USER));
    if (!user) storage.remove(STORAGE_KEYS.CURRENT_USER);
    return user;
  });
  const [loading, setLoading] = useState(true);
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
      syncUserState(authUser, setCurrentUser);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    currentUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Sync auth user to localStorage and Sentry */
function syncUserState(
  user: AuthUser | null,
  setCurrentUser: (user: AuthUser | null) => void,
) {
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
  setCurrentUser(user);
}
