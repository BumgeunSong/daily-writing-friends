import React from "react";

interface PublicRoutesProps {
  children: React.ReactNode;
}

export const PublicRoutes = ({ children }: PublicRoutesProps) => {
  return <>{children}</>;
}; 