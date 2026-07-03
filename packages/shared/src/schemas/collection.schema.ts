import { z } from 'zod';

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export const updateCollectionSchema = createCollectionSchema.partial();
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

export const collectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  articleCount: z.number().int().nonnegative().optional(),
});

export type Collection = z.infer<typeof collectionSchema>;
