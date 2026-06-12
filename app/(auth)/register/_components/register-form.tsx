"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  registerOrganizationSchema,
  type RegisterOrganizationFormValues,
} from "@/lib/validators/organization.validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/form/password-input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ROUTES } from "@/constants/routes.constants";
import { cn } from "@/lib/utils";

export function RegisterForm({ className, ...props }: React.ComponentProps<"form">) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterOrganizationFormValues>({
    resolver: zodResolver(registerOrganizationSchema),
  });

  async function onSubmit(values: RegisterOrganizationFormValues) {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/register-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const json = await res.json();

      if (!res.ok) {
        const fieldErrors = json.errors as Record<string, string[]> | undefined;
        if (fieldErrors) {
          for (const [field, messages] of Object.entries(fieldErrors)) {
            setError(field as keyof RegisterOrganizationFormValues, {
              message: messages[0],
            });
          }
        }
        setServerError(json.message ?? "Registration failed. Please try again.");
        return;
      }

      router.push(`${ROUTES.AUTH.LOGIN}?registered=1`);
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className={cn("flex flex-col gap-4", className)}
      {...props}
    >
      <FieldGroup className="gap-3">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <h1 className="text-xl font-bold">Register your company</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Create your company workspace and admin account
          </p>
        </div>

        <Field data-invalid={!!errors.companyName}>
          <FieldLabel htmlFor="companyName">Company name</FieldLabel>
          <Input
            id="companyName"
            type="text"
            placeholder="Acme Seeds"
            autoComplete="organization"
            {...register("companyName")}
          />
          <FieldError errors={[errors.companyName]} />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field data-invalid={!!errors.adminName}>
            <FieldLabel htmlFor="adminName">Your name</FieldLabel>
            <Input
              id="adminName"
              type="text"
              placeholder="Full name"
              autoComplete="name"
              {...register("adminName")}
            />
            <FieldError errors={[errors.adminName]} />
          </Field>

          <Field data-invalid={!!errors.username}>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder="username"
              autoComplete="username"
              {...register("username")}
            />
            <FieldError errors={[errors.username]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>

          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <PasswordInput
              id="confirmPassword"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            <FieldError errors={[errors.confirmPassword]} />
          </Field>
        </div>

        {serverError && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </div>
        )}

        <Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating workspace…" : "Register company"}
          </Button>
        </Field>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={ROUTES.AUTH.LOGIN} className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
