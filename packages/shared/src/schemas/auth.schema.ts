import { z } from 'zod';
import { PERMISSION_LIST, type Permission } from '../constants/permissions.js';
import { brandMembershipSchema } from './brand.schema.js';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Identity payload returned from /auth/me.
 *
 * Permissions are NOT included here — they're per-brand, so the API resolves
 * them once a brand context is established via the X-Brand-Id header.
 * The `/auth/context` endpoint returns the per-brand permission set.
 */
export const currentUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().nullable(),
  isActive: z.boolean(),
  isPlatformAdmin: z.boolean(),
  memberships: z.array(brandMembershipSchema),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

/**
 * Per-brand permission context. The frontend caches this per (userId, brandId)
 * and uses it to gate UI via the <Can> component.
 */
export const brandContextSchema = z.object({
  brandId: z.string().uuid(),
  role: z.string(),
  permissions: z.array(z.enum(PERMISSION_LIST as [Permission, ...Permission[]])),
});

export type BrandContext = z.infer<typeof brandContextSchema>;
