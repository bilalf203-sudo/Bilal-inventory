import { z } from 'zod';
import { ROLE_LIST, type RoleName } from '../constants/roles.js';

export const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers and dashes only');

export const createBrandSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema,
  description: z.string().max(1000).optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = createBrandSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

export const brandSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Brand = z.infer<typeof brandSchema>;

export const brandMembershipSchema = z.object({
  brandId: z.string().uuid(),
  brand: brandSchema,
  role: z.enum(ROLE_LIST as [RoleName, ...RoleName[]]),
});

export type BrandMembership = z.infer<typeof brandMembershipSchema>;

export const inviteBrandMemberSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid(),
});

export type InviteBrandMemberInput = z.infer<typeof inviteBrandMemberSchema>;

export const updateBrandMemberRoleSchema = z.object({
  roleId: z.string().uuid(),
});

export type UpdateBrandMemberRoleInput = z.infer<typeof updateBrandMemberRoleSchema>;
