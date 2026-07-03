'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BrandContext as BrandContextPayload } from '@bilal/shared';
import { useAuthStore } from './auth.store';

const STORAGE_KEY = 'bilal:currentBrandId';

interface BrandState {
  brandId: string | null;
  context: BrandContextPayload | null;
  contextLoading: boolean;
}

interface BrandStoreActions {
  setBrandId: (id: string | null) => void;
  setContext: (ctx: BrandContextPayload | null) => void;
  setContextLoading: (loading: boolean) => void;
}

export const useBrandStore = create<BrandState & BrandStoreActions>()(
  persist(
    (set) => ({
      brandId: null,
      context: null,
      contextLoading: false,
      setBrandId: (brandId) => set({ brandId }),
      setContext: (context) => set({ context }),
      setContextLoading: (contextLoading) => set({ contextLoading }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ brandId: s.brandId }),
    },
  ),
);

/**
 * Module-level getter used by the api-client interceptor so each fetch attaches
 * the live X-Brand-Id header without prop-drilling.
 */
export function getCurrentBrandId(): string | null {
  return useBrandStore.getState().brandId;
}

export function useBrand() {
  const brandId = useBrandStore((s) => s.brandId);
  const context = useBrandStore((s) => s.context);
  const contextLoading = useBrandStore((s) => s.contextLoading);
  const user = useAuthStore((s) => s.user);

  const memberships = user?.memberships ?? [];
  const brand = useMemo(() => {
    if (!brandId) return null;
    return memberships.find((m) => m.brandId === brandId)?.brand ?? null;
  }, [brandId, memberships]);

  return { brand, brandId, memberships, context, contextLoading };
}

export function useBrandActions() {
  const queryClient = useQueryClient();

  const setBrandId = (id: string | null) => {
    useBrandStore.getState().setBrandId(id);
    queryClient.invalidateQueries();
  };

  return { setBrandId };
}
