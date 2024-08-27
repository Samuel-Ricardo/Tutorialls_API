import { z } from 'zod';

export const LoginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
  })
  .required();

export type zodLoginSchema = z.infer<typeof LoginSchema>;
