import { z } from 'zod';
import { SIZES, type Size } from '../constants/sizes.js';

export const sizeEnumSchema = z.enum(SIZES as readonly [Size, ...Size[]]);

export const articleSizeInputSchema = z.object({
  size: sizeEnumSchema,
  sku: z.string().max(120).nullable().optional(),
  quantity: z.coerce.number().int().min(0),
});

export type ArticleSizeInput = z.infer<typeof articleSizeInputSchema>;

export const createArticleSchema = z.object({
  collectionId: z.string().uuid(),
  name: z.string().min(1).max(160),
  code: z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/, {
    message: 'Code must contain only letters, numbers, dashes or underscores',
  }),
  description: z.string().max(2000).optional(),
  purchasePrice: z.coerce.number().nonnegative(),
  imageUrl: z.string().url().nullable().optional(),
  sizes: z.array(articleSizeInputSchema).min(1, 'At least one size is required'),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = createArticleSchema.partial().omit({ collectionId: true });
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

export const articleSizeSchema = z.object({
  size: sizeEnumSchema,
  sku: z.string().nullable().optional(),
  warehouseQuantity: z.number().int().nonnegative(),
});

export const articleSchema = z.object({
  id: z.string().uuid(),
  collectionId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  purchasePrice: z.number(),
  imageUrl: z.string().nullable(),
  sizes: z.array(articleSizeSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Article = z.infer<typeof articleSchema>;
