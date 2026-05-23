import { z } from "zod";

export const createDealerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  staffId: z.string().uuid("Invalid staff ID").nullable().optional(),
  contact: z
    .string()
    .min(10, "Contact must be at least 10 digits")
    .max(15)
    .regex(/^[0-9+\-\s]+$/, "Enter a valid phone number"),
  defaultTransport: z.string().max(100).nullable().optional(),
  defaultDeliveryInstruction: z.string().max(500).nullable().optional(),
  deliveryInstruction: z.string().max(500).nullable().optional(),
  territory: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateDealerSchema = createDealerSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

export type CreateDealerFormValues = z.infer<typeof createDealerSchema>;
export type UpdateDealerFormValues = z.infer<typeof updateDealerSchema>;
