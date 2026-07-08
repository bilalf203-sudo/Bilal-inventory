import { z } from 'zod';
import { sizeEnumSchema } from './article.schema.js';

export const allocationItemSchema = z.object({
  size: sizeEnumSchema,
  quantity: z.coerce.number().int().nonnegative(),
});

export type AllocationItem = z.infer<typeof allocationItemSchema>;

export const assignArticleToMarketplaceSchema = z.object({
  articleId: z.string().uuid(),
  marketplaceId: z.string().uuid(),
  salePrice: z.coerce.number().positive(),
  allocations: z.array(allocationItemSchema),
});

export type AssignArticleToMarketplaceInput = z.infer<typeof assignArticleToMarketplaceSchema>;

export const allocateMoreSchema = z.object({
  marketplaceArticleId: z.string().uuid(),
  allocations: z
    .array(
      z.object({
        size: sizeEnumSchema,
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
});

export type AllocateMoreInput = z.infer<typeof allocateMoreSchema>;

export const updateSalePriceSchema = z.object({
  marketplaceArticleId: z.string().uuid(),
  salePrice: z.coerce.number().positive(),
});

export type UpdateSalePriceInput = z.infer<typeof updateSalePriceSchema>;

export const recordSaleSchema = z.object({
  marketplaceArticleId: z.string().uuid(),
  size: sizeEnumSchema,
  quantity: z.coerce.number().int().positive(),
  notes: z.string().max(500).optional(),
});

export type RecordSaleInput = z.infer<typeof recordSaleSchema>;

export const returnToWarehouseSchema = z.object({
  marketplaceArticleId: z.string().uuid(),
  size: sizeEnumSchema,
  quantity: z.coerce.number().int().positive(),
  notes: z.string().max(500).optional(),
});

export type ReturnToWarehouseInput = z.infer<typeof returnToWarehouseSchema>;

/** Reverses a mistakenly recorded sale: sold units go back to allocated stock. */
export const undoSaleSchema = z.object({
  marketplaceArticleId: z.string().uuid(),
  size: sizeEnumSchema,
  quantity: z.coerce.number().int().positive(),
  notes: z.string().max(500).optional(),
});

export type UndoSaleInput = z.infer<typeof undoSaleSchema>;

/** A sale made directly from the warehouse (not through a marketplace). */
export const warehouseSaleSchema = z.object({
  articleId: z.string().uuid(),
  size: sizeEnumSchema,
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
  notes: z.string().max(500).optional(),
});

export type WarehouseSaleInput = z.infer<typeof warehouseSaleSchema>;

/**
 * Reverses a mistakenly recorded warehouse sale. `unitPrice` should match the
 * price on the original sale so revenue totals stay accurate; it's optional
 * because the caller may not know it.
 */
export const undoWarehouseSaleSchema = z.object({
  articleId: z.string().uuid(),
  size: sizeEnumSchema,
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

export type UndoWarehouseSaleInput = z.infer<typeof undoWarehouseSaleSchema>;

// ---------------------------------------------------------------------------
// Daily sale report (per marketplace): upload a fresh stock snapshot, diff it
// against current allocated stock to learn how many pieces sold, then deduct.
// ---------------------------------------------------------------------------

/** One row of an uploaded sale report: `quantity` is the remaining stock now. */
export const salesReportRowSchema = z.object({
  sku: z.string().trim().min(1).max(120),
  size: sizeEnumSchema,
  quantity: z.coerce.number().int().min(0),
});

export type SalesReportRow = z.infer<typeof salesReportRowSchema>;

export const salesReportPreviewSchema = z.object({
  marketplaceId: z.string().uuid(),
  rows: z.array(salesReportRowSchema).min(1).max(20000),
});

export type SalesReportPreviewInput = z.infer<typeof salesReportPreviewSchema>;

/** One confirmed deduction: `quantity` is the number of pieces to subtract (sold). */
export const salesReportDeductionSchema = z.object({
  sku: z.string().trim().min(1).max(120),
  size: sizeEnumSchema,
  quantity: z.coerce.number().int().positive(),
});

export type SalesReportDeduction = z.infer<typeof salesReportDeductionSchema>;

export const salesReportCommitSchema = z.object({
  marketplaceId: z.string().uuid(),
  deductions: z.array(salesReportDeductionSchema).min(1).max(20000),
  notes: z.string().max(500).optional(),
});

export type SalesReportCommitInput = z.infer<typeof salesReportCommitSchema>;

export interface SalesReportPreviewItem {
  marketplaceArticleId: string;
  articleId: string;
  code: string;
  articleName: string;
  collectionName: string;
  size: z.infer<typeof sizeEnumSchema>;
  sku: string;
  currentAllocated: number;
  reportRemaining: number;
  willDeduct: number;
  note?: string;
}

export interface SalesReportPreview {
  marketplaceId: string;
  items: SalesReportPreviewItem[];
  totalToDeduct: number;
  matchedRows: number;
  unmatchedRows: number;
  unchangedRows: number;
}

export interface SalesReportCommitResult {
  applied: number;
  totalDeducted: number;
  skipped: number;
}

export const articleStockBreakdownSchema = z.object({
  articleId: z.string().uuid(),
  totals: z.array(
    z.object({
      size: sizeEnumSchema,
      total: z.number().int().nonnegative(),
      warehouseUnallocated: z.number().int().nonnegative(),
      isLowStock: z.boolean(),
    }),
  ),
  byMarketplace: z.array(
    z.object({
      marketplaceId: z.string().uuid(),
      marketplaceName: z.string(),
      marketplaceColor: z.string(),
      salePrice: z.number(),
      sizes: z.array(
        z.object({
          size: sizeEnumSchema,
          allocated: z.number().int().nonnegative(),
          sold: z.number().int().nonnegative(),
          isLowStock: z.boolean(),
        }),
      ),
    }),
  ),
});

export type ArticleStockBreakdown = z.infer<typeof articleStockBreakdownSchema>;
