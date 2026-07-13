'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  CreateMarketplaceInput,
  Marketplace,
  UpdateMarketplaceInput,
} from '@bilal/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';

const KEYS = {
  all: ['marketplaces'] as const,
  list: ['marketplaces', 'list'] as const,
  detail: (id: string) => ['marketplaces', 'detail', id] as const,
  articles: (id: string) => ['marketplaces', 'articles', id] as const,
};

export interface MarketplaceArticleWithStock {
  id: string;
  marketplaceId: string;
  articleId: string;
  salePrice: string | number;
  assignedAt: string;
  article: {
    id: string;
    name: string;
    code: string;
    imageUrl: string | null;
    purchasePrice: string | number;
    collectionId: string;
    collection: { id: string; name: string };
    sizes: { size: string; warehouseQuantity: number }[];
  };
  stocks: { id: string; size: string; allocatedQuantity: number; soldQuantity: number }[];
}

export function useMarketplaces(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: [...KEYS.list, includeInactive],
    queryFn: () => apiGet<Marketplace[]>('/marketplaces', { includeInactive }),
    enabled,
  });
}

export function useMarketplace(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn: () => apiGet<Marketplace>(`/marketplaces/${id}`),
    enabled: !!id,
    // Paint the header instantly from the already-loaded sidebar list while
    // the fresh detail loads in the background.
    placeholderData: () =>
      qc
        .getQueriesData<Marketplace[]>({ queryKey: KEYS.list })
        .flatMap(([, data]) => data ?? [])
        .find((m) => m.id === id),
  });
}

export function useMarketplaceArticles(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.articles(id ?? ''),
    queryFn: () => apiGet<MarketplaceArticleWithStock[]>(`/marketplaces/${id}/articles`),
    enabled: !!id,
  });
}

/** Warms the marketplaces list cache; respects staleTime, so it no-ops when fresh. */
export function prefetchMarketplaces(qc: QueryClient) {
  return qc.fetchQuery({
    queryKey: [...KEYS.list, false],
    queryFn: () => apiGet<Marketplace[]>('/marketplaces', { includeInactive: false }),
  });
}

/** Warms one marketplace's assigned-articles cache (the heavy query behind its pages). */
export function prefetchMarketplaceArticles(qc: QueryClient, id: string) {
  return qc.prefetchQuery({
    queryKey: KEYS.articles(id),
    queryFn: () => apiGet<MarketplaceArticleWithStock[]>(`/marketplaces/${id}/articles`),
  });
}

export function useCreateMarketplace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMarketplaceInput) => apiPost<Marketplace>('/marketplaces', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Marketplace created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateMarketplace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMarketplaceInput }) =>
      apiPatch<Marketplace>(`/marketplaces/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Marketplace updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteMarketplace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<Marketplace>(`/marketplaces/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Marketplace deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
