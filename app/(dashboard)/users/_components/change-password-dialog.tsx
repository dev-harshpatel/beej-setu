"use client";

import { useState, useEffect } from "react";
import { EyeIcon, EyeOffIcon, KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { ProfileRow } from "@/types/database.types";

interface ChangePasswordDialogProps {
  user: ProfileRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ user, open, onOpenChange }: ChangePasswordDialogProps) {
  const [existingPassword, setExistingPassword] = useState<string | null | "loading" | "unavailable">("loading");
  const [newPassword, setNewPassword]           = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");
  const [showExisting, setShowExisting]         = useState(false);
  const [showNew, setShowNew]                   = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [submitting, setSubmitting]             = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [success, setSuccess]                   = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setExistingPassword("loading");
    fetch(`/api/users/${user.id}/password`)
      .then((r) => r.json())
      .then((json) => setExistingPassword(json.data?.password ?? "unavailable"))
      .catch(() => setExistingPassword("unavailable"));
  }, [open, user]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setExistingPassword("loading");
      setNewPassword("");
      setConfirmPassword("");
      setShowExisting(false);
      setShowNew(false);
      setShowConfirm(false);
      setError(null);
      setSuccess(false);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${user!.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "Failed to update password");
        return;
      }
      setSuccess(true);
      setTimeout(() => handleOpenChange(false), 1200);
    } catch {
      setError("Something went wrong. Please try again.");
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
          {user && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm">
              <span className="text-accent-foreground/70 shrink-0">Current:</span>
              <span className="font-mono font-medium text-accent-foreground tracking-wider flex-1">
                {existingPassword === "loading"
                  ? "—"
                  : existingPassword === "unavailable"
                  ? "Not on record"
                  : showExisting
                  ? existingPassword
                  : "••••••••"}
              </span>
              {existingPassword !== "loading" && existingPassword !== "unavailable" && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowExisting((v) => !v)}
                  className="shrink-0 text-accent-foreground/60 hover:text-accent-foreground transition-colors"
                >
                  {showExisting ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                </button>
              )}
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup className="py-2">
            <Field>
              <FieldLabel htmlFor="new-password">New Password</FieldLabel>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
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
