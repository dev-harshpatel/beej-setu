"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginSchema, type LoginFormValues } from "@/lib/validators/auth.validators";
import { useAuthStore } from "@/store/auth.store";
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

export function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.message ?? "Invalid credentials. Please try again.");
        return;
      }

      const { user, session } = json.data;
      setAuth(user, session);
      router.push(ROUTES.DASHBOARD.ROOT);
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Sign in with your email or username
          </p>
        </div>

        {justRegistered && (
          <div
            role="status"
            className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground"
          >
            Company registered successfully — sign in with your new admin account.
          </div>
        )}

        <Field data-invalid={!!errors.identifier}>
          <FieldLabel htmlFor="identifier">Email or Username</FieldLabel>
          <Input
            id="identifier"
            type="text"
            placeholder="you@example.com or username"
            autoComplete="username"
            {...register("identifier")}
          />
          <FieldError errors={[errors.identifier]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
          </div>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>

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
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </Field>

        <p className="text-center text-sm text-muted-foreground">
          New company?{" "}
          <Link href={ROUTES.AUTH.REGISTER} className="font-medium text-foreground underline-offset-4 hover:underline">
            Register here
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
