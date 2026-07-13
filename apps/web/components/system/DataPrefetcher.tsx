'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PERMISSIONS } from '@bilal/shared';
import { useBrand } from '@/stores';
import { hasPermission } from '@/lib/permissions';
import { prefetchCollections } from '@/features/collections/api';
import { prefetchMarketplaces, prefetchMarketplaceArticles } from '@/features/marketplaces/api';
import { prefetchAnalyticsSummary } from '@/features/analytics/api';

/**
 * Warms the caches for every main destination as soon as a brand is active, so
 * first navigation anywhere renders instantly instead of on-demand fetching:
 * collections, marketplaces (and each marketplace's assigned articles — the
 * heavy query behind marketplace pages), and the analytics summary. Everything
 * runs in parallel, respects staleTime (no duplicate fetches when data is
 * already fresh), and failures are silent — pages just fall back to their own
 * fetches. Collection article lists stay on hover-prefetch to avoid a request
 * per collection at startup.
 */
export function DataPrefetcher() {
  const qc = useQueryClient();
  const { brandId, context } = useBrand();

  useEffect(() => {
    if (!brandId || !context) return;

    if (hasPermission(context, PERMISSIONS.COLLECTION_READ)) {
      void prefetchCollections(qc).catch(() => {});
    }
    if (hasPermission(context, PERMISSIONS.INVENTORY_READ)) {
      void prefetchAnalyticsSummary(qc, brandId).catch(() => {});
    }
    if (hasPermission(context, PERMISSIONS.MARKETPLACE_READ)) {
      prefetchMarketplaces(qc)
        .then((list) => list.forEach((m) => void prefetchMarketplaceArticles(qc, m.id)))
        .catch(() => {});
    }
  }, [qc, brandId, context]);

  return null;
}
