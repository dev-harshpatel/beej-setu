import { z } from "zod";
import { ROLES } from "@/constants/roles.constants";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
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
