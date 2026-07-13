'use client';

import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
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
