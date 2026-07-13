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
import { rollbackQueries } from '@/lib/optimistic';

const KEYS = {
  all: ['articles'] as const,
  /** Prefix matching every `byCollection` list, whatever the collection id. */
  collectionLists: ['articles', 'collection'] as const,
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

/**
 * Warms the article-list cache for a collection (e.g. on link hover/focus) so
 * opening it renders instantly and only revalidates in the background, instead
 * of showing a blocking spinner on a cold cache. Respects `staleTime`, so it
 * no-ops when the data is already cached and fresh.
 */
export function usePrefetchArticlesByCollection() {
  const qc = useQueryClient();
  return (collectionId: string) =>
    qc.prefetchQuery({
      queryKey: KEYS.byCollection(collectionId),
      queryFn: () => apiGet<Article[]>(`/collections/${collectionId}/articles`),
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

/** Applies an edit's fields onto a cached article for the optimistic update. */
function applyArticleEdit(article: Article, data: UpdateArticleInput): Article {
  return {
    ...article,
    name: data.name ?? article.name,
    code: data.code ?? article.code,
    // `''` intentionally clears the description; only `undefined` keeps the old value.
    description: data.description ?? article.description,
    purchasePrice: data.purchasePrice ?? article.purchasePrice,
    // `null` clears the image; `undefined` means the field wasn't sent.
    imageUrl: data.imageUrl === undefined ? article.imageUrl : data.imageUrl,
    sizes: data.sizes
      ? data.sizes.map((s) => ({
          size: s.size,
          sku: s.sku ?? null,
          warehouseQuantity: s.quantity,
          // The server owns sold counts — carry the existing value forward.
          soldQuantity: article.sizes.find((x) => x.size === s.size)?.soldQuantity ?? 0,
        }))
      : article.sizes,
  };
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateArticleInput) => apiPost<Article>('/articles', input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: KEYS.byCollection(input.collectionId) });
      const previous = qc.getQueriesData({ queryKey: KEYS.all });
      const now = new Date().toISOString();
      const optimistic: Article = {
        id: `optimistic-${crypto.randomUUID()}`,
        collectionId: input.collectionId,
        name: input.name,
        code: input.code ?? '…',
        description: input.description ?? null,
        purchasePrice: input.purchasePrice,
        imageUrl: input.imageUrl ?? null,
        sizes: input.sizes.map((s) => ({
          size: s.size,
          sku: s.sku ?? null,
          warehouseQuantity: s.quantity,
          soldQuantity: 0,
        })),
        createdAt: now,
        updatedAt: now,
      };
      qc.setQueryData<Article[]>(KEYS.byCollection(input.collectionId), (old) => [
        optimistic,
        ...(old ?? []),
      ]);
      return { previous };
    },
    onError: (e: Error, _input, ctx) => {
      rollbackQueries(qc, ctx?.previous);
      toast.error(e.message);
    },
    onSuccess: () => toast.success('Article created'),
    onSettled: (_data, _e, input) => {
      qc.invalidateQueries({ queryKey: KEYS.byCollection(input.collectionId) });
      // Refresh collection article counts shown on the warehouse cards.
      qc.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useUpdateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateArticleInput }) =>
      apiPatch<Article>(`/articles/${id}`, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: KEYS.all });
      const previous = qc.getQueriesData({ queryKey: KEYS.all });
      qc.setQueryData<Article>(KEYS.detail(id), (old) =>
        old ? applyArticleEdit(old, data) : old,
      );
      qc.setQueriesData<Article[]>({ queryKey: KEYS.collectionLists }, (old) =>
        old?.map((a) => (a.id === id ? applyArticleEdit(a, data) : a)),
      );
      return { previous };
    },
    onError: (e: Error, _vars, ctx) => {
      rollbackQueries(qc, ctx?.previous);
      toast.error(e.message);
    },
    onSuccess: () => toast.success('Article updated'),
    onSettled: (_data, _e, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: KEYS.stock(id) });
      qc.invalidateQueries({ queryKey: KEYS.collectionLists });
    },
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<Article>(`/articles/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEYS.collectionLists });
      const previous = qc.getQueriesData({ queryKey: KEYS.collectionLists });
      qc.setQueriesData<Article[]>({ queryKey: KEYS.collectionLists }, (old) =>
        old?.filter((a) => a.id !== id),
      );
      return { previous };
    },
    onError: (e: Error, _id, ctx) => {
      rollbackQueries(qc, ctx?.previous);
      toast.error(e.message);
    },
    onSuccess: () => toast.success('Article deleted'),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.collectionLists });
      // Refresh collection article counts shown on the warehouse cards.
      qc.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useUploadArticleImage() {
  const qc = useQueryClient();
  return useMutation({
    // The server returns the stored CDN url, so there's nothing to predict — just
    // refresh the two views that render the image.
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      apiUpload<Article>(`/articles/${id}/image`, file),
    onSuccess: (article) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(article.id) });
      qc.invalidateQueries({ queryKey: KEYS.byCollection(article.collectionId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
