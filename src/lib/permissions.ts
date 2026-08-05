import type { UserRole } from "@/types";

export function canManageStaff(role: UserRole): boolean {
  return role === "admin";
}

export function canManageSettings(role: UserRole): boolean {
  return role === "admin";
}

export function canViewAuditLogs(role: UserRole): boolean {
  return role === "admin";
}

export function canManageCategories(role: UserRole): boolean {
  return role === "admin" || role === "talent_acquisition";
}
