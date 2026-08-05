import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export function ProtectedRoute() {
  const { authUser, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSkeleton />;

  if (!authUser || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile.isActive) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
