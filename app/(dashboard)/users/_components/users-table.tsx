"use client";

import { useState } from "react";
import { UserIcon, KeyRoundIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { ProfileRow } from "@/types/database.types";
import type { Role } from "@/constants/roles.constants";
import { ROLES } from "@/constants/roles.constants";
import { useUsersStore } from "@/store/users.store";
import { ChangePasswordDialog } from "./change-password-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import { UserBulkDeleteDialog } from "./user-bulk-delete-dialog";

interface UsersTableProps {
  roles: Role[];
  showTerritory?: boolean;
  currentUserRole?: Role;
}

const ROLE_BADGE: Record<Role, { label: string; className: string }> = {
  [ROLES.STAFF]:         { label: "Staff",          className: "bg-accent text-accent-foreground border-0" },
  [ROLES.DISPATCH_STAFF]:{ label: "Dispatch Staff",  className: "bg-accent text-accent-foreground border-0" },
  [ROLES.ADMIN]:         { label: "Admin",           className: "bg-foreground text-background border-0" },
  [ROLES.SUPER_ADMIN]:   { label: "Super Admin",     className: "bg-foreground text-background border-0" },
};

const MANAGEABLE_ROLES: Record<Role, Role[]> = {
  [ROLES.SUPER_ADMIN]:    [ROLES.ADMIN, ROLES.STAFF, ROLES.DISPATCH_STAFF],
  [ROLES.ADMIN]:          [ROLES.STAFF, ROLES.DISPATCH_STAFF],
  [ROLES.STAFF]:          [],
  [ROLES.DISPATCH_STAFF]: [],
};

export function UsersTable({ roles, showTerritory = false, currentUserRole }: UsersTableProps) {
  const { users, loading, initialized, upsertUser, removeUser, bulkRemoveUsers } = useUsersStore();

  const [passwordTarget, setPasswordTarget] = useState<ProfileRow | null>(null);
  const [passwordOpen, setPasswordOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState<ProfileRow | null>(null);
  const [deleteOpen, setDeleteOpen]         = useState(false);
  const [togglingId, setTogglingId]         = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const filtered = users.filter((u) => roles.includes(u.role as Role));

  function canManage(targetRole: Role): boolean {
    if (!currentUserRole) return false;
    return (MANAGEABLE_ROLES[currentUserRole] ?? []).includes(targetRole);
  }

  const showActions    = !!currentUserRole && ([ROLES.SUPER_ADMIN, ROLES.ADMIN] as Role[]).includes(currentUserRole);
  const manageable     = filtered.filter((u) => canManage(u.role as Role));
  const allSelected    = manageable.length > 0 && manageable.every((u) => selectedIds.has(u.id));
  const someSelected   = manageable.some((u) => selectedIds.has(u.id));

  function toggleAll(checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) manageable.forEach((u) => next.add(u.id));
    else         manageable.forEach((u) => next.delete(u.id));
    setSelectedIds(next);
  }

  function toggleOne(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  }

  async function handleToggleStatus(user: ProfileRow) {
    setTogglingId(user.id);
    try {
      const res  = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.is_active }),
      });
      const json = await res.json();
      if (res.ok && json.data) upsertUser(json.data);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleChangeRole(user: ProfileRow, newRole: Role) {
    if (newRole === user.role) return;
    setChangingRoleId(user.id);
    try {
      const res  = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (res.ok && json.data) upsertUser(json.data);
    } finally {
      setChangingRoleId(null);
    }
  }

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
    <>
      {/* Bulk action bar */}
      {showActions && selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 mb-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
          <span className="font-medium text-destructive">
            {selectedIds.size} user{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2Icon className="size-3.5" />
              Delete {selectedIds.size}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {showActions && manageable.length > 0 && (
                <TableHead className="w-8 pl-3">
                  <span onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onCheckedChange={toggleAll}
                    />
                  </span>
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              {showTerritory && <TableHead className="hidden sm:table-cell">Territory</TableHead>}
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              {showActions && <TableHead className="w-24 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user: ProfileRow) => {
              const badge    = ROLE_BADGE[user.role as Role];
              const editable = canManage(user.role as Role);
              const toggling = togglingId === user.id;
              const checked  = selectedIds.has(user.id);

              return (
                <TableRow key={user.id}>
                  {showActions && manageable.length > 0 && (
                    <TableCell className="w-8 pl-3" onClick={(e) => e.stopPropagation()}>
                      {editable && (
                        <Checkbox checked={checked} onCheckedChange={(c) => toggleOne(user.id, c)} />
                      )}
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">@{user.username}</TableCell>
                  <TableCell>
                    {editable && currentUserRole ? (
                      <Select
                        value={user.role}
                        onValueChange={(v) => handleChangeRole(user, v as Role)}
                        disabled={changingRoleId === user.id}
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
                    ) : (
                      <Badge className={badge?.className}>{badge?.label ?? user.role}</Badge>
                    )}
                  </TableCell>
                  {showTerritory && (
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {user.territory ?? <span className="opacity-40">—</span>}
                    </TableCell>
                  )}
                  <TableCell className="hidden sm:table-cell">
                    <Badge className={user.is_active ? "bg-accent text-accent-foreground border-0" : "bg-muted text-muted-foreground border-0"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {editable && (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={toggling}
                            title={user.is_active ? "Deactivate user" : "Activate user"}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                              user.is_active
                                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                : "bg-accent text-accent-foreground hover:bg-accent/80"
                            }`}
                          >
                            {toggling ? "…" : user.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => { setPasswordTarget(user); setPasswordOpen(true); }}
                            title="Change password"
                            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <KeyRoundIcon className="size-3.5" />
                          </button>
                          <button
                            onClick={() => { setDeleteTarget(user); setDeleteOpen(true); }}
                            title="Delete user"
                            className="flex size-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ChangePasswordDialog
        user={passwordTarget}
        open={passwordOpen}
        onOpenChange={(open) => { setPasswordOpen(open); if (!open) setPasswordTarget(null); }}
      />
      <DeleteUserDialog
        user={deleteTarget}
        open={deleteOpen}
        onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteTarget(null); }}
      />
      <UserBulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        count={selectedIds.size}
        ids={[...selectedIds]}
        onSuccess={(ids) => { bulkRemoveUsers(ids); setSelectedIds(new Set()); }}
      />
    </>
  );
}
