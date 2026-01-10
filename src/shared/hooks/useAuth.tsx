// src/contexts/AuthContext.tsx
import React, { useContext, useState, useEffect, createContext } from 'react';

import { auth } from '@/firebase';
import { setSentryUser } from '@/sentry';
import { User as FirebaseUser } from 'firebase/auth';
interface AuthContextType {
  currentUser: FirebaseUser | null;
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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(() => {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [redirectPathAfterLogin, setRedirectPathAfterLogin] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        // Set user context in Sentry for error tracking
        setSentryUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      } else {
        localStorage.removeItem('currentUser');
        // Clear user context when logged out
        setSentryUser(null);
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    redirectPathAfterLogin,
    setRedirectPathAfterLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
