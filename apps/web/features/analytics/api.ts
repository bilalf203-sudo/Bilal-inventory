'use client';

import { useQuery } from '@tanstack/react-query';
import type { AnalyticsSummary } from '@bilal/shared';
import { apiGet } from '@/lib/api-client';
import { useBrand } from '@/stores';

export function useAnalyticsSummary() {
  const { brandId } = useBrand();
  return useQuery({
    queryKey: ['analytics', 'summary', brandId],
    queryFn: () => apiGet<AnalyticsSummary>('/analytics/summary'),
    enabled: !!brandId,
  });
}
