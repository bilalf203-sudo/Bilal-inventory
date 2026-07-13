'use client';

import { useState, type PropsWithChildren } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient } from '@/lib/query-client';
import { CACHE_VERSION, queryPersister, shouldPersistQuery } from '@/lib/query-persister';
import { getCurrentBrandId } from '@/stores/brand.store';

/** Persisted caches older than this are discarded on load. Keep <= the queries' gcTime. */
const MAX_AGE = 1000 * 60 * 60 * 24; // 24h

export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => createQueryClient());
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister: queryPersister,
        maxAge: MAX_AGE,
        // Scope the restored cache to the active brand + schema version so a brand
        // switch (or a new cache shape) never restores another brand's data.
        buster: `${CACHE_VERSION}:${getCurrentBrandId() ?? 'none'}`,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  );
}
