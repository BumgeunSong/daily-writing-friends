import { useAuth } from '../../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, redirectPathAfterLogin, setRedirectPathAfterLogin } = useAuth();
  const location = useLocation();

  // If the user is not logged in, redirect to login and store the current path
  if (!currentUser) {
    setRedirectPathAfterLogin(location.pathname);
    return <Navigate to="/login" />;
  }

  // If the user is logged in but has a redirect path, navigate to it
  if (currentUser && redirectPathAfterLogin) {
    const redirectTo = redirectPathAfterLogin;
    setRedirectPathAfterLogin(null);
    return <Navigate to={redirectTo} />;
  }

  return children;
};
