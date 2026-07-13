'use client';

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { removeOldestQuery } from '@tanstack/react-query-persist-client';
import type { Query } from '@tanstack/react-query';

/** Bump when persisted cache shapes change so stale caches are dropped on the next load. */
export const CACHE_VERSION = 'v1';

/**
 * Writes the React Query cache to localStorage so a full page reload paints the
 * last-known data instantly (then revalidates) instead of showing a cold spinner.
 * `removeOldestQuery` keeps us under the ~5MB localStorage limit by evicting the
 * oldest entries if a write would overflow. On the server `window` is absent, so
 * the persister is created with no storage and simply no-ops.
 */
export const queryPersister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'bilal:rq-cache',
  retry: removeOldestQuery,
});

/**
 * Persist only successful, non-auth queries — user/session data stays out of
 * localStorage (auth re-fetches on load anyway, and it's cheap).
 */
export function shouldPersistQuery(query: Query): boolean {
  return query.state.status === 'success' && query.queryKey[0] !== 'auth';
}
