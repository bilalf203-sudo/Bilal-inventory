'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  AllocateMoreInput,
  Article,
  AssignArticleToMarketplaceInput,
  RecordSaleInput,
  ReturnToWarehouseInput,
  SalesReportCommitInput,
  SalesReportCommitResult,
  SalesReportPreview,
  SalesReportPreviewInput,
  UndoSaleInput,
  UndoWarehouseSaleInput,
  UpdateSalePriceInput,
  WarehouseSaleInput,
} from '@bilal/shared';
import { apiPatch, apiPost } from '@/lib/api-client';
import { rollbackQueries } from '@/lib/optimistic';
import type { MarketplaceArticleWithStock } from '@/features/marketplaces/api';

type QC = ReturnType<typeof useQueryClient>;

// Query-key prefixes each mutation may touch. Invalidations are scoped to only
// the ones an operation actually changes, instead of blanket-refetching everything.
const MARKETPLACE_ARTICLES = ['marketplaces', 'articles'] as const;
const ARTICLES = ['articles'] as const;
const ARTICLE_LISTS = ['articles', 'collection'] as const;
const COLLECTIONS = ['collections'] as const;
const ANALYTICS = ['analytics'] as const;

/**
 * Assign/allocate move stock between the warehouse and a marketplace, so they
 * touch every view: marketplace stock, warehouse articles, collection counts
 * and analytics totals.
 */
function invalidateEverywhere(qc: QC) {
  qc.invalidateQueries({ queryKey: MARKETPLACE_ARTICLES });
  qc.invalidateQueries({ queryKey: ARTICLES });
  qc.invalidateQueries({ queryKey: COLLECTIONS });
  qc.invalidateQueries({ queryKey: ANALYTICS });
}

/** Cancels in-flight marketplace-article fetches and snapshots them for rollback. */
async function snapshotMarketplaceArticles(qc: QC) {
  await qc.cancelQueries({ queryKey: MARKETPLACE_ARTICLES });
  return qc.getQueriesData({ queryKey: MARKETPLACE_ARTICLES });
}

/** Optimistically rewrites one size's stock row on a marketplace article, in every cached list. */
function patchMarketplaceStock(
  qc: QC,
  marketplaceArticleId: string,
  size: string,
  patch: (s: MarketplaceArticleWithStock['stocks'][number]) => MarketplaceArticleWithStock['stocks'][number],
) {
  qc.setQueriesData<MarketplaceArticleWithStock[]>({ queryKey: MARKETPLACE_ARTICLES }, (old) =>
    old?.map((ma) =>
      ma.id === marketplaceArticleId
        ? { ...ma, stocks: ma.stocks.map((s) => (s.size === size ? patch(s) : s)) }
        : ma,
    ),
  );
}

/** Cancels in-flight article fetches and snapshots them for rollback. */
async function snapshotArticles(qc: QC) {
  await qc.cancelQueries({ queryKey: ARTICLES });
  return qc.getQueriesData({ queryKey: ARTICLES });
}

/** Optimistically rewrites one size on an article, in both its detail cache and every list. */
function patchArticleSize(
  qc: QC,
  articleId: string,
  size: string,
  patch: (s: Article['sizes'][number]) => Article['sizes'][number],
) {
  const patchSizes = (a: Article): Article => ({
    ...a,
    sizes: a.sizes.map((s) => (s.size === size ? patch(s) : s)),
  });
  qc.setQueryData<Article>(['articles', 'detail', articleId], (old) => (old ? patchSizes(old) : old));
  qc.setQueriesData<Article[]>({ queryKey: ARTICLE_LISTS }, (old) =>
    old?.map((a) => (a.id === articleId ? patchSizes(a) : a)),
  );
}

export function useAssignArticle() {
  const qc = useQueryClient();
  return useMutation({
    // Creates a new marketplace-article row (server-assigned id) — nothing safe to predict.
    mutationFn: (input: AssignArticleToMarketplaceInput) => apiPost('/inventory/assign', input),
    onSuccess: () => {
      invalidateEverywhere(qc);
      toast.success('Article assigned to marketplace');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAllocateMore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AllocateMoreInput) => apiPost('/inventory/allocate', input),
    onSuccess: () => {
      invalidateEverywhere(qc);
      toast.success('Stock allocated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSalePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSalePriceInput) => apiPatch('/inventory/sale-price', input),
    onMutate: async ({ marketplaceArticleId, salePrice }) => {
      const previous = await snapshotMarketplaceArticles(qc);
      qc.setQueriesData<MarketplaceArticleWithStock[]>({ queryKey: MARKETPLACE_ARTICLES }, (old) =>
        old?.map((ma) => (ma.id === marketplaceArticleId ? { ...ma, salePrice } : ma)),
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      rollbackQueries(qc, ctx?.previous);
      toast.error(e.message);
    },
    onSuccess: () => toast.success('Sale price updated'),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: MARKETPLACE_ARTICLES });
      qc.invalidateQueries({ queryKey: ANALYTICS });
    },
  });
}

