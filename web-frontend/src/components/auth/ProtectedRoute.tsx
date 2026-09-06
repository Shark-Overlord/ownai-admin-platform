import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getPersistedLoginUser } from "@/lib/auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  if (!getPersistedLoginUser()) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{
          redirectTo: `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  return <>{children}</>;
}
