import { z } from 'zod';
import { sizeEnumSchema } from './article.schema.js';

/** One flat CSV row sent from the web app to the warehouse import endpoint. */
export const importRowSchema = z.object({
  collectionName: z.string().trim().min(1).max(120),
  articleName: z.string().trim().min(1).max(160),
  sku: z.string().trim().min(1).max(120),
  size: sizeEnumSchema,
  quantity: z.coerce.number().int().min(0).default(0),
  imageUrl: z.string().max(2000).nullable().optional(),
});

export type ImportRow = z.infer<typeof importRowSchema>;

export const importWarehouseSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(20000),
});

export type ImportWarehouseInput = z.infer<typeof importWarehouseSchema>;

export interface ImportResult {
  rowsReceived: number;
  collectionsCreated: number;
  collectionsMatched: number;
  articlesCreated: number;
  articlesUpdated: number;
  sizesCreated: number;
  sizesUpdated: number;
  duplicateSizes: number;
}
