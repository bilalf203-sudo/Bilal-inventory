import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Caches captured in a mutation's `onMutate` before an optimistic write, so
 * `onError` can restore them if the request fails. Produced by
 * `queryClient.getQueriesData(...)`.
 */
export type QuerySnapshot = [QueryKey, unknown][];

/** Restores every cache entry captured in a {@link QuerySnapshot}. Call from `onError`. */
export function rollbackQueries(qc: QueryClient, snapshot: QuerySnapshot | undefined): void {
  snapshot?.forEach(([key, data]) => qc.setQueryData(key, data));
}
