"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/lib/validators/settings.validators";
import { settingsService } from "@/services/settings.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

export function SettingsPasswordForm() {
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
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

  function toggleShow(field: keyof typeof show) {
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));
  }

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
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const fieldErrors = e?.response?.data?.errors;
      if (fieldErrors) {
        const first = Object.values(fieldErrors)[0]?.[0];
        setServerError(first ?? "Failed to update password");
      } else {
        setServerError(e?.response?.data?.message ?? "Failed to update password");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.currentPassword}>
          <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
          <div className="relative">
            <Input
              id="current-password"
              type={show.current ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-10"
              {...register("currentPassword")}
            />
            <ToggleVisibility
              visible={show.current}
              onToggle={() => toggleShow("current")}
            />
          </div>
          <FieldError errors={[errors.currentPassword]} />
        </Field>

        <Field data-invalid={!!errors.newPassword}>
          <FieldLabel htmlFor="new-password">New Password</FieldLabel>
          <div className="relative">
            <Input
              id="new-password"
              type={show.next ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              className="pr-10"
              {...register("newPassword")}
            />
            <ToggleVisibility
              visible={show.next}
              onToggle={() => toggleShow("next")}
            />
          </div>
          <FieldError errors={[errors.newPassword]} />
        </Field>

        <Field data-invalid={!!errors.confirmNewPassword}>
          <FieldLabel htmlFor="confirm-password">Confirm New Password</FieldLabel>
          <div className="relative">
            <Input
              id="confirm-password"
              type={show.confirm ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              className="pr-10"
              {...register("confirmNewPassword")}
            />
            <ToggleVisibility
              visible={show.confirm}
              onToggle={() => toggleShow("confirm")}
            />
          </div>
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

function ToggleVisibility({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
    >
      {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
    </button>
  );
}
