"use client";

import { UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProfileRow } from "@/types/database.types";
import type { Role } from "@/constants/roles.constants";
import { ROLES } from "@/constants/roles.constants";
import { useUsersStore } from "@/store/users.store";

interface UsersTableProps {
  roles: Role[];
}

const ROLE_BADGE: Record<Role, { label: string; className: string }> = {
  [ROLES.STAFF]: {
    label: "Staff",
    className: "bg-accent text-accent-foreground border-0",
  },
  [ROLES.ADMIN]: {
    label: "Admin",
    className: "bg-foreground text-background border-0",
  },
  [ROLES.SUPER_ADMIN]: {
    label: "Super Admin",
    className: "bg-foreground text-background border-0",
  },
};

export function UsersTable({ roles }: UsersTableProps) {
  const { users, loading, initialized } = useUsersStore();

  const filtered = users.filter((u) => roles.includes(u.role as Role));

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <UserIcon className="size-8 opacity-40" />
        <p className="text-sm">No users found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="hidden md:table-cell">Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((user: ProfileRow) => {
            const badge = ROLE_BADGE[user.role as Role];
            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  @{user.username}
                </TableCell>
                <TableCell>
                  <Badge className={badge.className}>{badge.label}</Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    className={
                      user.is_active
                        ? "bg-accent text-accent-foreground border-0"
                        : "bg-muted text-muted-foreground border-0"
                    }
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
