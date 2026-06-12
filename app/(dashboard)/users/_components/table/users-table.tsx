"use client";

import { useState } from "react";
import { UserIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { ProfileRow } from "@/types/database.types";
import type { Role } from "@/constants/roles.constants";
import { ROLES } from "@/constants/roles.constants";
import { useUsersStore } from "@/store/users.store";
import { usersService } from "@/services/users.service";
import { formatDateMedium } from "@/lib/utils";
import { MANAGEABLE_ROLES } from "../../_lib/users.config";
import { UserRoleCell } from "./user-role-cell";
import { UserStatusCell } from "./user-status-cell";
import { UserActionsCell } from "./user-actions-cell";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";
import { ChangePasswordDialog } from "../dialogs/change-password-dialog";
import { DeleteUserDialog } from "../dialogs/delete-user-dialog";
import { UserBulkDeleteDialog } from "../dialogs/user-bulk-delete-dialog";

interface UsersTableProps {
  roles: Role[];
  showTerritory?: boolean;
  currentUserRole?: Role;
}

export function UsersTable({ roles, showTerritory = false, currentUserRole }: UsersTableProps) {
  const { users, loading, initialized, upsertUser, bulkRemoveUsers } = useUsersStore();

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
      const updated = await usersService.update(user.id, { isActive: !user.is_active });
      if (updated) upsertUser(updated);
    } catch {
      // silent — spinner clears, row stays unchanged (matches previous behavior)
    } finally {
      setTogglingId(null);
    }
  }

  async function handleChangeRole(user: ProfileRow, newRole: Role) {
    if (newRole === user.role) return;
    setChangingRoleId(user.id);
    try {
      const updated = await usersService.update(user.id, { role: newRole });
      if (updated) upsertUser(updated);
    } catch {
      // silent — see handleToggleStatus
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
      {showActions && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          entity="user"
          onClear={() => setSelectedIds(new Set())}
          onDelete={() => setBulkDeleteOpen(true)}
        />
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
              const editable = canManage(user.role as Role);
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
                    <UserRoleCell
                      user={user}
                      editable={editable}
                      currentUserRole={currentUserRole}
                      changing={changingRoleId === user.id}
                      onChangeRole={handleChangeRole}
                    />
                  </TableCell>
                  {showTerritory && (
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {user.territory ?? <span className="opacity-40">—</span>}
                    </TableCell>
                  )}
                  <TableCell className="hidden sm:table-cell">
                    <UserStatusCell isActive={!!user.is_active} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDateMedium(user.created_at)}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {editable && (
                        <UserActionsCell
                          user={user}
                          toggling={togglingId === user.id}
                          onToggleStatus={handleToggleStatus}
                          onChangePassword={(u) => { setPasswordTarget(u); setPasswordOpen(true); }}
                          onDelete={(u) => { setDeleteTarget(u); setDeleteOpen(true); }}
                        />
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
