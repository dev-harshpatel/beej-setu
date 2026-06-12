"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ProfileRow } from "@/types/database.types";
import type { Role } from "@/constants/roles.constants";
import { ROLE_BADGE, MANAGEABLE_ROLES } from "../../_lib/users.config";

interface UserRoleCellProps {
  user: ProfileRow;
  editable: boolean;
  currentUserRole?: Role;
  changing: boolean;
  onChangeRole: (user: ProfileRow, role: Role) => void;
}

export function UserRoleCell({ user, editable, currentUserRole, changing, onChangeRole }: UserRoleCellProps) {
  const badge = ROLE_BADGE[user.role as Role];

  if (editable && currentUserRole) {
    return (
      <Select
        value={user.role}
        onValueChange={(v) => onChangeRole(user, v as Role)}
        disabled={changing}
      >
        <SelectTrigger className="h-7 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(MANAGEABLE_ROLES[currentUserRole] ?? []).map((r) => (
            <SelectItem key={r} value={r} className="text-xs">
              {ROLE_BADGE[r]?.label ?? r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return <Badge className={badge?.className}>{badge?.label ?? user.role}</Badge>;
}
