'use client';

import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Mutations invalidate exactly the queries they change, so cached data
        // can be trusted for a while — navigating re-renders instantly from
        // cache instead of refetching on every mount.
        staleTime: 5 * 60_000,
        // Must stay >= the persister's maxAge, otherwise inactive queries are
        // garbage-collected out of memory before they can be written to storage.
        gcTime: 1000 * 60 * 60 * 24, // 24h
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
