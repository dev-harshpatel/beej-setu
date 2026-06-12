"use client";

import { useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/form/password-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { adminChangePasswordSchema } from "@/lib/validators/users.validators";
import { usersService } from "@/services/users.service";
import { getApiErrorMessage } from "@/lib/api-client";
import type { ProfileRow } from "@/types/database.types";
import { CurrentPasswordField } from "./current-password-field";

interface ChangePasswordDialogProps {
  user: ProfileRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ user, open, onOpenChange }: ChangePasswordDialogProps) {
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [success, setSuccess]                 = useState(false);
  const [resetKey, setResetKey]               = useState(0);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(false);
      setResetKey((k) => k + 1);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = adminChangePasswordSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }

    setSubmitting(true);
    try {
      await usersService.changePassword(user!.id, parsed.data.newPassword);
      setSuccess(true);
      setTimeout(() => handleOpenChange(false), 1200);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to update password"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4" />
            Change Password
          </DialogTitle>
          {user && (
            <p className="text-sm text-muted-foreground">
              Setting a new password for <span className="font-medium text-foreground">{user.name}</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup className="py-2">
            {user && (
              <CurrentPasswordField key={`${resetKey}-${user.id}`} userId={user.id} />
            )}

            <Field>
              <FieldLabel htmlFor="new-password">New Password</FieldLabel>
              <PasswordInput
                id="new-password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
              <PasswordInput
                id="confirm-password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>

            {error && (
              <div role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-accent/50 px-3 py-2 text-sm text-accent-foreground">
                Password updated successfully
              </div>
            )}
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || success}>
              {submitting ? "Saving…" : "Save Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
