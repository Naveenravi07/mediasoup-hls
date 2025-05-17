import { z } from 'zod';

export const loginProviders = z.enum(['github', 'email']);

export const createLocalUserRequestSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  pwd: z.string().min(4),
  provider: z.literal('email').default('email'),
  pfpUrl: z.string().nullable().optional(),
});

export const createGithubUserRequestSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  provider: z.literal('github').default('github'),
  pfpUrl: z.string().nullable(),
  githubId: z.string(),
});

export type CreateLocalUserRequest = z.infer<typeof createLocalUserRequestSchema>;
export type CreateGithubUserRequest = z.infer<typeof createGithubUserRequestSchema>;
