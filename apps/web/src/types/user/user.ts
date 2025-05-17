import { z } from 'zod';

export const loginProviders = z.enum(['github', 'email']);
export const UserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  id: z.string(),
  provider: loginProviders,
  pwd: z.string().optional(),
  pfpUrl: z.string().nullable().optional(),
});

export type User = z.infer<typeof UserSchema>;
