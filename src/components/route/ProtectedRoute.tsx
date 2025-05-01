import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, redirectPathAfterLogin, setRedirectPathAfterLogin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser) {
      setRedirectPathAfterLogin(location.pathname);
    } else if (redirectPathAfterLogin) {
      setRedirectPathAfterLogin(null);
    }
  }, [currentUser, location.pathname, redirectPathAfterLogin, setRedirectPathAfterLogin]);

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (redirectPathAfterLogin) {
    return <Navigate to={redirectPathAfterLogin} />;
  }

  return <>{children}</>;
};
