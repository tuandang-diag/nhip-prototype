import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthState";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="screen-message">Đang khôi phục phiên đăng nhập…</div>;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
