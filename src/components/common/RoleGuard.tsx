import { Navigate, Outlet } from "react-router-dom";
import { useRole } from "@/features/auth/AuthContext";
import type { UserRole } from "@/types";

export function RoleGuard({ allow }: { allow: UserRole[] }) {
  const role = useRole();
  if (!role || !allow.includes(role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Outlet />;
}
