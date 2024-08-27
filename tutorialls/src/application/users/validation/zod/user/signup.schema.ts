import { z } from 'zod';

export const SignupSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
  })
  .required();

export type zodSignupSchema = z.infer<typeof SignupSchema>;
