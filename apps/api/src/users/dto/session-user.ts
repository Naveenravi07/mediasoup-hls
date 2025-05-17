import { z } from 'zod';

export const SessionUserSchema = z
  .object({
    email: z.string().email(),
    name: z.string(),
    id: z.string(),
  })
  .nullable();

export type SessionUser = z.infer<typeof SessionUserSchema>;
