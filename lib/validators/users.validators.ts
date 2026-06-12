import { z } from "zod";
import { ROLES } from "@/constants/roles.constants";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.union([z.email("Enter a valid email"), z.literal(""), z.undefined()]).optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username too long")
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72),
  role: z.enum([ROLES.STAFF, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  territory: z.string().max(100).nullable().optional(),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

// Admin setting another user's password — no current-password check
// (that flow lives in settings.validators changePasswordSchema).
export const adminChangePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(72),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AdminChangePasswordFormValues = z.infer<typeof adminChangePasswordSchema>;
