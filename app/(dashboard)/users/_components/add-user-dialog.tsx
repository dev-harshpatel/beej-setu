"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, PlusIcon } from "lucide-react";
import {
  createUserSchema,
  type CreateUserFormValues,
} from "@/lib/validators/users.validators";
import { ROLES, type Role } from "@/constants/roles.constants";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

interface AddUserDialogProps {
  onSuccess: () => void;
}

const ROLE_LABELS: Record<Role, string> = {
  [ROLES.STAFF]: "Staff",
  [ROLES.ADMIN]: "Admin",
  [ROLES.SUPER_ADMIN]: "Super Admin",
};

export function AddUserDialog({ onSuccess }: AddUserDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const allowedRoles: Role[] = isSuperAdmin
    ? [ROLES.STAFF, ROLES.ADMIN, ROLES.SUPER_ADMIN]
    : [ROLES.STAFF, ROLES.ADMIN];

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: ROLES.STAFF },
  });

  const selectedRole = watch("role");

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
      setServerError(null);
      setShowPassword(false);
    }
    setOpen(next);
  }

  async function onSubmit(values: CreateUserFormValues) {
    setServerError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.errors) {
          const firstError = Object.values(
            json.errors as Record<string, string[]>,
          )[0]?.[0];
          setServerError(firstError ?? json.message);
        } else {
          setServerError(json.message ?? "Failed to create user");
        }
        return;
      }

      reset();
      setOpen(false);
      onSuccess();
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <PlusIcon className="size-4" />
        Add User
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup className="py-2">
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  placeholder="Jay Patel"
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="jay@example.com"
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <Field data-invalid={!!errors.username}>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  placeholder="jaypatel"
                  {...register("username")}
                />
                <FieldError errors={[errors.username]} />
              </Field>

              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="new-password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
                <FieldError errors={[errors.password]} />
              </Field>

              <Field data-invalid={!!errors.role}>
                <FieldLabel htmlFor="role">Role</FieldLabel>
                <Select
                  value={selectedRole}
                  onValueChange={(val) => setValue("role", val as Role)}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.role]} />
              </Field>

              {serverError && (
                <div
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {serverError}
                </div>
              )}
            </FieldGroup>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
