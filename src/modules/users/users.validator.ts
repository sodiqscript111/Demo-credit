import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const userIdSchema = z.object({
  id: z.string().uuid(),
});
