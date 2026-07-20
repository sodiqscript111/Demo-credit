import { z } from "zod";

export const ledgerQuerySchema = z.object({
  walletId: z.string().uuid(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});
