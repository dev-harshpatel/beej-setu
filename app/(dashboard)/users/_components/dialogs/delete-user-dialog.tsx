"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ProfileRow } from "@/types/database.types";
import { useUsersStore } from "@/store/users.store";
import { usersService } from "@/services/users.service";
import { getApiErrorMessage } from "@/lib/api-client";

interface DeleteUserDialogProps {
  user: ProfileRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUserDialog({ user, open, onOpenChange }: DeleteUserDialogProps) {
  const { removeUser } = useUsersStore();
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) setError(null);
    onOpenChange(next);
  }

  async function handleDelete() {
    if (!user) return;
    setDeleting(true);
    setError(null);
    try {
      await usersService.remove(user.id);
      removeUser(user.id);
      handleOpenChange(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete user"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2Icon className="size-4 text-destructive" />
            Delete User
          </DialogTitle>
          {user && (
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{user.name}</span>? This cannot be undone. Their orders and data will be preserved.
            </p>
          )}
        </DialogHeader>

        {error && (
          <div role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
