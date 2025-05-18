import { useEffect, useRef, useState } from "react";
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from '@/shared/hooks/useAuth';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="size-12 animate-spin rounded-full border-b-2 border-gray-900" />
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
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  const hasRedirected = useRef(false);

  // 로그인 전 원래 경로 저장
  useEffect(() => {
    if (!currentUser && !loading) {
      setRedirectPathAfterLogin(location.pathname);
    }
  }, [currentUser, loading, location.pathname, setRedirectPathAfterLogin]);

  // 로그인 후 이동 경로 결정 (side effect로 분리)
  useEffect(() => {
    if (!hasRedirected.current) {
      if (
        redirectAfterLogin === "predefined" && predefinedPath && redirectPathAfterLogin
      ) {
        setRedirectTarget(predefinedPath);
        setRedirectPathAfterLogin(null);
        hasRedirected.current = true;
      } else if (
        redirectAfterLogin === "originalFromUser" && redirectPathAfterLogin
      ) {
        setRedirectTarget(redirectPathAfterLogin);
        setRedirectPathAfterLogin(null);
        hasRedirected.current = true;
      }
    }
  }, [redirectAfterLogin, predefinedPath, redirectPathAfterLogin, setRedirectPathAfterLogin]);

  if (loading) {
    return <FullScreenSpinner />;
  }

  if (!currentUser) {
    return <Navigate to={getFallbackPath(fallback)} replace />;
  }

  if (redirectTarget) {
    return <Navigate to={redirectTarget} replace />;
  }

  return <>{children}</>;
}; 