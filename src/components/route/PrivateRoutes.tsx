import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";

export type PrivateFallback = "login" | "join";
export type RedirectAfterLogin = "originalFromUser" | "predefined";

interface PrivateRoutesProps {
  children: React.ReactNode;
  fallback: PrivateFallback;
  redirectAfterLogin: RedirectAfterLogin;
  predefinedPath?: string;
}

function getFallbackPath(fallback: PrivateFallback) {
  return fallback === "join" ? "/join" : "/login";
}

function FullScreenSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
    </div>
  );
}

export const PrivateRoutes = ({
  children,
  fallback,
  redirectAfterLogin,
  predefinedPath,
}: PrivateRoutesProps) => {
  const { currentUser, loading, redirectPathAfterLogin, setRedirectPathAfterLogin } = useAuth();
  const location = useLocation();

  // 로그인 전 원래 경로 저장
  useEffect(() => {
    if (!currentUser && !loading) {
      setRedirectPathAfterLogin(location.pathname);
    }
  }, [currentUser, loading, location.pathname, setRedirectPathAfterLogin]);

  if (loading) {
    return <FullScreenSpinner />;
  }

  if (!currentUser) {
    return <Navigate to={getFallbackPath(fallback)} replace />;
  }

  // 로그인 후 이동 경로 결정
  if (redirectAfterLogin === "predefined" && predefinedPath && redirectPathAfterLogin) {
    setRedirectPathAfterLogin(null);
    return <Navigate to={predefinedPath} replace />;
  }

  if (redirectAfterLogin === "originalFromUser" && redirectPathAfterLogin) {
    setRedirectPathAfterLogin(null);
    return <Navigate to={redirectPathAfterLogin} replace />;
  }

  return <>{children}</>;
}; 