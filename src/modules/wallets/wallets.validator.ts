import { z } from 'zod';

export const createWalletSchema = z.object({
  currency: z.string().min(3).max(10).optional(),
});

export const walletIdSchema = z.object({
  id: z.string().uuid(),
});

const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, 'Amount must be a valid positive number with up to 4 decimal places')
  .refine((v) => parseFloat(v) > 0, { message: 'Amount must be greater than 0' });

export const fundWalletSchema = z.object({
  amount: amountSchema,
});

export const withdrawWalletSchema = z.object({
  amount: amountSchema,
});
