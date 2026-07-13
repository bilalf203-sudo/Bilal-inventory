'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Collection, CreateCollectionInput, UpdateCollectionInput } from '@bilal/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';

const KEYS = {
  all: ['collections'] as const,
  list: (search?: string) => [...KEYS.all, 'list', search ?? null] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
};

export function useCollections(search?: string) {
  return useQuery({
    queryKey: KEYS.list(search),
    queryFn: () => apiGet<Collection[]>('/collections', { search }),
  });
}

/** Warms the collections list cache; respects staleTime, so it no-ops when fresh. */
export function prefetchCollections(qc: QueryClient) {
  return qc.prefetchQuery({
    queryKey: KEYS.list(undefined),
    queryFn: () => apiGet<Collection[]>('/collections', { search: undefined }),
  });
}

export function useCollection(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn: () => apiGet<Collection>(`/collections/${id}`),
    enabled: !!id,
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCollectionInput) => apiPost<Collection>('/collections', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Collection created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCollectionInput }) =>
      apiPatch<Collection>(`/collections/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Collection updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<Collection>(`/collections/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Collection deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useClearCollections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete<{ deletedCollections: number }>('/collections'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['articles'] });
      toast.success(`Cleared ${res.deletedCollections} collections`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
