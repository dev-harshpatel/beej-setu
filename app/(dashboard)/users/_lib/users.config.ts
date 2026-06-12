import { ROLES, type Role } from "@/constants/roles.constants";

export const ROLE_BADGE: Record<Role, { label: string; className: string }> = {
  [ROLES.STAFF]:         { label: "Staff",          className: "bg-accent text-accent-foreground border-0" },
  [ROLES.DISPATCH_STAFF]:{ label: "Dispatch Staff",  className: "bg-accent text-accent-foreground border-0" },
  [ROLES.ADMIN]:         { label: "Admin",           className: "bg-foreground text-background border-0" },
  [ROLES.SUPER_ADMIN]:   { label: "Super Admin",     className: "bg-foreground text-background border-0" },
};

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.STAFF]:          "Staff",
  [ROLES.ADMIN]:          "Admin",
  [ROLES.SUPER_ADMIN]:    "Super Admin",
  [ROLES.DISPATCH_STAFF]: "Dispatch Staff",
};

// Which roles each role is allowed to manage in the UI.
// Server-side equivalent: lib/api/role-authorization.ts canManageRole().
export const MANAGEABLE_ROLES: Record<Role, Role[]> = {
  [ROLES.SUPER_ADMIN]:    [ROLES.ADMIN, ROLES.STAFF, ROLES.DISPATCH_STAFF],
  [ROLES.ADMIN]:          [ROLES.STAFF, ROLES.DISPATCH_STAFF],
  [ROLES.STAFF]:          [],
  [ROLES.DISPATCH_STAFF]: [],
};
