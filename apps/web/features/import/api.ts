'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportResult, ImportRow } from '@bilal/shared';
import { apiPost } from '@/lib/api-client';

export function useImportWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: ImportRow[]) =>
      // Bulk import over the pooler can take longer than the 30s default.
      apiPost<ImportResult>('/import/warehouse', { rows }, { timeout: 120_000 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}
