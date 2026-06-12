import { ROLES, type Role } from "@/constants/roles.constants";

const STAFF_ROLES: Role[] = [ROLES.STAFF, ROLES.DISPATCH_STAFF];

/**
 * Whether `actorRole` is allowed to manage (edit / delete / reset password of)
 * a user with `targetRole`. SUPER_ADMIN manages admins and staff;
 * ADMIN manages staff only.
 */
export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  const allowedTargetRoles: Role[] =
    actorRole === ROLES.SUPER_ADMIN
      ? [ROLES.ADMIN, ...STAFF_ROLES]
      : STAFF_ROLES;
  return allowedTargetRoles.includes(targetRole);
}
