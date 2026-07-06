'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { AnalyticsSummary } from '@bilal/shared';
import { apiGet } from '@/lib/api-client';
import { useBrand } from '@/stores';

export function useAnalyticsSummary(collectionId?: string) {
  const { brandId } = useBrand();
  return useQuery({
    queryKey: ['analytics', 'summary', brandId, collectionId ?? null],
    queryFn: () =>
      apiGet<AnalyticsSummary>('/analytics/summary', collectionId ? { collectionId } : undefined),
    enabled: !!brandId,
    // Keep showing the previous summary while a filter change refetches,
    // so the page doesn't collapse to a spinner on every filter switch.
    placeholderData: keepPreviousData,
  });
}