export function useRecordSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordSaleInput) => apiPost('/inventory/sales', input),
    onMutate: async ({ marketplaceArticleId, size, quantity }) => {
      const previous = await snapshotMarketplaceArticles(qc);
      patchMarketplaceStock(qc, marketplaceArticleId, size, (s) => ({
        ...s,
        allocatedQuantity: Math.max(0, s.allocatedQuantity - quantity),
        soldQuantity: s.soldQuantity + quantity,
      }));
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      rollbackQueries(qc, ctx?.previous);
      toast.error(e.message);
    },
    onSuccess: () => toast.success('Sale recorded'),
    // Warehouse stock is untouched by a marketplace sale, so collections stay put.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: MARKETPLACE_ARTICLES });
      qc.invalidateQueries({ queryKey: ARTICLES });
      qc.invalidateQueries({ queryKey: ANALYTICS });
    },
  });
}

/** Records a sale made directly from the warehouse (not through a marketplace). */
export function useRecordWarehouseSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WarehouseSaleInput) => apiPost('/inventory/warehouse-sales', input),
    onMutate: async ({ articleId, size, quantity }) => {
      const previous = await snapshotArticles(qc);
      patchArticleSize(qc, articleId, size, (s) => ({
        ...s,
        warehouseQuantity: Math.max(0, s.warehouseQuantity - quantity),
        soldQuantity: s.soldQuantity + quantity,
      }));
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      rollbackQueries(qc, ctx?.previous);
      toast.error(e.message);
    },
    onSuccess: () => toast.success('Warehouse sale recorded'),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ARTICLES });
      qc.invalidateQueries({ queryKey: COLLECTIONS });
      qc.invalidateQueries({ queryKey: ANALYTICS });
    },
  });
}

/** Reverses a mistakenly recorded warehouse sale: units go back into warehouse stock. */
export function useUndoWarehouseSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UndoWarehouseSaleInput) =>
      apiPost('/inventory/warehouse-sales/undo', input),
    onMutate: async ({ articleId, size, quantity }) => {
      const previous = await snapshotArticles(qc);
      patchArticleSize(qc, articleId, size, (s) => ({
        ...s,
        warehouseQuantity: s.warehouseQuantity + quantity,
        soldQuantity: Math.max(0, s.soldQuantity - quantity),
      }));
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      rollbackQueries(qc, ctx?.previous);
      toast.error(e.message);
    },
    onSuccess: () => toast.success('Sale reversed — stock is back in the warehouse'),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ARTICLES });
      qc.invalidateQueries({ queryKey: COLLECTIONS });
      qc.invalidateQueries({ queryKey: ANALYTICS });
    },
  });
}

/** Reverses a mistakenly recorded sale: sold units go back to marketplace stock. */
export function useUndoSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UndoSaleInput) => apiPost('/inventory/sales/undo', input),
    onMutate: async ({ marketplaceArticleId, size, quantity }) => {
      const previous = await snapshotMarketplaceArticles(qc);
      patchMarketplaceStock(qc, marketplaceArticleId, size, (s) => ({
        ...s,
        allocatedQuantity: s.allocatedQuantity + quantity,
        soldQuantity: Math.max(0, s.soldQuantity - quantity),
      }));
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      rollbackQueries(qc, ctx?.previous);
      toast.error(e.message);
    },
    onSuccess: () => toast.success('Sale reversed — stock is back on the marketplace'),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: MARKETPLACE_ARTICLES });
      qc.invalidateQueries({ queryKey: ARTICLES });
      qc.invalidateQueries({ queryKey: ANALYTICS });
    },
  });
}

export function useReturnToWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReturnToWarehouseInput) => apiPost('/inventory/return', input),
    onMutate: async ({ marketplaceArticleId, size, quantity }) => {
      const previous = await snapshotMarketplaceArticles(qc);
      patchMarketplaceStock(qc, marketplaceArticleId, size, (s) => ({
        ...s,
        allocatedQuantity: Math.max(0, s.allocatedQuantity - quantity),
      }));
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      rollbackQueries(qc, ctx?.previous);
      toast.error(e.message);
    },
    onSuccess: () => toast.success('Stock returned to warehouse'),
    // Units re-enter the warehouse, so articles/collections/analytics all shift too.
    onSettled: () => invalidateEverywhere(qc),
  });
}

/** Diffs an uploaded stock snapshot against allocated stock — read-only preview. */
export function usePreviewSalesReport() {
  return useMutation({
    mutationFn: (input: SalesReportPreviewInput) =>
      apiPost<SalesReportPreview>('/inventory/sales-report/preview', input, { timeout: 120_000 }),
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Applies the confirmed deductions from a sale report. */
export function useCommitSalesReport() {
  const qc = useQueryClient();
  return useMutation({
    // A bulk deduction across many marketplace articles — refetch the affected views.
    mutationFn: (input: SalesReportCommitInput) =>
      apiPost<SalesReportCommitResult>('/inventory/sales-report/commit', input, {
        timeout: 120_000,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MARKETPLACE_ARTICLES });
      qc.invalidateQueries({ queryKey: ARTICLES });
      qc.invalidateQueries({ queryKey: ANALYTICS });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
