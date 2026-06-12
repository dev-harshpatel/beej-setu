import { z } from "zod";

export const registerOrganizationSchema = z
  .object({
    companyName: z.string().min(2, "Company name must be at least 2 characters").max(100),
    adminName: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.email("Enter a valid email"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username too long")
      .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(72),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterOrganizationFormValues = z.infer<typeof registerOrganizationSchema>;

// Logo changes go through the dedicated upload endpoint
// (/api/settings/organization/logo) — never as a free-form URL.
export const updateOrganizationSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters").max(100),
});

export type UpdateOrganizationFormValues = z.infer<typeof updateOrganizationSchema>;
