"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import {
  createUserSchema,
  type CreateUserFormValues,
} from "@/lib/validators/users.validators";
import { ROLES, type Role } from "@/constants/roles.constants";
import { useAuth } from "@/hooks/use-auth";
import { usersService } from "@/services/users.service";
import { getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/form/password-input";
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
import { ROLE_LABELS } from "../../_lib/users.config";

interface AddUserDialogProps {
  onSuccess: () => void;
}

export function AddUserDialog({ onSuccess }: AddUserDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const allowedRoles: Role[] = isSuperAdmin
    ? [ROLES.STAFF, ROLES.DISPATCH_STAFF, ROLES.ADMIN, ROLES.SUPER_ADMIN]
    : [ROLES.STAFF, ROLES.DISPATCH_STAFF, ROLES.ADMIN];

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
    }
    setOpen(next);
  }

  async function onSubmit(values: CreateUserFormValues) {
    setServerError(null);
    try {
      await usersService.create(values);
      reset();
      setOpen(false);
      onSuccess();
    } catch (err: unknown) {
      setServerError(getApiErrorMessage(err, "Failed to create user"));
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
                <FieldLabel htmlFor="email">Email <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
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
                <PasswordInput
                  id="new-password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("password")}
                />
                <FieldError errors={[errors.password]} />
              </Field>

              <Field data-invalid={!!errors.role}>
                <FieldLabel htmlFor="role">Role</FieldLabel>
                <Select
                  value={selectedRole}
                  onValueChange={(val) => val && setValue("role", val as CreateUserFormValues["role"])}
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

              {selectedRole === ROLES.STAFF && (
                <Field>
                  <FieldLabel htmlFor="territory">Territory</FieldLabel>
                  <Input
                    id="territory"
                    placeholder="Saurashtra"
                    {...register("territory")}
                  />
                </Field>
              )}

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
