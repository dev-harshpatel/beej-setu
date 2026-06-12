"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/lib/validators/settings.validators";
import { settingsService } from "@/services/settings.service";
import { getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/form/password-input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

export function SettingsPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    setServerError(null);
    setSuccess(false);
    try {
      await settingsService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
      setSuccess(true);
    } catch (err: unknown) {
      setServerError(getApiErrorMessage(err, "Failed to update password"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.currentPassword}>
          <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
          <PasswordInput
            id="current-password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register("currentPassword")}
          />
          <FieldError errors={[errors.currentPassword]} />
        </Field>

        <Field data-invalid={!!errors.newPassword}>
          <FieldLabel htmlFor="new-password">New Password</FieldLabel>
          <PasswordInput
            id="new-password"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("newPassword")}
          />
          <FieldError errors={[errors.newPassword]} />
        </Field>

        <Field data-invalid={!!errors.confirmNewPassword}>
          <FieldLabel htmlFor="confirm-password">Confirm New Password</FieldLabel>
          <PasswordInput
            id="confirm-password"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("confirmNewPassword")}
          />
          <FieldError errors={[errors.confirmNewPassword]} />
        </Field>

        {serverError && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground"
          >
            Password updated successfully.
          </div>
        )}
      </FieldGroup>

      <div className="mt-4">
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? "Updating…" : "Update Password"}
        </Button>
      </div>
    </form>
  );
}
