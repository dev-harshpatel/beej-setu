"use client";

import { useAuthStore } from "@/store/auth.store";
import { ROLE_PERMISSIONS, type Permission } from "@/constants/roles.constants";

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  const permissions: Permission[] =
    user ? (ROLE_PERMISSIONS[user.role] ?? []) : [];

  function hasPermission(permission: Permission): boolean {
    return permissions.includes(permission);
  }

  function hasAnyPermission(required: Permission[]): boolean {
    return required.some((p) => permissions.includes(p));
  }

  function hasAllPermissions(required: Permission[]): boolean {
    return required.every((p) => permissions.includes(p));
  }

  return { permissions, hasPermission, hasAnyPermission, hasAllPermissions };
}
