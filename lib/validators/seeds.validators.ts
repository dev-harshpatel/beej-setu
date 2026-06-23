import { z } from "zod";

export const createSeedSchema = z.object({
  cropId:        z.string().uuid("Invalid crop"),
  variety:       z.string().min(1, "Variety is required").max(100),
  packSize:      z.string().min(1, "Pack size is required").max(100),
  packetsPerBag: z.number().int().min(1, "Must be at least 1"),
});

export const updateSeedSchema = createSeedSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateSeedFormValues = z.infer<typeof createSeedSchema>;
export type UpdateSeedFormValues = z.infer<typeof updateSeedSchema>;
