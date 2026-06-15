import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole: "ADMIN" | "UTILISATEUR";
}

export default function ProtectedRoute({
  children,
  allowedRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/select-role" replace />;
  }

  if (role !== allowedRole) {
    return <Navigate to="/select-role" replace />;
  }

  return <>{children}</>;
}
