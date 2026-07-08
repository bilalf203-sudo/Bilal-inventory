'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  Article,
  ArticleStockBreakdown,
  CreateArticleInput,
  UpdateArticleInput,
} from '@bilal/shared';
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '@/lib/api-client';

const KEYS = {
  all: ['articles'] as const,
  byCollection: (id: string) => [...KEYS.all, 'collection', id] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  stock: (id: string) => [...KEYS.all, 'stock', id] as const,
  movements: (id: string) => [...KEYS.all, 'movements', id] as const,
};

/** One ledger entry from GET /inventory/movements/article/:id. */
export interface StockMovementEntry {
  id: string;
  size: string;
  type:
    | 'INITIAL_STOCK'
    | 'ALLOCATE_TO_MARKETPLACE'
    | 'RETURN_TO_WAREHOUSE'
    | 'SALE'
    | 'ADJUSTMENT';
  quantity: number;
  unitPrice: string | number | null;
  notes: string | null;
  createdAt: string;
  marketplace: { id: string; name: string; color: string } | null;
  creator: { id: string; email: string; fullName: string | null } | null;
}

export function useArticlesByCollection(collectionId: string | undefined) {
  return useQuery({
    queryKey: KEYS.byCollection(collectionId ?? ''),
    queryFn: () => apiGet<Article[]>(`/collections/${collectionId}/articles`),
    enabled: !!collectionId,
  });
}

export function useArticle(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn: () => apiGet<Article>(`/articles/${id}`),
    enabled: !!id,
  });
}

export function useArticleStock(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.stock(id ?? ''),
    queryFn: () => apiGet<ArticleStockBreakdown>(`/inventory/stock/article/${id}`),
    enabled: !!id,
  });
}

export function useArticleMovements(id: string | undefined, take = 50) {
  return useQuery({
    queryKey: [...KEYS.movements(id ?? ''), take],
    queryFn: () => apiGet<StockMovementEntry[]>(`/inventory/movements/article/${id}`, { take }),
    enabled: !!id,
  });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateArticleInput) => apiPost<Article>('/articles', input),
    onSuccess: (article) => {
      qc.invalidateQueries({ queryKey: KEYS.byCollection(article.collectionId) });
      // Refresh collection article counts shown on the warehouse cards.
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Article created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateArticleInput }) =>
      apiPatch<Article>(`/articles/${id}`, data),
    onSuccess: (article) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.stock(article.id) });
      toast.success('Article updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<Article>(`/articles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      // Refresh collection article counts shown on the warehouse cards.
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Article deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUploadArticleImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      apiUpload<Article>(`/articles/${id}/image`, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
    onError: (e: Error) => toast.error(e.message),
  });
}
