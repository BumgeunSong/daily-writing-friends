// src/contexts/AuthContext.tsx
import { User } from 'firebase/auth';
import React, { useContext, useState, useEffect, createContext } from 'react';

import { auth } from '../firebase';
interface AuthContextType {
  currentUser: any;
  loading: boolean;
  redirectPathAfterLogin: string | null;
  setRedirectPathAfterLogin: (path: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  redirectPathAfterLogin: null,
  setRedirectPathAfterLogin: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectPathAfterLogin, setRedirectPathAfterLogin] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
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
