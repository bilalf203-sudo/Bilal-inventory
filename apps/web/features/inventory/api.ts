'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  AllocateMoreInput,
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

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['articles'] });
  qc.invalidateQueries({ queryKey: ['marketplaces'] });
  qc.invalidateQueries({ queryKey: ['collections'] });
  qc.invalidateQueries({ queryKey: ['analytics'] });
}

export function useAssignArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignArticleToMarketplaceInput) => apiPost('/inventory/assign', input),
    onSuccess: () => {
      invalidateAll(qc);
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
      invalidateAll(qc);
      toast.success('Stock allocated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSalePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSalePriceInput) => apiPatch('/inventory/sale-price', input),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Sale price updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRecordSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordSaleInput) => apiPost('/inventory/sales', input),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Sale recorded');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Records a sale made directly from the warehouse (not through a marketplace). */
export function useRecordWarehouseSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WarehouseSaleInput) => apiPost('/inventory/warehouse-sales', input),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Warehouse sale recorded');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Reverses a mistakenly recorded warehouse sale: units go back into warehouse stock. */
export function useUndoWarehouseSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UndoWarehouseSaleInput) =>
      apiPost('/inventory/warehouse-sales/undo', input),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Sale reversed — stock is back in the warehouse');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Reverses a mistakenly recorded sale: sold units go back to marketplace stock. */
export function useUndoSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UndoSaleInput) => apiPost('/inventory/sales/undo', input),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Sale reversed — stock is back on the marketplace');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReturnToWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReturnToWarehouseInput) => apiPost('/inventory/return', input),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Stock returned to warehouse');
    },
    onError: (e: Error) => toast.error(e.message),
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
    mutationFn: (input: SalesReportCommitInput) =>
      apiPost<SalesReportCommitResult>('/inventory/sales-report/commit', input, { timeout: 120_000 }),
    onSuccess: () => invalidateAll(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}
