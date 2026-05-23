"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from "@/lib/validators/settings.validators";
import { settingsService } from "@/services/settings.service";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

export function SettingsProfileForm() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { email: "", username: user?.username ?? "" },
  });

  async function onSubmit(values: UpdateProfileFormValues) {
    setServerError(null);
    setSuccess(false);
    try {
      const res = await settingsService.updateProfile(values);
      if (user) {
        setUser({
          ...user,
          username: res.profile.username,
          ...(res.email ? { email: res.email } : {}),
        });
      }
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const fieldErrors = e?.response?.data?.errors;
      if (fieldErrors) {
        const first = Object.values(fieldErrors)[0]?.[0];
        setServerError(first ?? "Failed to update profile");
      } else {
        setServerError(e?.response?.data?.message ?? "Failed to update profile");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="settings-email">New Email</FieldLabel>
          <Input
            id="settings-email"
            type="email"
            placeholder={user?.email ?? "you@example.com"}
            autoComplete="email"
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
          <p className="mt-1 text-xs text-muted-foreground">
            Leave blank to keep your current email.
          </p>
        </Field>

        <Field data-invalid={!!errors.username}>
          <FieldLabel htmlFor="settings-username">Username</FieldLabel>
          <Input
            id="settings-username"
            placeholder={user?.username ?? "yourhandle"}
            autoComplete="username"
            {...register("username")}
          />
          <FieldError errors={[errors.username]} />
          <p className="mt-1 text-xs text-muted-foreground">
            Lowercase letters, numbers, and underscores only.
          </p>
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
            Profile updated successfully.
          </div>
        )}
      </FieldGroup>

      <div className="mt-4">
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
