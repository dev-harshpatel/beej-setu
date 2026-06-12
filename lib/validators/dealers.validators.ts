import { z } from "zod";
import { toTitleCase } from "@/lib/utils/normalize";

const titleCaseField = (schema: z.ZodString) =>
  schema.transform(toTitleCase);

const nullableTitleCase = (schema: z.ZodString) =>
  schema.nullable().optional().transform((v) => (v ? toTitleCase(v) : v));

export const createDealerSchema = z.object({
  name:    titleCaseField(z.string().min(2, "Name must be at least 2 characters").max(100)),
  staffId: z.string().uuid("Invalid staff ID").nullable().optional(),
  contact: z
    .string()
    .max(200, "Contact is too long")
    .regex(/^[0-9+\-\s(),/]+$/, "Only digits, +, -, spaces, commas and () allowed")
    .optional()
    .nullable(),
  defaultTransport:           nullableTitleCase(z.string().max(100)),
  defaultDeliveryInstruction: z.string().max(500).nullable().optional(),
  deliveryInstruction:        z.string().max(500).nullable().optional(),
  territory:                  nullableTitleCase(z.string().max(100)),
  notes:                      z.string().max(1000).nullable().optional(),
});

export const updateDealerSchema = createDealerSchema.partial().extend({
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]).optional(),
});

export type CreateDealerFormValues = z.infer<typeof createDealerSchema>;
export type UpdateDealerFormValues = z.infer<typeof updateDealerSchema>;
