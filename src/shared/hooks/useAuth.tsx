import type React from 'react';
import { useContext, useState, useEffect, createContext } from 'react';

import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { setSentryUser } from '@/sentry';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [redirectPathAfterLogin, setRedirectPathAfterLogin] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user ? mapToAuthUser(session.user) : null;
      syncUserState(authUser, setCurrentUser);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ? mapToAuthUser(session.user) : null;
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

/** Map a Supabase User to our backward-compatible AuthUser */
function mapToAuthUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AuthUser {
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: (user.user_metadata?.full_name as string) ?? null,
    photoURL: (user.user_metadata?.avatar_url as string) ?? null,
  };
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
