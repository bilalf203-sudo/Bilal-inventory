import { z } from 'zod';

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Must be a valid hex color (e.g. #f57224)');

export const createMarketplaceSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  color: hexColorSchema.default('#3b82f6'),
});

export type CreateMarketplaceInput = z.infer<typeof createMarketplaceSchema>;

export const updateMarketplaceSchema = createMarketplaceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateMarketplaceInput = z.infer<typeof updateMarketplaceSchema>;

export const marketplaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type Marketplace = z.infer<typeof marketplaceSchema>;
