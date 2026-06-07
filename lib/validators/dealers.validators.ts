import { z } from "zod";

export const createDealerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  staffId: z.string().uuid("Invalid staff ID").nullable().optional(),
  contact: z
    .string()
    .max(200, "Contact is too long")
    .regex(/^[0-9+\-\s(),/]+$/, "Only digits, +, -, spaces, commas and () allowed")
    .optional()
    .nullable(),
  defaultTransport: z.string().max(100).nullable().optional(),
  defaultDeliveryInstruction: z.string().max(500).nullable().optional(),
  deliveryInstruction: z.string().max(500).nullable().optional(),
  territory: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateDealerSchema = createDealerSchema.partial().extend({
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]).optional(),
});

export type CreateDealerFormValues = z.infer<typeof createDealerSchema>;
export type UpdateDealerFormValues = z.infer<typeof updateDealerSchema>;
