import type React from 'react';
import { useContext, useState, useEffect, createContext } from 'react';

import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { setSentryUser } from '@/sentry';
import { mapToAuthUser } from '@/shared/auth/supabaseAuth';

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
  redirectPathAfterLogin: string | null;
  setRedirectPathAfterLogin: (path: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  redirectPathAfterLogin: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setRedirectPathAfterLogin: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parse stored AuthUser from localStorage with shape validation. */
export function parseStoredAuthUser(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.uid !== 'string' || !UUID_RE.test(parsed.uid)) {
      return null;
    }
    return parsed as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const user = parseStoredAuthUser(localStorage.getItem('currentUser'));
    if (!user) localStorage.removeItem('currentUser');
    return user;
  });
  const [loading, setLoading] = useState(true);
  const [redirectPathAfterLogin, setRedirectPathAfterLogin] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // onAuthStateChange fires INITIAL_SESSION on mount — no need for getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      const authUser = user && UUID_RE.test(user.id) ? mapToAuthUser(user) : null;
      syncUserState(authUser, setCurrentUser);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    currentUser,
    loading,
    redirectPathAfterLogin,
    setRedirectPathAfterLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Sync auth user to localStorage and Sentry */
function syncUserState(
  user: AuthUser | null,
  setCurrentUser: (user: AuthUser | null) => void,
) {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setSentryUser({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    });
  } else {
    localStorage.removeItem('currentUser');
    setSentryUser(null);
  }
  setCurrentUser(user);
}
