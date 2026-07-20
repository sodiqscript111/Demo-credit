import { z } from "zod";

export const createTransferSchema = z.object({
  fromWalletId: z.string().uuid(),
  toWalletId: z.string().uuid(),
  amount: z
    .string()
    .regex(
      /^\d+(\.\d{1,4})?$/,
      "Amount must be a valid positive number with up to 4 decimal places",
    )
    .refine((v) => parseFloat(v) > 0, {
      message: "Amount must be greater than 0",
    }),
});

export const transferIdSchema = z.object({
  id: z.string().uuid(),
});
