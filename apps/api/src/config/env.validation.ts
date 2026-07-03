import { z } from 'zod';

/**
 * Two run-modes:
 *
 *   - **Local dev** (AUTH_DRIVER=dev + STORAGE_DRIVER=local):
 *     plain Postgres + bypassed auth + on-disk image storage. Supabase vars not needed.
 *
 *   - **Production** (AUTH_DRIVER=supabase + STORAGE_DRIVER=supabase):
 *     Supabase Postgres + Supabase Auth (JWT) + Supabase Storage. All SUPABASE_* required.
 */
const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  AUTH_DRIVER: z.enum(['supabase', 'dev']).default('supabase'),
  STORAGE_DRIVER: z.enum(['supabase', 'local']).default('supabase'),

  DEV_USER_EMAIL: z.string().email().default('admin@dev.local'),

  LOCAL_STORAGE_DIR: z.string().default('./uploads'),
  LOCAL_STORAGE_BASE_URL: z.string().url().default('http://localhost:4000/uploads'),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_JWT_SECRET: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('article-images'),
});

const envSchema = baseSchema.superRefine((env, ctx) => {
  if (env.AUTH_DRIVER === 'supabase') {
    if (!env.SUPABASE_URL || !env.SUPABASE_JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SUPABASE_URL and SUPABASE_JWT_SECRET are required when AUTH_DRIVER=supabase',
        path: ['SUPABASE_URL'],
      });
    }
  }
  if (env.STORAGE_DRIVER === 'supabase') {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when STORAGE_DRIVER=supabase',
        path: ['SUPABASE_URL'],
      });
    }
  }
});

export type Env = z.infer<typeof baseSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error('Environment validation failed');
  }
  return result.data;
}
