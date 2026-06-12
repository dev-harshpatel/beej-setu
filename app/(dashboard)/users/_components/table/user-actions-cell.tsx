"use client";

import { KeyRoundIcon, Trash2Icon } from "lucide-react";
import type { ProfileRow } from "@/types/database.types";

interface UserActionsCellProps {
  user: ProfileRow;
  toggling: boolean;
  onToggleStatus: (user: ProfileRow) => void;
  onChangePassword: (user: ProfileRow) => void;
  onDelete: (user: ProfileRow) => void;
}

export function UserActionsCell({
  user, toggling, onToggleStatus, onChangePassword, onDelete,
}: UserActionsCellProps) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button
        onClick={() => onToggleStatus(user)}
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
        onClick={() => onChangePassword(user)}
        title="Change password"
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
      >
        <KeyRoundIcon className="size-3.5" />
      </button>
      <button
        onClick={() => onDelete(user)}
        title="Delete user"
        className="flex size-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2Icon className="size-3.5" />
      </button>
    </div>
  );
}
